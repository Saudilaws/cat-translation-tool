"use strict";
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
maxQueryTokens: 10,
maxRecordTokensIndexed: 55,
maxHitsPerToken: 1800,
maxCandidates: 260,
topForNgram: 28,
minFuzzyTokenCoverage: 0.52
}
};
function asc(s) {
return String(s || "")
.replace(/[٠-٩]/g, function (d) { return String("٠١٢٣٤٥٦٧٨٩".indexOf(d)); })
.replace(/[۰-۹]/g, function (d) { return String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)); });
}
function htmlDecode(s) {
s = String(s || "");
return s
.replace(/&nbsp;/gi, " ")
.replace(/&amp;/gi, "&")
.replace(/&lt;/gi, "<")
.replace(/&gt;/gi, ">")
.replace(/&quot;/gi, '"')
.replace(/&#39;/g, "'");
}
function normalizeText(s) {
return asc(htmlDecode(s))
.normalize("NFKC")
.replace(/<[^>]+>/g, " ")
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
function langOf(s) { return hasAr(s) ? "ar" : "en"; }
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
"في","من","على","الى","إلى","عن","او","أو","و","ف","ثم","ذلك","هذه","هذا","تلك","التي","الذي","ان","أن","كل","اي","أي","بما","كما","قد","لا","ما","لم","لن","له","لها","به","بها","فيه","فيها","عليه","عليها","يكون","تكون","كان","كانت","اذا","إذا","حسب","وفق","وفقا","دون","غير","ذات","عند","بعد","قبل","بين","مع","حيث","خلال","الماده","ماده","النظام","اللائحه","الفقرة","فقره",
"the","a","an","and","or","of","in","on","to","for","from","by","with","without","shall","must","may","be","is","are","was","were","as","at","that","this","these","those","it","its","not","no","any","all","each","such","article","law","regulation","section"
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
var parts = n.split(/\s+/);
for (var i = 0; i < parts.length; i++) {
var w = stripToken(parts[i], l || (hasAr(parts[i]) ? "ar" : "en"));
if (!w || w.length < 2 || STOP[w] || seen[w]) continue;
seen[w] = 1;
out.push(w);
}
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
.filter(function (x) { return arRatio(x) < 0.14 && hasEn(x); });
if (enParts.length) t = enParts.join(" ").replace(/\s+/g, " ").trim();
} else if (hasEn(sourceText)) {
var arParts = t.split(/(?:\n+|\r+|(?<=[.!?;])\s+)/g)
.map(function (x) { return x.trim(); })
.filter(Boolean)
.filter(function (x) { return enRatio(x) < 0.45 && hasAr(x); });
if (arParts.length) t = arParts.join(" ").replace(/\s+/g, " ").trim();
}
return t;
}
function extractNumbers(s) {
return normalizeText(s).match(/\d+(?:[./-]\d+)*/g) || [];
}
function queryNumbersSafe(query, candidate) {
var q = extractNumbers(query);
if (!q.length) return true;
var c = extractNumbers(candidate);
if (!c.length) return false;
var set = Object.create(null);
c.forEach(function (x) { set[x] = 1; });
for (var i = 0; i < q.length; i++) if (!set[q[i]]) return false;
return true;
}
function negationMismatch(a, b) {
var x = normalizeText(a), y = normalizeText(b);
var nx = /\b(لا|ليس|ليست|لم|لن|دون|غير|no|not|never|without|unless)\b/.test(x);
var ny = /\b(لا|ليس|ليست|لم|لن|دون|غير|no|not|never|without|unless)\b/.test(y);
return nx !== ny;
}
function makeSet(arr) {
var o = Object.create(null);
for (var i = 0; i < arr.length; i++) o[arr[i]] = 1;
return o;
}
function tokenHits(qTokens, recSet) {
var h = 0;
for (var i = 0; i < qTokens.length; i++) if (recSet[qTokens[i]]) h++;
return h;
}
function diceFromHits(hits, aLen, bLen) {
if (!aLen || !bLen) return 0;
return (2 * hits) / (aLen + bLen);
}
function charNgramsCompact(compact, n) {
n = n || 3;
var out = Object.create(null), count = 0;
if (!compact) return { set: out, count: 0 };
if (compact.length <= n) { out[compact] = 1; return { set: out, count: 1 }; }
for (var i = 0; i <= compact.length - n; i++) {
var g = compact.slice(i, i + n);
if (!out[g]) { out[g] = 1; count++; }
}
return { set: out, count: count };
}
function ngramDiceCompact(aCompact, bCompact) {
var a = charNgramsCompact(aCompact, 3);
var b = charNgramsCompact(bCompact, 3);
if (!a.count || !b.count) return 0;
var inter = 0;
var small = a.count <= b.count ? a.set : b.set;
var big = a.count <= b.count ? b.set : a.set;
for (var k in small) if (big[k]) inter++;
return (2 * inter) / (a.count + b.count);
}
function lengthRatio(aNorm, bNorm) {
var a = aNorm.length, b = bNorm.length;
if (!a || !b) return 0;
return Math.min(a, b) / Math.max(a, b);
}
function containment(qNorm, rNorm, qCompact, rCompact) {
if (!qNorm || !rNorm) return 0;
if (qNorm === rNorm) return 1;
if (rNorm.indexOf(qNorm) >= 0) return Math.max(0.82, Math.min(0.97, qNorm.length / Math.max(1, rNorm.length)));
if (qNorm.indexOf(rNorm) >= 0) return Math.max(0.72, Math.min(0.93, rNorm.length / Math.max(1, qNorm.length)));
if (qCompact && rCompact && rCompact.indexOf(qCompact) >= 0) return Math.max(0.78, Math.min(0.95, qCompact.length / Math.max(1, rCompact.length)));
if (qCompact && rCompact && qCompact.indexOf(rCompact) >= 0) return Math.max(0.68, Math.min(0.90, rCompact.length / Math.max(1, qCompact.length)));
return 0;
}
function addList(map, key, rec) {
if (!key) return;
if (!map.has(key)) map.set(key, []);
map.get(key).push(rec);
}
function statusFrom(score, target) {
if (!target) return "Needs Translation";
score = +score || 0;
if (score >= TM.config.confirmedScore) return "Confirmed";
if (score >= TM.config.minScore) return "Review";
return "Needs Translation";
}
function addRecord(source, target, sourceLang, targetLang, meta) {
source = String(source || "").trim();
target = cleanTargetForSource(source, target);
if (!source || !target) return;
if (sourceLang === "ar" && !hasAr(source)) return;
if (sourceLang === "en" && !hasEn(source)) return;
var norm = normalizeText(source);
var comp = compactText(source);
if (!norm || !comp) return;
var tks = tokens(source, sourceLang);
var rec = {
id: TM.records.length,
source: source,
target: target,
sourceLang: sourceLang,
targetLang: targetLang,
sourceNorm: norm,
sourceCompact: comp,
sourceTokens: tks,
tokenSet: makeSet(tks),
tokenCount: tks.length,
row: meta && typeof meta.row !== "undefined" ? meta.row : -1,
mode: meta && meta.mode ? meta.mode : "tm"
};
TM.records.push(rec);
addList(TM.exact, norm, rec);
addList(TM.compact, comp, rec);
var useTokens = tks.slice(0, TM.config.maxRecordTokensIndexed);
for (var i = 0; i < useTokens.length; i++) {
var tok = useTokens[i];
if (!TM.tokenIndex.has(tok)) TM.tokenIndex.set(tok, []);
var arr = TM.tokenIndex.get(tok);
if (arr.length < TM.config.maxHitsPerToken) arr.push(rec.id);
}
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
return {
tus: tus.length,
records: TM.records.length,
exactSize: TM.exact.size,
compactSize: TM.compact.size,
tokenSize: TM.tokenIndex.size,
version: "v8-exact-first-safe-fast"
};
}
function chooseExact(list, qLang) {
if (!list || !list.length) return null;
var best = null;
var count = Object.create(null);
var byKey = Object.create(null);
for (var i = 0; i < list.length; i++) {
var r = list[i];
if (qLang && r.sourceLang !== qLang) continue;
var k = compactText(r.target);
count[k] = (count[k] || 0) + 1;
byKey[k] = r;
}
var bestK = "", bestN = 0;
for (var key in count) if (count[key] > bestN) { bestN = count[key]; bestK = key; }
best = byKey[bestK] || null;
return best;
}
function result(rec, score, type) {
if (!rec) return { target: "", targetLang: "", score: 0, status: "Needs Translation", mode: "none", source: "", row: -1 };
return {
target: rec.target,
targetLang: rec.targetLang,
score: score,
status: statusFrom(score, rec.target),
mode: "worker-v8-" + type,
source: rec.source,
row: rec.row
};
}
function collectCandidates(qTokens) {
var counts = Object.create(null);
var tokenInfo = qTokens.map(function (tok) {
var arr = TM.tokenIndex.get(tok) || [];
return { tok: tok, n: arr.length };
}).filter(function (x) { return x.n; }).sort(function (a, b) { return a.n - b.n; }).slice(0, TM.config.maxQueryTokens);
for (var a = 0; a < tokenInfo.length; a++) {
var arr = TM.tokenIndex.get(tokenInfo[a].tok) || [];
for (var i = 0; i < arr.length; i++) counts[arr[i]] = (counts[arr[i]] || 0) + 1;
}
return Object.keys(counts)
.map(function (id) { return { id: +id, hits: counts[id] }; })
.sort(function (a, b) { return b.hits - a.hits; })
.slice(0, TM.config.maxCandidates)
.map(function (x) { return TM.records[x.id]; })
.filter(Boolean);
}
function scoreCandidate(query, qLang, qNorm, qCompact, qTokens, rec, withNgram) {
if (!rec || rec.sourceLang !== qLang) return null;
var hits = tokenHits(qTokens, rec.tokenSet);
var coverage = qTokens.length ? hits / qTokens.length : 0;
var dice = diceFromHits(hits, qTokens.length, rec.tokenCount);
var cont = containment(qNorm, rec.sourceNorm, qCompact, rec.sourceCompact);
var len = lengthRatio(qNorm, rec.sourceNorm);
var ng = 0;
if (withNgram) ng = ngramDiceCompact(qCompact, rec.sourceCompact);
var score = Math.round(coverage * 46 + dice * 18 + cont * 24 + len * 6 + ng * 18);
var type = "fuzzy";
if (cont >= 0.92) { score = Math.max(score, 95); type = "contained"; }
else if (cont >= 0.82 && (coverage >= 0.55 || ng >= 0.45)) { score = Math.max(score, 88); type = "partial"; }
else if (coverage >= 0.75 && (dice >= 0.48 || ng >= 0.42)) { score = Math.max(score, 82); type = "token"; }
else if (coverage >= 0.60 && ng >= 0.40) { score = Math.max(score, 72); type = "fuzzy"; }
return { score: Math.min(100, score), type: type, hits: hits, coverage: coverage, dice: dice, cont: cont, len: len, ng: ng };
}
function safeCandidate(query, qLang, qTokens, rec, s) {
if (!s || !rec || !rec.target) return false;
if (s.score < TM.config.minScore) return false;
if (qLang !== rec.sourceLang) return false;
if (!queryNumbersSafe(query, rec.source)) return false;
if (negationMismatch(query, rec.source)) return false;
if (qTokens.length <= 2) return s.cont >= 0.92 || s.score >= 95;
if (s.cont < 0.82 && s.coverage < TM.config.minFuzzyTokenCoverage) return false;
if (s.score < 70 && (s.coverage < 0.65 || s.ng < 0.35)) return false;
if (s.score < 80 && s.coverage < 0.58 && s.ng < 0.42 && s.cont < 0.82) return false;
if (s.score < 90 && s.len < 0.20 && s.cont < 0.82) return false;
return true;
}
function fuzzyMatch(query, qLang, qNorm, qCompact, qTokens) {
var candidates = collectCandidates(qTokens);
if (!candidates.length) return null;
var prelim = [];
for (var i = 0; i < candidates.length; i++) {
var rec = candidates[i];
if (!rec || rec.sourceLang !== qLang) continue;
var cheap = scoreCandidate(query, qLang, qNorm, qCompact, qTokens, rec, false);
if (!cheap) continue;
if (cheap.score < 44 && cheap.cont < 0.78 && cheap.coverage < 0.45) continue;
prelim.push({ rec: rec, cheap: cheap });
}
if (!prelim.length) return null;
prelim.sort(function (a, b) { return b.cheap.score - a.cheap.score; });
prelim = prelim.slice(0, TM.config.topForNgram);
var scored = [];
for (var j = 0; j < prelim.length; j++) {
var s = scoreCandidate(query, qLang, qNorm, qCompact, qTokens, prelim[j].rec, true);
if (safeCandidate(query, qLang, qTokens, prelim[j].rec, s)) scored.push({ rec: prelim[j].rec, s: s });
}
if (!scored.length) return null;
scored.sort(function (a, b) { return b.s.score - a.s.score; });
var best = scored[0];
var second = scored[1];
if (second && best.s.score < 92 && Math.abs(best.s.score - second.s.score) <= 4) {
if (compactText(best.rec.target) !== compactText(second.rec.target)) return null;
}
return result(best.rec, best.s.score, best.s.type);
}
function matchOne(sourceText, lang, minScore) {
if (!TM.ready) return result(null);
minScore = Number(minScore || TM.config.minScore || 60);
TM.config.minScore = minScore;
sourceText = String(sourceText || "").trim();
var qNorm = normalizeText(sourceText);
var qCompact = compactText(sourceText);
if (!qCompact) return result(null);
var qLang = lang || langOf(sourceText);
var cacheKey = qLang + "|" + minScore + "|" + qCompact;
if (TM.cache.has(cacheKey)) return TM.cache.get(cacheKey);
var rec = chooseExact(TM.exact.get(qNorm), qLang);
if (rec) {
var r1 = result(rec, 100, "exact");
TM.cache.set(cacheKey, r1);
return r1;
}
rec = chooseExact(TM.compact.get(qCompact), qLang);
if (rec) {
var r2 = result(rec, 99, "normalized-exact");
TM.cache.set(cacheKey, r2);
return r2;
}
var qTokens = tokens(sourceText, qLang);
if (!qTokens.length) {
var n0 = result(null);
TM.cache.set(cacheKey, n0);
return n0;
}
var f = fuzzyMatch(sourceText, qLang, qNorm, qCompact, qTokens);
if (f && f.score >= minScore) {
TM.cache.set(cacheKey, f);
return f;
}
var none = result(null);
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
