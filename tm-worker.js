"use strict";

/* =========================================================
   CAT Professional TM Worker V7 Fast
   Arabic ↔ English global TM engine
   - Fast exact/compact lookup
   - Rare-token candidate retrieval
   - Two-stage scoring: cheap pre-score then n-gram only for top candidates
   - False-positive guards: language, numbers, negation, weak-common-word matches
========================================================= */

var TM = {
  records: [],
  exact: new Map(),
  compact: new Map(),
  tokenIndex: new Map(),
  cache: new Map(),
  ready: false,
  config: {
    minScore: 60,
    confirmedScore: 95,
    maxCandidates: 220,
    topForNgram: 55,
    maxTokenHitsPerToken: 1400,
    maxTokensPerQuery: 8,
    maxRecordTokensIndexed: 45
  }
};

function asc(s) {
  return String(s || "")
    .replace(/[٠-٩]/g, function (d) { return String("٠١٢٣٤٥٦٧٨٩".indexOf(d)); })
    .replace(/[۰-۹]/g, function (d) { return String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)); });
}

function normalizeText(s) {
  return asc(String(s || ""))
    .normalize("NFKC")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
    .replace(/\u0640/g, "")
    .replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, "")
    .replace(/[\u200B\u200C\u200D\u2060\uFEFF\u034F]/g, "")
    .replace(/\u00A0|\u202F|\u2007|[\u2000-\u200A]/g, " ")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/[ىی]/g, "ي")
    .replace(/ک/g, "ك")
    .replace(/[ہھۀ]/g, "ه")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/[،]/g, ",")
    .replace(/[؛]/g, ";")
    .replace(/[؟]/g, "?")
    .replace(/[“”„«»]/g, '"')
    .replace(/[‘’‚]/g, "'")
    .replace(/[ـ–—−]/g, "-")
    .replace(/[()\[\]{}]/g, " ")
    .replace(/[,:;.!?؟،؛"'`~|\\/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function compactText(s) {
  return normalizeText(s).replace(/[^0-9A-Za-z\u0600-\u06FF]+/g, "");
}

function hasAr(s) { return /[\u0600-\u06FF]/.test(String(s || "")); }
function hasEn(s) { return /[A-Za-z]/.test(String(s || "")); }

function arRatio(s) {
  s = String(s || "");
  if (!s) return 0;
  return (s.match(/[\u0600-\u06FF]/g) || []).length / Math.max(1, s.length);
}
function enRatio(s) {
  s = String(s || "");
  if (!s) return 0;
  return (s.match(/[A-Za-z]/g) || []).length / Math.max(1, s.length);
}

var STOP = Object.create(null);
[
  "في","من","على","الى","إلى","عن","او","أو","و","ف","ثم","ذلك","هذه","هذا","تلك","التي","الذي","ان","أن","كل","اي","أي","بما","كما","قد","لا","ما","لم","لن","له","لها","به","بها","فيه","فيها","عليه","عليها","يكون","تكون","كان","كانت","اذا","إذا","حسب","وفق","وفقا","دون","غير","ذات","عند","بعد","قبل","بين","مع","حيث","خلال","الماده","النظام","اللائحه",
  "the","a","an","and","or","of","in","on","to","for","from","by","with","without","shall","must","may","be","is","are","was","were","as","at","that","this","these","those","it","its","not","no","any","all","each","such","article","law","regulation"
].forEach(function (w) { STOP[normalizeText(w)] = 1; });

function stripToken(w, l) {
  w = normalizeText(w);
  if (l === "ar") w = w.replace(/^(?:و|ف|ب|ك|ل)+/g, "").replace(/^ال/g, "");
  return w;
}

function tokens(s, l) {
  var n = normalizeText(s);
  if (!n) return [];
  var out = [];
  var seen = Object.create(null);
  n.split(/\s+/).forEach(function (w) {
    w = stripToken(w, l || (hasAr(w) ? "ar" : "en"));
    if (!w || w.length < 2 || STOP[w] || seen[w]) return;
    seen[w] = 1;
    out.push(w);
  });
  return out;
}

function getSource(tu) { return tu.source || tu.src || tu.ar || tu.sourceText || tu.s || ""; }
function getTarget(tu) { return tu.target || tu.trg || tu.en || tu.targetText || tu.t || ""; }
function getAr(tu) { return tu.ar || tu.sourceAr || tu.arabic || ""; }
function getEn(tu) { return tu.en || tu.targetEn || tu.english || ""; }

function cleanTargetForSource(sourceText, targetText) {
  sourceText = String(sourceText || "");
  targetText = String(targetText || "");
  if (!targetText.trim()) return "";

  var sourceIsArabic = hasAr(sourceText);
  var t = targetText
    .replace(/([A-Za-z0-9.!?;])([\u0600-\u06FF])/g, "$1\n$2")
    .replace(/([\u0600-\u06FF])([A-Za-z])/g, "$1\n$2")
    .replace(/\s+/g, " ")
    .trim();

  if (sourceIsArabic) {
    var enParts = t.split(/(?:\n+|\r+|(?<=[.!?;])\s+)/g)
      .map(function (x) { return x.trim(); })
      .filter(Boolean)
      .filter(function (x) { return arRatio(x) < 0.12 && hasEn(x); });
    if (enParts.length) t = enParts.join(" ").replace(/\s+/g, " ").trim();
  } else if (hasEn(sourceText)) {
    var arParts = t.split(/(?:\n+|\r+|(?<=[.!?;])\s+)/g)
      .map(function (x) { return x.trim(); })
      .filter(Boolean)
      .filter(function (x) { return enRatio(x) < 0.40 && hasAr(x); });
    if (arParts.length) t = arParts.join(" ").replace(/\s+/g, " ").trim();
  }
  return t;
}

function extractNumbers(s) {
  return normalizeText(s).match(/\d+(?:[./-]\d+)*/g) || [];
}

function sameNumbersSafe(a, b) {
  var x = extractNumbers(a);
  var y = extractNumbers(b);
  if (!x.length && !y.length) return true;
  if (!x.length || !y.length) return false;
  if (x.length !== y.length) return false;
  return x.slice().sort().join("|") === y.slice().sort().join("|");
}

function negationMismatch(a, b) {
  var x = normalizeText(a), y = normalizeText(b);
  var nx = /\b(لا|ليس|ليست|لم|لن|دون|غير|no|not|never|without|unless)\b/.test(x);
  var ny = /\b(لا|ليس|ليست|لم|لن|دون|غير|no|not|never|without|unless)\b/.test(y);
  return nx !== ny;
}

function tokenDice(qTokens, recSet, recCount) {
  if (!qTokens.length || !recCount) return 0;
  var inter = 0;
  for (var i = 0; i < qTokens.length; i++) if (recSet[qTokens[i]]) inter++;
  return (2 * inter) / (qTokens.length + recCount);
}

function charNgramsCompact(compact, n) {
  n = n || 3;
  var out = Object.create(null);
  var count = 0;
  if (!compact) return { set: out, count: 0 };
  if (compact.length <= n) { out[compact] = 1; return { set: out, count: 1 }; }
  for (var i = 0; i <= compact.length - n; i++) {
    var g = compact.slice(i, i + n);
    if (!out[g]) { out[g] = 1; count++; }
  }
  return { set: out, count: count };
}

function ngramDiceFromCompact(qCompact, recCompact) {
  var a = charNgramsCompact(qCompact, 3);
  var b = charNgramsCompact(recCompact, 3);
  if (!a.count || !b.count) return 0;
  var inter = 0;
  var small = a.count <= b.count ? a.set : b.set;
  var big = a.count <= b.count ? b.set : a.set;
  for (var k in small) if (big[k]) inter++;
  return (2 * inter) / (a.count + b.count);
}

function containmentScoreNorm(qNorm, cNorm, qCompact, cCompact) {
  if (!qNorm || !cNorm) return 0;
  if (qNorm === cNorm) return 1;
  if (cNorm.indexOf(qNorm) !== -1) return Math.max(0.78, Math.min(0.96, qNorm.length / Math.max(1, cNorm.length)));
  if (qNorm.indexOf(cNorm) !== -1) return Math.max(0.72, Math.min(0.92, cNorm.length / Math.max(1, qNorm.length)));
  if (qCompact && cCompact && cCompact.indexOf(qCompact) !== -1) return Math.max(0.72, Math.min(0.92, qCompact.length / Math.max(1, cCompact.length)));
  if (qCompact && cCompact && qCompact.indexOf(cCompact) !== -1) return Math.max(0.66, Math.min(0.88, cCompact.length / Math.max(1, qCompact.length)));
  return 0;
}

function lengthRatioNorm(qNorm, cNorm) {
  var x = qNorm.length, y = cNorm.length;
  if (!x || !y) return 0;
  return Math.min(x, y) / Math.max(x, y);
}

function statusFromScore(score, target) {
  if (!target) return "Needs Translation";
  score = +score || 0;
  if (score >= TM.config.confirmedScore) return "Confirmed";
  if (score >= TM.config.minScore) return "Review";
  return "Needs Translation";
}

function addList(map, key, rec) {
  if (!key) return;
  if (!map.has(key)) map.set(key, []);
  map.get(key).push(rec);
}

function makeTokenSet(arr) {
  var o = Object.create(null);
  for (var i = 0; i < arr.length; i++) o[arr[i]] = 1;
  return o;
}

function addRecord(source, target, sourceLang, targetLang, meta) {
  source = String(source || "").trim();
  target = cleanTargetForSource(source, target);
  if (!source || !target) return;
  if (sourceLang === "ar" && !hasAr(source)) return;
  if (sourceLang === "en" && !hasEn(source)) return;

  var tks = tokens(source, sourceLang);
  var rec = {
    id: TM.records.length,
    source: source,
    target: target,
    sourceLang: sourceLang,
    targetLang: targetLang,
    sourceNorm: normalizeText(source),
    sourceCompact: compactText(source),
    sourceTokens: tks,
    sourceTokenSet: makeTokenSet(tks),
    tokenCount: tks.length,
    row: meta && typeof meta.row !== "undefined" ? meta.row : -1,
    mode: meta && meta.mode ? meta.mode : "tm"
  };

  if (!rec.sourceNorm || !rec.sourceCompact || !rec.sourceTokens.length) return;

  TM.records.push(rec);
  addList(TM.exact, rec.sourceNorm, rec);
  addList(TM.compact, rec.sourceCompact, rec);

  rec.sourceTokens.slice(0, TM.config.maxRecordTokensIndexed).forEach(function (tok) {
    if (!TM.tokenIndex.has(tok)) TM.tokenIndex.set(tok, []);
    var arr = TM.tokenIndex.get(tok);
    if (arr.length < TM.config.maxTokenHitsPerToken) arr.push(rec.id);
  });
}

function buildIndex(tus) {
  TM.records = [];
  TM.exact = new Map();
  TM.compact = new Map();
  TM.tokenIndex = new Map();
  TM.cache = new Map();
  TM.ready = false;

  tus = Array.isArray(tus) ? tus : [];
  for (var i = 0; i < tus.length; i++) {
    var tu = tus[i] || {};
    var ar = getAr(tu);
    var en = getEn(tu);

    if (!ar || !en) {
      var src = getSource(tu);
      var trg = getTarget(tu);
      if (hasAr(src) && hasEn(trg)) { ar = src; en = trg; }
      else if (hasEn(src) && hasAr(trg)) { ar = trg; en = src; }
    }
    if (!ar || !en) continue;

    addRecord(ar, en, "ar", "en", { row: tu.row, mode: tu.mode || "tm" });
    addRecord(en, ar, "en", "ar", { row: tu.row, mode: tu.mode || "tm" });
  }
  TM.ready = true;
  return { tus: tus.length, records: TM.records.length, exactSize: TM.exact.size, compactSize: TM.compact.size, tokenSize: TM.tokenIndex.size, version: "v7-fast" };
}

function cheapScore(qNorm, qCompact, qTokens, rec) {
  var contain = containmentScoreNorm(qNorm, rec.sourceNorm, qCompact, rec.sourceCompact);
  var token = tokenDice(qTokens, rec.sourceTokenSet, rec.tokenCount);
  var len = lengthRatioNorm(qNorm, rec.sourceNorm);
  var score = Math.round(contain * 42 + token * 46 + len * 12);
  return { score: score, contain: contain, token: token, len: len };
}

function finalScore(qNorm, qCompact, qTokens, rec, pre) {
  var ng = 0;
  if (pre.score >= 48 || pre.contain >= 0.65 || pre.token >= 0.35) {
    ng = ngramDiceFromCompact(qCompact, rec.sourceCompact);
  }
  var score = Math.round(pre.contain * 40 + pre.token * 34 + ng * 20 + pre.len * 6);
  var type = "fuzzy";

  if (pre.contain >= 0.92) { score = Math.max(score, 95); type = "partial"; }
  else if (pre.contain >= 0.80 && (ng >= 0.32 || pre.token >= 0.35)) { score = Math.max(score, 86); type = "partial"; }
  else if (ng >= 0.60 && pre.token >= 0.24) { score = Math.max(score, 82); type = "fuzzy"; }
  else if (pre.token >= 0.58 && ng >= 0.24) { score = Math.max(score, 74); type = "token"; }
  else if (score >= 60) { type = "token"; }

  return { score: Math.min(100, score), type: type, ng: ng, contain: pre.contain, token: pre.token, len: pre.len };
}

function safeCandidate(query, qLang, rec, s) {
  if (!rec || !rec.target) return false;
  if (qLang && rec.sourceLang !== qLang) return false;
  if ((+s.score || 0) < TM.config.minScore) return false;
  if (!sameNumbersSafe(query, rec.source)) return false;
  if (negationMismatch(query, rec.source)) return false;

  if (s.score < 70 && s.token < 0.44 && s.ng < 0.42 && s.contain < 0.80) return false;
  if (s.score < 80 && s.token < 0.25 && s.ng < 0.38 && s.contain < 0.80) return false;
  if (s.score < 85 && s.len < 0.22 && s.contain < 0.82) return false;
  return true;
}

function exactResult(rec, score, type) {
  return { rec: rec, score: score, type: type };
}

function dominantExact(list, qLang) {
  if (!list || !list.length) return null;
  for (var i = 0; i < list.length; i++) if (!qLang || list[i].sourceLang === qLang) return list[i];
  return null;
}

function collectCandidates(qTokens) {
  var counts = Object.create(null);
  qTokens
    .map(function (tok) {
      var arr = TM.tokenIndex.get(tok) || [];
      return { tok: tok, count: arr.length };
    })
    .filter(function (x) { return x.count; })
    .sort(function (a, b) { return a.count - b.count; })
    .slice(0, TM.config.maxTokensPerQuery)
    .forEach(function (x) {
      var arr = TM.tokenIndex.get(x.tok) || [];
      for (var i = 0; i < arr.length; i++) counts[arr[i]] = (counts[arr[i]] || 0) + 1;
    });

  return Object.keys(counts)
    .map(function (id) { return { id: +id, hits: counts[id] }; })
    .sort(function (a, b) { return b.hits - a.hits; })
    .slice(0, TM.config.maxCandidates)
    .map(function (x) { return TM.records[x.id]; })
    .filter(Boolean);
}

function pickBest(query, qLang, qNorm, qCompact, qTokens, candidates) {
  if (!candidates || !candidates.length) return null;
  var pres = [];

  for (var i = 0; i < candidates.length; i++) {
    var rec = candidates[i];
    if (!rec || rec.sourceLang !== qLang) continue;
    var pre = cheapScore(qNorm, qCompact, qTokens, rec);
    if (pre.score < 42 && pre.contain < 0.65 && pre.token < 0.25) continue;
    pres.push({ rec: rec, pre: pre });
  }

  if (!pres.length) return null;
  pres.sort(function (a, b) { return b.pre.score - a.pre.score; });
  pres = pres.slice(0, TM.config.topForNgram);

  var scored = [];
  for (var j = 0; j < pres.length; j++) {
    var s = finalScore(qNorm, qCompact, qTokens, pres[j].rec, pres[j].pre);
    if (!safeCandidate(query, qLang, pres[j].rec, s)) continue;
    scored.push({ rec: pres[j].rec, score: s.score, type: s.type });
  }
  if (!scored.length) return null;
  scored.sort(function (a, b) { return b.score - a.score; });

  var best = scored[0], second = scored[1];
  if (second && best.score < 92 && Math.abs(best.score - second.score) <= 3) {
    if (compactText(best.rec.target) !== compactText(second.rec.target)) return null;
  }
  return best;
}

function resultFrom(found) {
  if (!found || !found.rec) return { target: "", targetLang: "", score: 0, status: "Needs Translation", mode: "none", source: "" };
  return {
    target: found.rec.target,
    targetLang: found.rec.targetLang,
    score: found.score,
    status: statusFromScore(found.score, found.rec.target),
    mode: "worker-global-" + found.type,
    source: found.rec.source,
    row: found.rec.row
  };
}

function matchOne(sourceText, lang, minScore) {
  if (!TM.ready) return resultFrom(null);
  minScore = Number(minScore || TM.config.minScore || 60);
  TM.config.minScore = minScore;

  sourceText = String(sourceText || "").trim();
  var qNorm = normalizeText(sourceText);
  var qCompact = compactText(sourceText);
  if (!qCompact) return resultFrom(null);

  var qLang = lang || (hasAr(sourceText) ? "ar" : "en");
  var cacheKey = qLang + "|" + minScore + "|" + qCompact;
  if (TM.cache.has(cacheKey)) return TM.cache.get(cacheKey);

  var exRec = dominantExact(TM.exact.get(qNorm), qLang);
  if (exRec) {
    var exRes = resultFrom(exactResult(exRec, 100, "exact"));
    TM.cache.set(cacheKey, exRes);
    return exRes;
  }

  var coRec = dominantExact(TM.compact.get(qCompact), qLang);
  if (coRec) {
    var coRes = resultFrom(exactResult(coRec, 99, "normalized_exact"));
    TM.cache.set(cacheKey, coRes);
    return coRes;
  }

  var qTokens = tokens(sourceText, qLang);
  if (!qTokens.length) {
    var none0 = resultFrom(null);
    TM.cache.set(cacheKey, none0);
    return none0;
  }

  var candidates = collectCandidates(qTokens);
  var fuzzy = pickBest(sourceText, qLang, qNorm, qCompact, qTokens, candidates);
  if (fuzzy && fuzzy.score >= minScore) {
    var fRes = resultFrom(fuzzy);
    TM.cache.set(cacheKey, fRes);
    return fRes;
  }

  var none = resultFrom(null);
  TM.cache.set(cacheKey, none);
  return none;
}

function matchBatch(items, minScore) {
  items = Array.isArray(items) ? items : [];
  var out = new Array(items.length);
  for (var i = 0; i < items.length; i++) {
    var item = items[i] || {};
    out[i] = { id: item.id, result: matchOne(item.sourceText || "", item.lang || "", minScore || 60) };
  }
  return out;
}

self.onmessage = function (e) {
  var msg = e.data || {};
  var id = msg.id || 0;
  var type = msg.type || "";
  var payload = msg.payload || {};
  try {
    if (type === "BUILD_INDEX") {
      self.postMessage({ id: id, ok: true, type: "BUILD_INDEX_DONE", payload: buildIndex(payload.tus || []) });
      return;
    }
    if (type === "MATCH_ONE" || type === "RECOVER_ONE") {
      self.postMessage({ id: id, ok: true, type: "MATCH_ONE_DONE", payload: matchOne(payload.sourceText || "", payload.lang || "", payload.minScore || 60) });
      return;
    }
    if (type === "MATCH_BATCH" || type === "RECOVER_BATCH") {
      self.postMessage({ id: id, ok: true, type: "MATCH_BATCH_DONE", payload: matchBatch(payload.items || [], payload.minScore || 60) });
      return;
    }
    self.postMessage({ id: id, ok: false, error: "Unknown worker message type: " + type });
  } catch (err) {
    self.postMessage({ id: id, ok: false, error: err && err.message ? err.message : String(err) });
  }
};
