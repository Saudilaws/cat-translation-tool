"use strict";

/* =========================================================
   CAT TM Worker V2
   Builds TM index in background and searches without freezing UI
   - Smart split/merge recovery
   - Cleans Arabic leakage from English targets
   - Prevents unrelated target sentences from different laws
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

function hasArabic(s) {
  return /[\u0600-\u06FF]/.test(String(s || ""));
}

function arabicRatio(s) {
  s = String(s || "");
  if (!s) return 0;

  var ar = (s.match(/[\u0600-\u06FF]/g) || []).length;
  return ar / Math.max(1, s.length);
}

function splitTarget(s) {
  return String(s || "")
    .replace(/([A-Za-z0-9.!?;])([\u0600-\u06FF])/g, "$1\n$2")
    .replace(/([\u0600-\u06FF])([A-Za-z])/g, "$1\n$2")
    .replace(/\s+/g, " ")
    .split(/(?:\n+|\r+|(?<=[.!؟?؛;])\s+)/g)
    .map(function (x) {
      return x.trim();
    })
    .filter(function (x) {
      return x.length >= 6;
    })
    .slice(0, 40);
}

/* =========================================================
   Legal cue filter
   ملاحظة: النص العربي هنا يُقارن بعد normalizeText()
========================================================= */

var LEGAL_CUES = [
  { ar: /في جميع الاحوال|جميع الاحوال/, en: /\bin all cases\b/i },
  { ar: /الحدث|الاحداث/, en: /\bjuvenile\b|\bjuveniles\b/i },
  { ar: /ولي الامر|ولي امر|وليه|الولي/, en: /\bguardian\b|\bguardians\b/i },
  { ar: /الدار|دار الملاحظه|دار الرعايه/, en: /\bhome\b|\bjuvenile home\b/i },
  { ar: /الوزير/, en: /\bminister\b/i },
  { ar: /الوزاره/, en: /\bministry\b/i },
  { ar: /النظام|هذا النظام/, en: /\blaw\b|\bthis law\b|\bregulation\b/i },
  { ar: /الاحكام|النصوص|نصوص/, en: /\bprovisions\b|\btexts\b/i },
  { ar: /تطبق|تطبيق|ينطبق/, en: /\bapply\b|\bapplied\b|\bapplicable\b/i },
  { ar: /المسائل|المساله/, en: /\bmatters\b|\bissues\b|\bcase\b/i },
  { ar: /الشريعه/, en: /\bsharia\b|\bislamic law\b/i },
  { ar: /الكفاله|كفالته|كفالة/, en: /\brecognizance\b|\bguarantee\b|\bsurety\b/i },
  { ar: /الخروج|خروجه|اطلاقه|اخلاء/, en: /\brelease\b|\bdischarge\b|\bleave\b/i },
  { ar: /تسليم|تسلمه|استلام/, en: /\breceive\b|\breceipt\b|\bdeliver\b|\bhand over\b/i },
  { ar: /اساءه|ضرر|الاضرار/, en: /\bharm\b|\bmistreat\b|\babuse\b|\bdamage\b/i },
  { ar: /تحويل|نقل/, en: /\btransfer\b|\btransferred\b/i },
  { ar: /دراسه حالته|حالته/, en: /\bcase\b|\bcondition\b|\bsituation\b/i },
  { ar: /السلع|البضائع/, en: /\bgoods\b|\bcommodities\b/i },
  { ar: /العلامه التجاريه|العلامات التجاريه/, en: /\btrademark\b|\btrademarks\b/i },
  { ar: /اعاده التصدير|تصديرها/, en: /\bre-export\b|\breexport\b|\bexport\b/i },
  { ar: /القنوات التجاريه|التجاريه/, en: /\bcommercial channels\b|\bcommercial\b/i },
  { ar: /بطريق غير مشروع|غير مشروع|المخالفه/, en: /\bunlawfully\b|\billegal\b|\bviolation\b/i }
];

function cueScore(sourceText, targetPart) {
  var score = 0;
  var src = normalizeText(sourceText);
  var trg = String(targetPart || "");

  for (var i = 0; i < LEGAL_CUES.length; i++) {
    if (LEGAL_CUES[i].ar.test(src) && LEGAL_CUES[i].en.test(trg)) {
      score++;
    }
  }

  return score;
}

