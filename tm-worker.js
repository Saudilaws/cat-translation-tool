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
  pairs: [],
  tokenIndex: new Map(),
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
function tmTokens(s) {
  return normalizeText(s)
    .split(/\s+/)
    .map(function (x) { return x.trim(); })
    .filter(function (x) { return x.length >= 2; })
    .filter(function (x) {
      return !/^(في|من|على|الى|إلى|عن|او|أو|و|ف|ثم|the|of|and|or|to|in|on|for|a|an|by|shall|may)$/.test(x);
    });
}

function tokenSet(s) {
  return new Set(tmTokens(s));
}

function setJaccard(a, b) {
  if (!a.size || !b.size) return 0;

  var inter = 0;

  a.forEach(function (x) {
    if (b.has(x)) inter++;
  });

  var union = a.size + b.size - inter;
  return union ? inter / union : 0;
}

function charNgrams(s, n) {
  s = compactText(s);
  n = n || 3;

  var out = new Set();

  if (!s) return out;

  if (s.length <= n) {
    out.add(s);
    return out;
  }

  for (var i = 0; i <= s.length - n; i++) {
    out.add(s.slice(i, i + n));
  }

  return out;
}

function ngramSimilarity(a, b) {
  return setJaccard(charNgrams(a, 3), charNgrams(b, 3));
}

function tokenSimilarity(a, b) {
  return setJaccard(tokenSet(a), tokenSet(b));
}

function containmentScore(a, b) {
  var x = normalizeText(a);
  var y = normalizeText(b);

  if (!x || !y) return 0;
  if (x === y) return 1;

  if (y.indexOf(x) !== -1) {
    return Math.max(0.78, Math.min(0.96, x.length / Math.max(1, y.length)));
  }

  if (x.indexOf(y) !== -1) {
    return Math.max(0.72, Math.min(0.92, y.length / Math.max(1, x.length)));
  }

  return 0;
}

function extractNumbers(s) {
  return normalizeText(s).match(/\d+(?:[./-]\d+)*/g) || [];
}

function sameNumbersSafe(a, b) {
  var x = extractNumbers(a);
  var y = extractNumbers(b);

  if (!x.length && !y.length) return true;
  if (x.length !== y.length) return false;

  return x.slice().sort().join("|") === y.slice().sort().join("|");
}

function negationMismatch(a, b) {
  var x = normalizeText(a);
  var y = normalizeText(b);

  var nx = /\b(لا|ليس|ليست|لم|لن|دون|غير|no|not|never|without|unless)\b/.test(x);
  var ny = /\b(لا|ليس|ليست|لم|لن|دون|غير|no|not|never|without|unless)\b/.test(y);

  return nx !== ny;
}

function weightedGlobalScore(query, candidate) {
  var contain = containmentScore(query, candidate);
  var token = tokenSimilarity(query, candidate);
  var ng = ngramSimilarity(query, candidate);

  return Math.round((contain * 0.45 + token * 0.35 + ng * 0.20) * 100);
}

function addPairToGlobalIndex(src, trg, type) {
  if (!src || !trg) return;

  var id = STATE.pairs.length;

  var pair = {
    id: id,
    source: src,
    target: trg,
    sourceNorm: normalizeText(src),
    sourceCompact: compactText(src),
    tokens: tmTokens(src),
    type: type || "pair"
  };

  STATE.pairs.push(pair);

  for (var i = 0; i < pair.tokens.length; i++) {
    var tok = pair.tokens[i];

    if (!STATE.tokenIndex.has(tok)) {
      STATE.tokenIndex.set(tok, []);
    }

    STATE.tokenIndex.get(tok).push(id);
  }
}

function globalTokenCoverageRecover(sourceText) {
  var tokens = tmTokens(sourceText);

  if (!tokens.length) return null;

  var counts = Object.create(null);

  for (var i = 0; i < tokens.length; i++) {
    var list = STATE.tokenIndex.get(tokens[i]);

    if (!list) continue;

    for (var j = 0; j < list.length; j++) {
      var id = list[j];
      counts[id] = (counts[id] || 0) + 1;
    }
  }

  var candidates = Object.keys(counts)
    .map(function (id) {
      return {
        id: Number(id),
        hits: counts[id]
      };
    })
    .sort(function (a, b) {
      return b.hits - a.hits;
    })
    .slice(0, 250);

  var best = null;
  var bestScore = 0;

  for (var k = 0; k < candidates.length; k++) {
    var pair = STATE.pairs[candidates[k].id];

    if (!pair || !pair.target) continue;

    if (!sameNumbersSafe(sourceText, pair.source)) continue;
    if (negationMismatch(sourceText, pair.source)) continue;

    var score = weightedGlobalScore(sourceText, pair.source);

    if (score > bestScore) {
      bestScore = score;
      best = pair;
    }
  }

  if (!best || bestScore < 70) return null;

  var target = cleanTargetForSource(sourceText, best.target, false);

  if (!target) return null;

  return {
    target: target,
    score: bestScore >= 95 ? 95 : bestScore,
    reason: bestScore >= 90 ? "worker-global-token-strong" : "worker-global-token-review"
  };
}
function globalDeepScanRecover(sourceText) {
  if (!sourceText || !STATE.pairs || !STATE.pairs.length) return null;

  var best = null;
  var bestScore = 0;

  for (var i = 0; i < STATE.pairs.length; i++) {
    var pair = STATE.pairs[i];

    if (!pair || !pair.source || !pair.target) continue;

    if (!sameNumbersSafe(sourceText, pair.source)) continue;
    if (negationMismatch(sourceText, pair.source)) continue;

    var contain = containmentScore(sourceText, pair.source);
    var token = tokenSimilarity(sourceText, pair.source);
    var ng = ngramSimilarity(sourceText, pair.source);

    var score = Math.round((contain * 0.50 + token * 0.25 + ng * 0.25) * 100);

    /*
      إذا كان النص داخل مصدر أطول، نرفع الثقة قليلًا
      بشرط وجود تشابه حرفي جيد.
    */
    if (contain >= 0.78 && ng >= 0.35) {
      score = Math.max(score, 82);
    }

    /*
      إذا كان التشابه النصي قويًا حتى دون containment كامل.
    */
    if (ng >= 0.55 && token >= 0.25) {
      score = Math.max(score, 80);
    }

    if (score > bestScore) {
      bestScore = score;
      best = pair;
    }
  }

  if (!best || bestScore < 70) return null;

  var target = cleanTargetForSource(sourceText, best.target, false);

  if (!target) return null;

  return {
    target: target,
    score: bestScore >= 95 ? 95 : bestScore,
    reason: bestScore >= 90 ? "worker-global-deep-strong" : "worker-global-deep-review"
  };
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
addPairToGlobalIndex(src, cleanWholeTarget, "whole");
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
addPairToGlobalIndex(part, partTarget, "part");
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
STATE.pairs = [];
STATE.tokenIndex = new Map();
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
var globalHit = globalTokenCoverageRecover(sourceText);

if (globalHit && globalHit.target) {
  STATE.cache.set(key, globalHit);
  return globalHit;
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
