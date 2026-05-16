"use strict";

/* =========================================================
   CAT TM Worker V1
   Builds TM index in background and searches without freezing UI
========================================================= */

var STATE = {
  exact: new Map(),
  compact: new Map(),
  cache: new Map(),
  ready: false
};

function normalizeText(s) {
  return String(s || "")
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
    .replace(/\u0640/g, "")
    .replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, "")
    .replace(/[\u200B\u200C\u200D\u2060\uFEFF\u034F]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/[ىی]/g, "ي")
    .replace(/ک/g, "ك")
    .replace(/[ہھۀ]/g, "ه")
    .replace(/[٠-٩]/g, function (d) {
      return "٠١٢٣٤٥٦٧٨٩".indexOf(d);
    })
    .replace(/[۰-۹]/g, function (d) {
      return "۰۱۲۳۴۵۶۷۸۹".indexOf(d);
    })
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function compactText(s) {
  return normalizeText(s).replace(/[^\p{L}\p{N}]+/gu, "");
}

function splitSource(s) {
  return normalizeText(s)
    .split(/(?:[.!؟?؛;،]\s+|\n+|\r+)/g)
    .map(function (x) {
      return x.trim();
    })
    .filter(function (x) {
      return x.length >= 10;
    })
    .slice(0, 16);
}

function getSource(tu) {
  return tu.source || tu.src || tu.ar || tu.sourceText || tu.s || "";
}

function getTarget(tu) {
  return tu.target || tu.trg || tu.en || tu.targetText || tu.t || "";
}

function addToIndex(src, trg) {
  if (!src || !trg) return;

  var n = normalizeText(src);
  var c = compactText(src);

  if (n && !STATE.exact.has(n)) STATE.exact.set(n, trg);
  if (c && !STATE.compact.has(c)) STATE.compact.set(c, trg);

  var parts = splitSource(src);

  for (var i = 0; i < parts.length; i++) {
    var pn = normalizeText(parts[i]);
    var pc = compactText(parts[i]);

    if (pn && !STATE.exact.has(pn)) STATE.exact.set(pn, trg);
    if (pc && !STATE.compact.has(pc)) STATE.compact.set(pc, trg);
  }
}

function buildIndex(tus) {
  STATE.exact = new Map();
  STATE.compact = new Map();
  STATE.cache = new Map();
  STATE.ready = false;

  tus = Array.isArray(tus) ? tus : [];

  for (var i = 0; i < tus.length; i++) {
    addToIndex(getSource(tus[i]), getTarget(tus[i]));
  }

  STATE.ready = true;

  return {
    tus: tus.length,
    exactSize: STATE.exact.size,
    compactSize: STATE.compact.size
  };
}

function recoverOne(sourceText) {
  if (!STATE.ready) return null;

  var key = compactText(sourceText);
  if (!key) return null;

  if (STATE.cache.has(key)) {
    return STATE.cache.get(key);
  }

  var exact = STATE.exact.get(normalizeText(sourceText));
  if (exact) {
    var exactResult = {
      target: exact,
      score: 100,
      reason: "worker-exact"
    };
    STATE.cache.set(key, exactResult);
    return exactResult;
  }

  var compact = STATE.compact.get(compactText(sourceText));
  if (compact) {
    var compactResult = {
      target: compact,
      score: 99,
      reason: "worker-compact"
    };
    STATE.cache.set(key, compactResult);
    return compactResult;
  }

  var parts = splitSource(sourceText);
  if (!parts.length) {
    STATE.cache.set(key, null);
    return null;
  }

  var targets = [];
  var hits = 0;

  for (var i = 0; i < parts.length; i++) {
    var hit =
      STATE.exact.get(normalizeText(parts[i])) ||
      STATE.compact.get(compactText(parts[i]));

    if (hit) {
      hits++;
      if (targets.indexOf(hit) === -1) targets.push(hit);
    }
  }

  var coverage = hits / parts.length;

  if (coverage >= 0.60 && targets.length) {
    var result = {
      target: targets.join("\n"),
      score: Math.round(85 + coverage * 10),
      reason: "worker-split-merge"
    };

    STATE.cache.set(key, result);
    return result;
  }

  STATE.cache.set(key, null);
  return null;
}

self.onmessage = function (e) {
  var msg = e.data || {};
  var id = msg.id || 0;
  var type = msg.type || "";
  var payload = msg.payload || {};

  try {
    if (type === "BUILD_INDEX") {
      self.postMessage({
        id: id,
        ok: true,
        type: "BUILD_INDEX_DONE",
        payload: buildIndex(payload.tus || [])
      });
      return;
    }

    if (type === "RECOVER_ONE") {
      self.postMessage({
        id: id,
        ok: true,
        type: "RECOVER_ONE_DONE",
        payload: recoverOne(payload.sourceText || "")
      });
      return;
    }

    if (type === "RECOVER_BATCH") {
      var items = Array.isArray(payload.items) ? payload.items : [];
      var results = [];

      for (var i = 0; i < items.length; i++) {
        results.push({
          id: items[i].id,
          result: recoverOne(items[i].sourceText || "")
        });
      }

      self.postMessage({
        id: id,
        ok: true,
        type: "RECOVER_BATCH_DONE",
        payload: results
      });
      return;
    }

    self.postMessage({
      id: id,
      ok: false,
      error: "Unknown message type: " + type
    });
  } catch (err) {
    self.postMessage({
      id: id,
      ok: false,
      error: err && err.message ? err.message : String(err)
    });
  }
};