function cleanTargetForSource(sourceText, targetText, strictPart) {
  sourceText = String(sourceText || "");
  targetText = String(targetText || "");

  if (!targetText.trim()) return "";

  var sourceIsArabic = hasArabic(sourceText);
  var parts = splitTarget(targetText);

  if (!parts.length) {
    parts = [targetText.trim()];
  }

  if (sourceIsArabic) {
    /* Remove Arabic leakage from English target */
    parts = parts.filter(function (p) {
      return arabicRatio(p) < 0.12;
    });
  }

  if (!parts.length) return "";

  if (sourceIsArabic && parts.length > 1) {
    var scored = parts.map(function (p) {
      return {
        text: p,
        score: cueScore(sourceText, p)
      };
    });

    var maxScore = 0;

    for (var i = 0; i < scored.length; i++) {
      if (scored[i].score > maxScore) {
        maxScore = scored[i].score;
      }
    }

    /*
      إذا وجدنا جملة إنجليزية لها إشارات قانونية مطابقة للسورس،
      نحتفظ بالجمل ذات الصلة فقط ونستبعد الجمل الدخيلة مثل Goods may not...
    */
    if (maxScore > 0) {
      parts = scored
        .filter(function (x) {
          return x.score > 0;
        })
        .map(function (x) {
          return x.text;
        });
    } else if (strictPart) {
      /*
        عند فهرسة جزء من السورس فقط، لا نربطه بهدف طويل متعدد الجمل
        إذا لم توجد أي إشارات مشتركة.
      */
      return "";
    }
  }

  if (sourceIsArabic && strictPart && parts.length === 1) {
    var only = parts[0];
    var onlyCue = cueScore(sourceText, only);
    var srcWords = normalizeText(sourceText).split(/\s+/).filter(Boolean).length;
    var trgWords = String(only).split(/\s+/).filter(Boolean).length;

    /*
      حماية إضافية:
      إذا كان الجزء العربي قصيرًا والهدف الإنجليزي طويلًا جدًا ولا توجد إشارات مشتركة،
      فلا نفهرسه حتى لا يلتقط ترجمة من نظام آخر.
    */
    if (onlyCue === 0 && srcWords > 0 && trgWords > Math.max(18, srcWords * 2.8)) {
      return "";
    }
  }

  return parts.join(" ").replace(/\s+/g, " ").trim();
}

function getSource(tu) {
  return tu.source || tu.src || tu.ar || tu.sourceText || tu.s || "";
}

function getTarget(tu) {
  return tu.target || tu.trg || tu.en || tu.targetText || tu.t || "";
}

function addToIndex(src, trg) {
  if (!src || !trg) return;

  var cleanWholeTarget = cleanTargetForSource(src, trg, false);
  if (!cleanWholeTarget) return;

  var n = normalizeText(src);
  var c = compactText(src);

  if (n && !STATE.exact.has(n)) {
    STATE.exact.set(n, cleanWholeTarget);
  }

  if (c && !STATE.compact.has(c)) {
    STATE.compact.set(c, cleanWholeTarget);
  }

  var parts = splitSource(src);

  for (var i = 0; i < parts.length; i++) {
    var part = parts[i];
    var pn = normalizeText(part);
    var pc = compactText(part);

    var partTarget = cleanTargetForSource(part, trg, true);

    if (!partTarget) continue;

    if (pn && !STATE.exact.has(pn)) {
      STATE.exact.set(pn, partTarget);
    }

    if (pc && !STATE.compact.has(pc)) {
      STATE.compact.set(pc, partTarget);
    }
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
  exact = cleanTargetForSource(sourceText, exact, false);

  if (exact) {
    var exactResult = {
      target: exact,
      score: 100,
      reason: "worker-exact-clean"
    };

    STATE.cache.set(key, exactResult);
    return exactResult;
  }

  var compact = STATE.compact.get(compactText(sourceText));
  compact = cleanTargetForSource(sourceText, compact, false);

  if (compact) {
    var compactResult = {
      target: compact,
      score: 99,
      reason: "worker-compact-clean"
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

    hit = cleanTargetForSource(parts[i], hit, true);

    if (hit) {
      hits++;

      if (targets.indexOf(hit) === -1) {
        targets.push(hit);
      }
    }
  }

  var coverage = hits / parts.length;

  if (coverage >= 0.60 && targets.length) {
    var mergedTarget = cleanTargetForSource(sourceText, targets.join(" "), false);

    if (!mergedTarget) {
      mergedTarget = targets.join("\n");
    }

    var result = {
      target: mergedTarget,
      score: Math.round(85 + coverage * 10),
      reason: "worker-split-merge-clean"
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
