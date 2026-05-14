(function () {
"use strict";

/* =========================================================
CAT Translation Memory V49 Mobile Hidden HTML TM Import + Same-Format DOCX Export
- Collapse / show source input area
- Top counters: Average, Segments, Confirmed, Needs Translation, Needs Review
- Word A3 with visual Track Changes
- Arabic font: GE SS Two Light, 15
- English font: Segoe UI, 15
- Match colors
- Local only: no network, no CDN, no external API
- Import Word DOCX locally using browser ZIP reader
- Export target DOCX using the original source DOCX template and formatting
========================================================= */

var APP = {
id: "cat-v45-pro-stable-enhanced-confirmed",
version: "V49 Mobile Hidden HTML TM Import",
hostId: "cat-v45-pro-stable-enhanced-confirmed-host",
built: false,
building: false,
stop: false,
tus: [],
rows: [],
cells: [],
exact: { ar: Object.create(null), en: Object.create(null) },
compact: { ar: Object.create(null), en: Object.create(null) },
tokenIndex: { ar: Object.create(null), en: Object.create(null) },
seen: Object.create(null),
terms: [],
results: [],
sourceDocxArrayBuffer: null,
sourceDocxName: "",
keepDocxParagraphs: false
};

if (window.__CAT_V45_PRO_STABLE_ENHANCED_CONFIRMED__) {
try { window.dispatchEvent(new CustomEvent("CAT_V45_PRO_OPEN")); } catch (e) {}
return;
}
window.__CAT_V45_PRO_STABLE_ENHANCED_CONFIRMED__ = true;

function ready(fn) {
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
else fn();
}

function asc(s) {
return String(s || "")
.replace(/[\u0660-\u0669]/g, function (d) { return String(d.charCodeAt(0) - 1632); })
.replace(/[\u06F0-\u06F9]/g, function (d) { return String(d.charCodeAt(0) - 1776); });
}

function clean(s) {
return asc(String(s || ""))
.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, "")
.replace(/[\u200B\u200C\u200D\u2060\uFEFF\u034F]/g, "")
.replace(/[\u00A0\u202F\u2007-\u200A]/g, " ")
.replace(/[ \t]+/g, " ")
.replace(/\n[ \t]+/g, "\n")
.replace(/[ \t]+\n/g, "\n")
.trim();
}

function flat(s) { return clean(String(s || "").replace(/\s+/g, " ")); }

function norm(s) {
return asc(String(s || ""))
.normalize("NFKC")
.replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
.replace(/\u0640/g, "")
.replace(/[\u0622\u0623\u0625\u0671]/g, "\u0627")
.replace(/[\u0649\u06CC]/g, "\u064A")
.replace(/\u06A9/g, "\u0643")
.replace(/[\u0629\u06C0\u06C1\u06BE]/g, "\u0647")
.replace(/[^\u0600-\u06FFA-Za-z0-9%\/\.\-]+/g, " ")
.replace(/\s+/g, " ")
.trim()
.toLowerCase();
}

function loose(s) {
return norm(s).replace(/[^\u0600-\u06FFA-Za-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function compactText(s) { return loose(s).replace(/\s+/g, ""); }

function esc(s) {
return asc(String(s || "")).replace(/[&<>"']/g, function (c) {
return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
});
}

function hasAr(s) { return /[\u0600-\u06FF]/.test(String(s || "")); }
function hasEn(s) { return /[A-Za-z]/.test(String(s || "")); }
function arCount(s) { var m = String(s || "").match(/[\u0600-\u06FF]/g); return m ? m.length : 0; }
function enCount(s) { var m = String(s || "").match(/[A-Za-z]/g); return m ? m.length : 0; }
function lang(s) { return arCount(s) >= enCount(s) ? "ar" : "en"; }

function matchColor(score) {
score = +score || 0;
if (score >= 95) return "#168A45";
if (score >= 85) return "#2563EB";
if (score >= 75) return "#7C3AED";
if (score >= 65) return "#F59E0B";
return "#DC2626";
}
function matchLabel(score) { return asc(Math.max(0, Math.min(100, Math.round(+score || 0))) + "%"); }

var STOP_AR = Object.create(null);
var STOP_EN = Object.create(null);
"\u0645\u0646 \u0641\u064a \u0639\u0644\u0649 \u0639\u0646 \u0627\u0644\u0649 \u0625\u0644\u0649 \u0627\u0648 \u0623\u0648 \u0648 \u0641 \u062b\u0645 \u0630\u0644\u0643 \u0647\u0630\u0647 \u0647\u0630\u0627 \u062a\u0644\u0643 \u0627\u0644\u062a\u064a \u0627\u0644\u0630\u064a \u0627\u0646 \u0623\u0646 \u064a\u062a\u0645 \u064a\u062c\u0628 \u0643\u0644 \u0627\u064a \u0623\u064a \u0628\u0645\u0627 \u0643\u0645\u0627 \u0642\u062f \u0644\u0627 \u0645\u0627 \u0644\u0645 \u0644\u0646 \u0644\u0647 \u0644\u0647\u0627 \u0628\u0647 \u0628\u0647\u0627 \u0641\u064a\u0647 \u0641\u064a\u0647\u0627 \u0639\u0644\u064a\u0647 \u0639\u0644\u064a\u0647\u0627 \u064a\u0643\u0648\u0646 \u062a\u0643\u0648\u0646 \u0643\u0627\u0646 \u0643\u0627\u0646\u062a \u0627\u0630\u0627 \u0625\u0630\u0627 \u062d\u0633\u0628 \u0648\u0641\u0642 \u0648\u0641\u0642\u0627 \u062f\u0648\u0646 \u063a\u064a\u0631 \u0630\u0627\u062a \u0639\u0646\u062f \u0628\u0639\u062f \u0642\u0628\u0644 \u0628\u064a\u0646 \u0645\u0639 \u062d\u064a\u062b \u062e\u0644\u0627\u0644".split(/\s+/).forEach(function (w) { STOP_AR[loose(w)] = 1; });
"the a an and or of in on to for from by with without shall must may be is are was were as at that this these those it its not no any all each such".split(/\s+/).forEach(function (w) { STOP_EN[w] = 1; });

function stripToken(w, l) {
w = loose(w);
if (l === "ar") w = w.replace(/^(?:\u0648|\u0641|\u0628|\u0643|\u0644)+/g, "").replace(/^\u0627\u0644/g, "");
return w;
}

function toks(s, l) {
var n = loose(s);
if (!n) return [];
var stop = l === "en" ? STOP_EN : STOP_AR;
var seen = Object.create(null);
var out = [];
n.split(/\s+/).forEach(function (w) {
w = stripToken(w, l);
if (!w || w.length < 2 || stop[w] || seen[w]) return;
seen[w] = 1;
out.push(w);
});
return out;
}

function profile(s, l) {
var nl = loose(s);
var cp = compactText(s);
var t = toks(s, l);
var set = Object.create(null);
t.forEach(function (x) { set[x] = 1; });
return { raw: flat(s), nl: nl, compact: cp, t: t, set: set, len: nl.length };
}

function dice(a, b, bset) {
if (!a.length || !b.length) return 0;
var c = 0;
a.forEach(function (x) { if (bset[x]) c++; });
return (2 * c) / (a.length + b.length);
}

function numbersOf(s) {
var m = asc(String(s || "")).match(/\d+(?:[.,]\d+)?/g);
return m ? m.map(function (x) { return x.replace(",", "."); }) : [];
}

function sameNumbers(src, trg) {
var a = numbersOf(src);
var b = numbersOf(trg);
if (!a.length && !b.length) return true;
var set = Object.create(null);
b.forEach(function (x) { set[x] = 1; });
for (var i = 0; i < a.length; i++) if (!set[a[i]]) return false;
return true;
}

function scoreProfiles(q, t) {
if (!q.nl || !t.nl) return 0;
if (q.raw === t.raw) return 100;
if (q.nl === t.nl) return 99;
if (q.compact && q.compact === t.compact) return 98;

var d = dice(q.t, t.t, t.set);
var lenScore = 1 - Math.min(Math.abs(q.len - t.len) / Math.max(q.len, t.len, 1), 1);
var contain = 0;
if (q.nl.length > 8 && t.nl.indexOf(q.nl) >= 0) contain = 0.20;
else if (t.nl.length > 8 && q.nl.indexOf(t.nl) >= 0) contain = 0.15;
else if (q.compact.length > 12 && t.compact.indexOf(q.compact) >= 0) contain = 0.18;
var sc = d * 68 + lenScore * 22 + contain * 100;
return Math.max(0, Math.min(100, Math.round(sc)));
}

function textOf(el) { return flat(el ? el.textContent || "" : ""); }

function addMap(map, key, id) {
if (!key) return;
var a = map[key];
if (!a) a = map[key] = [];
a.push(id);
}

function addToken(l, token, id) {
if (!token) return;
var a = APP.tokenIndex[l][token];
if (!a) a = APP.tokenIndex[l][token] = [];
a.push(id);
}

function resetMemory() {
APP.built = false;
APP.building = false;
APP.stop = false;
APP.tus = [];
APP.rows = [];
APP.cells = [];
APP.results = [];
APP.exact = { ar: Object.create(null), en: Object.create(null) };
APP.compact = { ar: Object.create(null), en: Object.create(null) };
APP.tokenIndex = { ar: Object.create(null), en: Object.create(null) };
APP.seen = Object.create(null);
}

function addTU(arText, enText, rowNo, mode) {
arText = flat(arText);
enText = flat(enText);
if (!arText || !enText) return;
if (!hasAr(arText) || !hasEn(enText)) return;
if (arText.length < 3 || enText.length < 3) return;
if (arText.length > 15000 || enText.length > 15000) return;

var key = loose(arText).slice(0, 500) + "|" + loose(enText).slice(0, 500);
if (APP.seen[key]) return;
APP.seen[key] = 1;

var id = APP.tus.length;
var arP = profile(arText, "ar");
var enP = profile(enText, "en");
var tu = { id: id, ar: arText, en: enText, arP: arP, enP: enP, row: rowNo, mode: mode || "row" };
APP.tus.push(tu);

addMap(APP.exact.ar, arP.nl, id);
addMap(APP.exact.en, enP.nl, id);
addMap(APP.compact.ar, arP.compact, id);
addMap(APP.compact.en, enP.compact, id);
arP.t.slice(0, 20).forEach(function (t) { addToken("ar", t, id); });
enP.t.slice(0, 20).forEach(function (t) { addToken("en", t, id); });
}

function getPageRows() { return Array.prototype.slice.call(document.querySelectorAll("tr")); }

function buildMemory(ui) {
if (APP.building) return;
resetMemory();
APP.building = true;
var rows = getPageRows();
var total = rows.length;
var i = 0;
ui.status("\u062c\u0627\u0631\u064a \u0628\u0646\u0627\u0621 \u0630\u0627\u0643\u0631\u0629 \u0627\u0644\u062a\u0631\u062c\u0645\u0629 \u0645\u0646 \u0635\u0641\u062d\u0629 HTML...");
ui.progress(0, total);

function step() {
if (APP.stop) {
APP.building = false;
ui.status("\u062a\u0645 \u0625\u064a\u0642\u0627\u0641 \u0628\u0646\u0627\u0621 \u0627\u0644\u0630\u0627\u0643\u0631\u0629.");
return;
}

var end = Math.min(i + 80, total);
for (; i < end; i++) {
var r = rows[i];
var cells = Array.prototype.slice.call(r.querySelectorAll("td,th"));
if (!cells.length) continue;
var arTexts = [];
var enTexts = [];

cells.forEach(function (cell, ci) {
var tx = textOf(cell);
if (!tx || tx.length < 2) return;
var ac = arCount(tx);
var ec = enCount(tx);
if (ac >= 2) {
arTexts.push(tx);
APP.cells.push({ text: tx, lang: "ar", row: i, cell: ci, p: profile(tx, "ar") });
}
if (ec >= 2) {
enTexts.push(tx);
APP.cells.push({ text: tx, lang: "en", row: i, cell: ci, p: profile(tx, "en") });
}
});

APP.rows[i] = { ar: arTexts, en: enTexts };
if (arTexts.length && enTexts.length) {
addTU(arTexts.join("\n"), enTexts.join("\n"), i, "combined-row");
var arLimit = Math.min(arTexts.length, 4);
var enLimit = Math.min(enTexts.length, 4);
for (var a = 0; a < arLimit; a++) {
for (var e = 0; e < enLimit; e++) addTU(arTexts[a], enTexts[e], i, "cell-pair");
}
}
}

ui.progress(i, total);
ui.status("\u0628\u0646\u0627\u0621 \u0627\u0644\u0630\u0627\u0643\u0631\u0629: " + asc(i) + " / " + asc(total) + " \u2014 \u0648\u062d\u062f\u0627\u062a TM: " + asc(APP.tus.length));
if (i < total) setTimeout(step, 1);
else {
APP.built = true;
APP.building = false;
ui.progress(total, total);
ui.status("\u0627\u0643\u062a\u0645\u0644 \u0628\u0646\u0627\u0621 \u0627\u0644\u0630\u0627\u0643\u0631\u0629. \u0639\u062f\u062f \u0648\u062d\u062f\u0627\u062a \u0627\u0644\u062a\u0631\u062c\u0645\u0629: " + asc(APP.tus.length));
}
}

step();
}

function candidates(q, l) {
var out = [];
var seen = Object.create(null);
function addIds(arr) {
if (!arr) return;
for (var i = 0; i < arr.length; i++) {
var id = arr[i];
if (!seen[id]) {
seen[id] = 1;
out.push(id);
if (out.length > 3500) return;
}
}
}

addIds(APP.exact[l][q.nl]);
addIds(APP.compact[l][q.compact]);
if (out.length >= 20) return out;

var tokens = q.t.slice(0, 16)
.map(function (t) { var arr = APP.tokenIndex[l][t] || []; return { t: t, c: arr.length }; })
.filter(function (x) { return x.c; })
.sort(function (a, b) { return a.c - b.c; })
.slice(0, 12);
tokens.forEach(function (x) { addIds(APP.tokenIndex[l][x.t]); });

if (!out.length && APP.tus.length <= 2500) {
for (var k = 0; k < APP.tus.length; k++) out.push(k);
}
return out;
}

function rescue(seg, l) {
var q = profile(seg, l);
var best = null;
var bestScore = 0;
for (var i = 0; i < APP.cells.length; i++) {
var c = APP.cells[i];
if (c.lang !== l) continue;
var sc = 0;
if (q.nl && c.p.nl === q.nl) sc = 99;
else if (q.compact && c.p.compact === q.compact) sc = 98;
else if (q.nl.length > 10 && c.p.nl.indexOf(q.nl) >= 0) sc = 88;
else if (q.compact.length > 14 && c.p.compact.indexOf(q.compact) >= 0) sc = 84;
else sc = scoreProfiles(q, c.p);
if (sc > bestScore) { bestScore = sc; best = c; }
}
if (!best || bestScore < 68) return null;
var row = APP.rows[best.row];
if (!row) return null;
var targetLang = l === "ar" ? "en" : "ar";
var targets = row[targetLang] || [];
if (!targets.length) return { score: bestScore, source: best.text, target: "", targetLang: targetLang, status: "Source Found", mode: "source-found" };
return { score: Math.min(95, Math.max(bestScore, 75)), source: best.text, target: targets.join("\n"), targetLang: targetLang, status: "Rescued", mode: "cell-rescue" };
}

function searchOne(seg, l) {
var q = profile(seg, l);
var ids = candidates(q, l);
var best = null;
for (var i = 0; i < ids.length; i++) {
var tu = APP.tus[ids[i]];
if (!tu) continue;
var tp = l === "ar" ? tu.arP : tu.enP;
var sc = scoreProfiles(q, tp);
if (!best || sc > best.score) {
best = {
score: sc,
source: l === "ar" ? tu.ar : tu.en,
target: l === "ar" ? tu.en : tu.ar,
targetLang: l === "ar" ? "en" : "ar",
status: sc >= 95 ? "Confirmed" : "Review",
mode: tu.mode,
row: tu.row
};
}
}
if (best && best.score >= 65) return best;
var r = rescue(seg, l);
if (r) return r;
return { score: 0, source: "", target: "", targetLang: l === "ar" ? "en" : "ar", status: "Needs", mode: "none", row: -1 };
}

function splitSegments(text, forcedLang) {
var raw = String(text || "").replace(/\r/g, "\n");
var lines = raw.split(/\n+/).map(flat).filter(Boolean);
var out = [];
lines.forEach(function (line) {
var l = forcedLang || lang(line);
if (line.length < 280) { out.push({ text: line, lang: l }); return; }
var parts = [];
var st = 0;
for (var i = 0; i < line.length; i++) {
var ch = line[i];
var isEnd = ch === "." || ch === "!" || ch === "\u061f" || ch === "?";
if (!isEnd) continue;
if (ch === "." && /[0-9]/.test(line[i - 1] || "") && /[0-9]/.test(line[i + 1] || "")) continue;
var p = flat(line.slice(st, i + 1));
if (p) parts.push(p);
st = i + 1;
}
var tail = flat(line.slice(st));
if (tail) parts.push(tail);
if (!parts.length) parts = [line];
parts.forEach(function (p) { if (p) out.push({ text: p, lang: forcedLang || lang(p) }); });
});
return out;
}

function qaIssues(src, trg) {
var issues = [];
if (!flat(trg)) issues.push("Target empty");
if (!sameNumbers(src, trg)) issues.push("Number mismatch");
var srcOpen = (src.match(/[\(\[\{]/g) || []).length;
var srcClose = (src.match(/[\)\]\}]/g) || []).length;
var trgOpen = (trg.match(/[\(\[\{]/g) || []).length;
var trgClose = (trg.match(/[\)\]\}]/g) || []).length;
if (srcOpen !== srcClose || trgOpen !== trgClose) issues.push("Bracket issue");

APP.terms.forEach(function (term) {
var arTerm = term.ar || "";
var enTerm = term.en || "";
var status = (term.status || "").toLowerCase();
if (!arTerm || !enTerm) return;
if (status === "required") {
if (hasAr(src) && loose(src).indexOf(loose(arTerm)) >= 0 && loose(trg).indexOf(loose(enTerm)) < 0) issues.push("Missing required term: " + arTerm + " \u2192 " + enTerm);
if (hasEn(src) && loose(src).indexOf(loose(enTerm)) >= 0 && loose(trg).indexOf(loose(arTerm)) < 0) issues.push("Missing required term: " + enTerm + " \u2192 " + arTerm);
}
if (status === "forbidden") {
if (loose(trg).indexOf(loose(enTerm)) >= 0 || loose(trg).indexOf(loose(arTerm)) >= 0) issues.push("Forbidden term used");
}
});

return issues;
}

function parseCSV(text) {
var lines = String(text || "").split(/\r?\n/).map(function (x) { return x.trim(); }).filter(Boolean);
var out = [];
lines.forEach(function (line, idx) {
var parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(function (p) {
return p.replace(/^"|"$/g, "").replace(/""/g, '"').trim();
});
if (idx === 0 && /arabic|english|source|target/i.test(line)) return;
out.push({ ar: parts[0] || "", en: parts[1] || "", status: parts[2] || "preferred", note: parts[3] || "" });
});
return out.filter(function (t) { return t.ar && t.en; });
}

function parseTMX(text) {
var out = [];
var xml;
try { xml = new DOMParser().parseFromString(String(text || ""), "application/xml"); } catch (e) { return out; }
var tus = Array.prototype.slice.call(xml.getElementsByTagName("tu"));
tus.forEach(function (tu) {
var tuvs = Array.prototype.slice.call(tu.getElementsByTagName("tuv"));
var arText = "";
var enText = "";
tuvs.forEach(function (tuv) {
var langAttr = tuv.getAttribute("xml:lang") || tuv.getAttribute("lang") || tuv.getAttribute("LANG") || "";
var seg = tuv.getElementsByTagName("seg")[0];
var tx = seg ? flat(seg.textContent || "") : "";
if (!tx) return;
if (/^ar/i.test(langAttr) || hasAr(tx)) arText = tx;
else if (/^en/i.test(langAttr) || hasEn(tx)) enText = tx;
});
if (arText && enText) out.push({ ar: arText, en: enText });
});
return out;
}

function importTMXText(text) {
var arr = parseTMX(text);
var count = 0;
arr.forEach(function (x) {
var before = APP.tus.length;
addTU(x.ar, x.en, -1, "tmx-import");
if (APP.tus.length > before) count++;
});
APP.built = APP.tus.length > 0;
return count;
}

function exportTMX() {
var body = APP.tus.map(function (tu) {
return ["<tu>", "<tuv xml:lang=\"ar\"><seg>" + esc(tu.ar) + "</seg></tuv>", "<tuv xml:lang=\"en\"><seg>" + esc(tu.en) + "</seg></tuv>", "</tu>"].join("");
}).join("\n");
return [
"<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
"<tmx version=\"1.4\">",
"<header creationtool=\"CAT V45 Professional Stable Enhanced\" segtype=\"sentence\" adminlang=\"en\" srclang=\"ar\" datatype=\"PlainText\"/>",
"<body>", body, "</body>", "</tmx>"
].join("\n");
}

function exportXLIFF(results) {
var units = results.map(function (r, i) {
return [
"<trans-unit id=\"" + (i + 1) + "\">",
"<source>" + esc(r.segment.text) + "</source>",
"<target state=\"" + esc(r.status || "draft") + "\">" + esc(r.target || "") + "</target>",
"<note>match=" + esc(r.score || 0) + "; mode=" + esc(r.mode || "") + "</note>",
"</trans-unit>"
].join("\n");
}).join("\n");
return [
"<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
"<xliff version=\"1.2\">",
"<file source-language=\"ar\" target-language=\"en\" datatype=\"plaintext\" original=\"local-html\">",
"<body>", units, "</body>", "</file>", "</xliff>"
].join("\n");
}

function download(name, text, type) {
var blob = new Blob(["\ufeff", text], { type: type || "text/plain;charset=utf-8" });
var a = document.createElement("a");
a.href = URL.createObjectURL(blob);
a.download = name;
document.body.appendChild(a);
a.click();
setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}


function downloadBytes(name, bytes, type) {
var blob = new Blob([bytes], { type: type || "application/octet-stream" });
var a = document.createElement("a");
a.href = URL.createObjectURL(blob);
a.download = name;
document.body.appendChild(a);
a.click();
setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

function encodeUtf8(s) {
return new TextEncoder().encode(String(s || ""));
}

function makeCrcTable() {
var c;
var table = [];
for (var n = 0; n < 256; n++) {
c = n;
for (var k = 0; k < 8; k++) {
c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
}
table[n] = c >>> 0;
}
return table;
}

var ZIP_CRC_TABLE = null;

function crc32(bytes) {
if (!ZIP_CRC_TABLE) ZIP_CRC_TABLE = makeCrcTable();
var crc = 0 ^ -1;
for (var i = 0; i < bytes.length; i++) {
crc = (crc >>> 8) ^ ZIP_CRC_TABLE[(crc ^ bytes[i]) & 0xFF];
}
return (crc ^ -1) >>> 0;
}

function pushU16(arr, v) {
arr.push(v & 255, (v >>> 8) & 255);
}

function pushU32(arr, v) {
arr.push(v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255);
}

function concatByteParts(parts) {
var total = 0;
parts.forEach(function (p) { total += p.length; });
var out = new Uint8Array(total);
var off = 0;
parts.forEach(function (p) {
out.set(p, off);
off += p.length;
});
return out;
}

function dosStamp() {
var d = new Date();
var year = Math.max(1980, d.getFullYear());
return {
time: (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2),
date: ((year - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()
};
}

function bytesFromNumberArray(arr) {
return new Uint8Array(arr);
}

async function readZipAllEntries(arrayBuffer) {
var bytes = new Uint8Array(arrayBuffer);
var view = new DataView(arrayBuffer);
var min = Math.max(0, bytes.length - 66000);
var eocd = -1;

for (var p = bytes.length - 22; p >= min; p--) {
if (u32(view, p) === 0x06054b50) { eocd = p; break; }
}
if (eocd < 0) throw new Error("Invalid DOCX/ZIP file.");

var entriesCount = u16(view, eocd + 10);
var cdOff = u32(view, eocd + 16);
var out = [];
var off = cdOff;

for (var i = 0; i < entriesCount; i++) {
if (u32(view, off) !== 0x02014b50) break;

var method = u16(view, off + 10);
var compSize = u32(view, off + 20);
var nameLen = u16(view, off + 28);
var extraLen = u16(view, off + 30);
var commentLen = u16(view, off + 32);
var localOff = u32(view, off + 42);
var name = decodeUtf8(bytes.slice(off + 46, off + 46 + nameLen));

if (u32(view, localOff) !== 0x04034b50) throw new Error("Invalid local ZIP header.");

var ln = u16(view, localOff + 26);
var lx = u16(view, localOff + 28);
var dataStart = localOff + 30 + ln + lx;
var comp = bytes.slice(dataStart, dataStart + compSize);
var raw;

if (method === 0) raw = comp;
else if (method === 8) raw = await inflateZipData(comp);
else throw new Error("Unsupported ZIP compression method: " + method);

out.push({ name: name, bytes: raw });

off += 46 + nameLen + extraLen + commentLen;
}

return out;
}

function buildZipStored(entries) {
var localParts = [];
var centralParts = [];
var offset = 0;
var stamp = dosStamp();

entries.forEach(function (entry) {
var nameBytes = encodeUtf8(entry.name);
var data = entry.bytes instanceof Uint8Array ? entry.bytes : encodeUtf8(entry.bytes);
var crc = crc32(data);

var local = [];
pushU32(local, 0x04034b50);
pushU16(local, 20);
pushU16(local, 0x0800);
pushU16(local, 0);
pushU16(local, stamp.time);
pushU16(local, stamp.date);
pushU32(local, crc);
pushU32(local, data.length);
pushU32(local, data.length);
pushU16(local, nameBytes.length);
pushU16(local, 0);

var localHeader = concatByteParts([bytesFromNumberArray(local), nameBytes]);
localParts.push(localHeader);
localParts.push(data);

var central = [];
pushU32(central, 0x02014b50);
pushU16(central, 20);
pushU16(central, 20);
pushU16(central, 0x0800);
pushU16(central, 0);
pushU16(central, stamp.time);
pushU16(central, stamp.date);
pushU32(central, crc);
pushU32(central, data.length);
pushU32(central, data.length);
pushU16(central, nameBytes.length);
pushU16(central, 0);
pushU16(central, 0);
pushU16(central, 0);
pushU16(central, 0);
pushU32(central, 0);
pushU32(central, offset);

centralParts.push(concatByteParts([bytesFromNumberArray(central), nameBytes]));

offset += localHeader.length + data.length;
});

var centralOffset = offset;
var centralBytes = concatByteParts(centralParts);
var centralSize = centralBytes.length;

var end = [];
pushU32(end, 0x06054b50);
pushU16(end, 0);
pushU16(end, 0);
pushU16(end, entries.length);
pushU16(end, entries.length);
pushU32(end, centralSize);
pushU32(end, centralOffset);
pushU16(end, 0);

return concatByteParts(localParts.concat([centralBytes, bytesFromNumberArray(end)]));
}

function docxTextXmlPaths(entries) {
var order = [
"word/document.xml",
"word/footnotes.xml",
"word/endnotes.xml",
"word/comments.xml"
];
entries.forEach(function (e) {
if (/^word\/header\d+\.xml$/i.test(e.name)) order.push(e.name);
if (/^word\/footer\d+\.xml$/i.test(e.name)) order.push(e.name);
});
var available = Object.create(null);
entries.forEach(function (e) { available[e.name] = true; });
var seen = Object.create(null);
return order.filter(function (p) {
if (!available[p] || seen[p]) return false;
seen[p] = true;
return true;
});
}

function parseDocxPackage(arrayBuffer) {
return readZipAllEntries(arrayBuffer).then(function (entries) {
var xmlDocs = Object.create(null);
var paragraphs = [];
var paths = docxTextXmlPaths(entries);

paths.forEach(function (path) {
var entry = entries.find(function (x) { return x.name === path; });
if (!entry) return;

var xmlText = decodeUtf8(entry.bytes);
var xml = new DOMParser().parseFromString(xmlText, "application/xml");

var ps = Array.prototype.slice.call(xml.getElementsByTagNameNS("*", "p"));
ps.forEach(function (p) {
var nodes = Array.prototype.slice.call(p.getElementsByTagNameNS("*", "t"));
if (!nodes.length) return;

var tx = flat(nodes.map(function (n) { return n.textContent || ""; }).join(""));
if (!tx) return;

paragraphs.push({
path: path,
p: p,
nodes: nodes,
text: tx
});
});

xmlDocs[path] = xml;
});

return {
entries: entries,
xmlDocs: xmlDocs,
paragraphs: paragraphs,
text: paragraphs.map(function (p) { return p.text; }).join("\n")
};
});
}

function setParagraphTargetText(paragraph, targetText) {
var nodes = paragraph.nodes || [];
if (!nodes.length) return;

targetText = asc(String(targetText || "")).replace(/\r?\n+/g, " ").trim();

nodes[0].textContent = targetText;
try { nodes[0].setAttribute("xml:space", "preserve"); } catch (e) {}

for (var i = 1; i < nodes.length; i++) {
nodes[i].textContent = "";
}
}

function splitParagraphSegments(text, forcedLang) {
var lines = String(text || "")
.replace(/\r/g, "\n")
.split(/\n+/)
.map(flat)
.filter(Boolean);

return lines.map(function (line, i) {
return { text: line, lang: forcedLang || lang(line), paraIndex: i };
});
}

async function createTargetDocxSameFormat(results) {
if (!APP.sourceDocxArrayBuffer) {
throw new Error("ÙÙ ÙØªÙ Ø§Ø³ØªÙØ±Ø§Ø¯ ÙÙÙ DOCX ÙØµØ¯Ø±. Ø§Ø³ØªÙØ±Ø¯ ÙÙÙ Word Ø£ÙÙÙØ§.");
}

var pkg = await parseDocxPackage(APP.sourceDocxArrayBuffer);
var serializer = new XMLSerializer();

var targets = results.map(function (r) {
return flat(r.target || r.best || "");
});

if (!targets.length) {
throw new Error("ÙØ§ ØªÙØ¬Ø¯ ÙØªØ§Ø¦Ø¬ ÙØ¯Ù ÙÙØªØµØ¯ÙØ±. Ø­ÙÙÙ Ø§ÙÙØµ ÙØ§Ø¹ØªÙØ¯ Ø§ÙØªØ±Ø¬ÙØ§Øª Ø£ÙÙÙØ§.");
}

if (targets.length !== pkg.paragraphs.length) {
throw new Error(
"Ø¹Ø¯Ø¯ ÙÙØ±Ø§Øª Ø§ÙÙØ§ÙØ¨ ÙØ§ ÙØ³Ø§ÙÙ Ø¹Ø¯Ø¯ ÙØªØ§Ø¦Ø¬ Ø§ÙØªØ±Ø¬ÙØ©. " +
"ÙØ£ÙØ¶Ù ÙØªÙØ¬Ø©Ø Ø§Ø³ØªÙØ±Ø¯ DOCX Ø«Ù Ø§Ø¶ØºØ· ØªØ­ÙÙÙ ÙØ¨Ø§Ø´Ø±Ø© Ø¯ÙÙ ØªÙØ³ÙÙ ÙØ¯ÙÙ. " +
"ÙÙØ±Ø§Øª Ø§ÙÙØ§ÙØ¨: " + asc(pkg.paragraphs.length) +
" / ÙØªØ§Ø¦Ø¬ Ø§ÙÙØ¯Ù: " + asc(targets.length)
);
}

pkg.paragraphs.forEach(function (p, i) {
setParagraphTargetText(p, targets[i] || "");
});

var finalEntries = pkg.entries.map(function (entry) {
var xml = pkg.xmlDocs[entry.name];
if (xml) {
return { name: entry.name, bytes: encodeUtf8(serializer.serializeToString(xml)) };
}
return entry;
});

return buildZipStored(finalEntries);
}

function dtok(s) {
return String(s || "").match(/[\u0600-\u06FFA-Za-z0-9]+|[%\u066a\/\.\-]+|[^\s\u0600-\u06FFA-Za-z0-9]+/g) || [];
}

function tokenKey(s, l) { return stripToken(s, l); }

function diffParts(oldText, newText, l) {
var a = dtok(oldText).slice(0, 260);
var b = dtok(newText).slice(0, 260);
var n = a.length;
var m = b.length;
var dp = [];
var i, j;
for (i = 0; i <= n; i++) { dp[i] = []; for (j = 0; j <= m; j++) dp[i][j] = 0; }
for (i = n - 1; i >= 0; i--) {
for (j = m - 1; j >= 0; j--) {
if (tokenKey(a[i], l) && tokenKey(a[i], l) === tokenKey(b[j], l)) dp[i][j] = dp[i + 1][j + 1] + 1;
else dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
}
}
var out = [];
i = 0;
j = 0;
while (i < n && j < m) {
if (tokenKey(a[i], l) && tokenKey(a[i], l) === tokenKey(b[j], l)) { out.push({ t: "same", x: a[i] }); i++; j++; }
else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push({ t: "del", x: a[i] }); i++; }
else { out.push({ t: "ins", x: b[j] }); j++; }
}
while (i < n) { out.push({ t: "del", x: a[i] }); i++; }
while (j < m) { out.push({ t: "ins", x: b[j] }); j++; }
return out;
}

function diffHtml(oldText, newText, l) {
if (!oldText) return "<span class='muted'>\u0644\u0627 \u064a\u0648\u062c\u062f \u0646\u0635 \u0645\u0634\u0627\u0628\u0647 \u0644\u0644\u0645\u0642\u0627\u0631\u0646\u0629.</span>";
return diffParts(oldText, newText, l).map(function (p) {
if (p.t === "del") return "<del>" + esc(p.x) + "</del>";
if (p.t === "ins") return "<ins>" + esc(p.x) + "</ins>";
return "<span>" + esc(p.x) + "</span>";
}).join(" ");
}

function createReport(results) {
var rows = results.map(function (r, i) {
var issues = qaIssues(r.segment.text, r.target || "");
return [
"<tr>",
"<td>" + asc(i + 1) + "</td>",
"<td dir=\"" + (r.segment.lang === "ar" ? "rtl" : "ltr") + "\">" + esc(r.segment.text) + "</td>",
"<td dir=\"" + (r.targetLang === "ar" ? "rtl" : "ltr") + "\">" + esc(r.target || "") + "</td>",
"<td style='color:" + matchColor(r.score) + ";font-weight:800'>" + matchLabel(r.score) + "</td>",
"<td>" + esc(r.status || "") + "</td>",
"<td>" + esc(issues.join(" | ")) + "</td>",
"</tr>"
].join("");
}).join("\n");
return [
"<!doctype html><html><head><meta charset='utf-8'>",
"<title>CAT V45 QA Report</title>",
"<style>body{font-family:Segoe UI,Tahoma,Arial;margin:24px;background:#f8fafc;color:#111827}table{border-collapse:collapse;width:100%;background:#fff}th,td{border:1px solid #dbe2ea;padding:8px;vertical-align:top}th{background:#eaf1ff}</style>",
"</head><body><h2>CAT V45 Professional \u2014 QA Report</h2><table>",
"<tr><th>#</th><th>Source</th><th>Target</th><th>Match</th><th>Status</th><th>QA</th></tr>",
rows,
"</table></body></html>"
].join("");
}

function createWord(results) {
var rows = results.map(function (r, i) {
var needs = r.status === "Needs" || !r.target;
var srcDir = r.segment.lang === "ar" ? "rtl" : "ltr";
var tgtDir = r.targetLang === "ar" ? "rtl" : "ltr";
var srcClass = r.segment.lang === "ar" ? "ar" : "en";
var tgtClass = r.targetLang === "ar" ? "ar" : "en";
var track = diffHtml(r.sourceFound || "", r.segment.text || "", r.segment.lang);
return [
"<tr class='" + (needs ? "needs-row" : "") + "'>",
"<td class='num'>" + asc(i + 1) + "</td>",
"<td class='" + srcClass + "' dir='" + srcDir + "'>" + esc(r.segment.text) + "</td>",
"<td class='" + tgtClass + "' dir='" + tgtDir + "'>" + (r.best ? esc(r.best) : "<span class='needs'>Needs Translation</span>") + "</td>",
"<td class='match' style='color:" + matchColor(r.score) + "'>" + matchLabel(r.score) + "</td>",
"<td class='" + tgtClass + "' dir='" + tgtDir + "'>" + (r.target ? esc(r.target) : "<span class='needs'>Needs Translation</span>") + "</td>",
"<td class='" + srcClass + " track' dir='" + srcDir + "'>" + track + "</td>",
"<td class='status'>" + esc(r.status || "") + "</td>",
"</tr>"
].join("");
}).join("\n");

return [
"<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'>",
"<head><meta charset='utf-8'>",
"<style>",
"@page Section1{size:42cm 29.7cm;mso-page-orientation:landscape;margin:1.2cm}",
"div.Section1{page:Section1}",
"body{font-family:'Segoe UI',Segoe,Arial,sans-serif;font-size:15pt;color:#111827}",
"table{border-collapse:collapse;width:100%;table-layout:fixed}",
"th{background:linear-gradient(180deg,#FFFFFF 0%,#E7F0F9 100%);border:1px solid #9CA3AF;padding:8px;text-align:center;font-family:'Segoe UI',Segoe,Arial;font-size:15pt;font-weight:700}",
"td{border:1px solid #9CA3AF;padding:8px;vertical-align:top;line-height:1.9;font-size:15pt}",
".ar{font-family:'GE SS Two Light','GE SS Light Text',Tahoma,Arial,sans-serif;font-size:15pt;text-align:justify;text-justify:kashida;direction:rtl}",
".en{font-family:'Segoe UI',Segoe,Arial,sans-serif;font-size:15pt;text-align:justify;direction:ltr}",
".num{width:34px;text-align:center;font-family:'Segoe UI',Segoe,Arial;font-size:15pt}",
".match{width:70px;text-align:center;font-family:'Segoe UI',Segoe,Arial;font-size:15pt;font-weight:900;direction:ltr}",
".status{width:90px;text-align:center;font-family:'Segoe UI',Segoe,Arial;font-size:15pt}",
".needs-row td{background:#FFF2CC!important}",
".needs{background:#FFF2CC;color:#7A4F00;font-weight:800;padding:2px 4px}",
".track del{color:#B42318;background:#FFF1F1;text-decoration:line-through}",
".track ins{color:#175CD3;background:#EFF8FF;text-decoration:none;font-weight:800}",
".muted{color:#6B7280}",
"</style></head>",
"<body><div class='Section1'>",
"<h2 style='text-align:center;color:#1D4ED8;font-family:Segoe UI,Arial'>CAT V45 Professional \u2014 Word A3 with Visual Track Changes</h2>",
"<table>",
"<tr><th>#</th><th>Source Segment</th><th>Best Match</th><th>Match</th><th>Target Draft</th><th>Track Changes</th><th>Status</th></tr>",
rows,
"</table></div></body></html>"
].join("");
}

function getSuggestions(src, targetLang) {
var out = [];
var srcLoose = loose(src);
APP.terms.forEach(function (t) {
if (!t.ar || !t.en) return;
if (targetLang === "en" && srcLoose.indexOf(loose(t.ar)) >= 0) out.push(t.en);
if (targetLang === "ar" && srcLoose.indexOf(loose(t.en)) >= 0) out.push(t.ar);
});
return out.slice(0, 8);
}


function u16(view, off) { return view.getUint16(off, true); }
function u32(view, off) { return view.getUint32(off, true); }

function decodeUtf8(bytes) {
return new TextDecoder("utf-8").decode(bytes);
}

async function inflateZipData(bytes) {
if (typeof DecompressionStream === "undefined") {
throw new Error("This Chrome version cannot unzip DOCX locally. Update Chrome, then try again.");
}
try {
var ds = new DecompressionStream("deflate-raw");
var stream = new Blob([bytes]).stream().pipeThrough(ds);
return new Uint8Array(await new Response(stream).arrayBuffer());
} catch (e1) {
try {
var ds2 = new DecompressionStream("deflate");
var stream2 = new Blob([bytes]).stream().pipeThrough(ds2);
return new Uint8Array(await new Response(stream2).arrayBuffer());
} catch (e2) {
throw new Error("Unable to unzip DOCX content in this browser.");
}
}
}

async function readZipEntry(arrayBuffer, wantedNames) {
var bytes = new Uint8Array(arrayBuffer);
var view = new DataView(arrayBuffer);
var min = Math.max(0, bytes.length - 66000);
var eocd = -1;
for (var p = bytes.length - 22; p >= min; p--) {
if (u32(view, p) === 0x06054b50) { eocd = p; break; }
}
if (eocd < 0) throw new Error("Invalid DOCX/ZIP file.");

var entries = u16(view, eocd + 10);
var cdOff = u32(view, eocd + 16);
var wanted = Object.create(null);
wantedNames.forEach(function (n) { wanted[n] = true; });
var found = Object.create(null);
var off = cdOff;

for (var i = 0; i < entries; i++) {
if (u32(view, off) !== 0x02014b50) break;
var method = u16(view, off + 10);
var compSize = u32(view, off + 20);
var nameLen = u16(view, off + 28);
var extraLen = u16(view, off + 30);
var commentLen = u16(view, off + 32);
var localOff = u32(view, off + 42);
var name = decodeUtf8(bytes.slice(off + 46, off + 46 + nameLen));

if (wanted[name]) {
if (u32(view, localOff) !== 0x04034b50) throw new Error("Invalid local ZIP header.");
var ln = u16(view, localOff + 26);
var lx = u16(view, localOff + 28);
var dataStart = localOff + 30 + ln + lx;
var comp = bytes.slice(dataStart, dataStart + compSize);
var raw;
if (method === 0) raw = comp;
else if (method === 8) raw = await inflateZipData(comp);
else throw new Error("Unsupported ZIP compression method: " + method);
found[name] = decodeUtf8(raw);
}

off += 46 + nameLen + extraLen + commentLen;
}
return found;
}

function extractTextFromWordXml(xmlText) {
var xml = new DOMParser().parseFromString(xmlText, "application/xml");
var paras = Array.prototype.slice.call(xml.getElementsByTagNameNS("*", "p"));
var lines = [];

paras.forEach(function (p) {
var parts = [];
var nodes = p.getElementsByTagNameNS("*", "t");
for (var i = 0; i < nodes.length; i++) parts.push(nodes[i].textContent || "");
var line = flat(parts.join(""));
if (line) lines.push(line);
});

if (!lines.length) {
var allT = Array.prototype.slice.call(xml.getElementsByTagNameNS("*", "t"));
allT.forEach(function (t) {
var x = flat(t.textContent || "");
if (x) lines.push(x);
});
}
return lines.join("\n");
}

async function extractDocxText(file) {
var names = [
"word/document.xml",
"word/footnotes.xml",
"word/endnotes.xml",
"word/comments.xml",
"word/header1.xml",
"word/header2.xml",
"word/header3.xml",
"word/footer1.xml",
"word/footer2.xml",
"word/footer3.xml"
];
var zip = await readZipEntry(await file.arrayBuffer(), names);
var sections = [];
names.forEach(function (n) {
if (zip[n]) {
var text = extractTextFromWordXml(zip[n]);
if (text) sections.push(text);
}
});
var out = sections.join("\n");
if (!flat(out)) throw new Error("No readable text found in the DOCX file.");
return out;
}


function uint8ToExactArrayBuffer(u8) {
var copy = new Uint8Array(u8.length);
copy.set(u8);
return copy.buffer;
}

function cellTextFromTc(tc) {
var parts = [];
var ps = Array.prototype.slice.call(tc.getElementsByTagNameNS("*", "p"));
if (ps.length) {
ps.forEach(function (p) {
var ts = Array.prototype.slice.call(p.getElementsByTagNameNS("*", "t"));
var line = flat(ts.map(function (t) { return t.textContent || ""; }).join(""));
if (line) parts.push(line);
});
} else {
var allT = Array.prototype.slice.call(tc.getElementsByTagNameNS("*", "t"));
var tx = flat(allT.map(function (t) { return t.textContent || ""; }).join(""));
if (tx) parts.push(tx);
}
return flat(parts.join("\n"));
}

function bestArabicCell(cells) {
var best = null;
var score = 0;
cells.forEach(function (c, idx) {
var sc = arCount(c.text) * 3 - enCount(c.text);
if (hasAr(c.text) && sc > score) { score = sc; best = { index: idx, text: c.text }; }
});
return best;
}

function bestEnglishCell(cells, excludeIndex) {
var best = null;
var score = 0;
cells.forEach(function (c, idx) {
if (idx === excludeIndex) return;
var sc = enCount(c.text) * 3 - arCount(c.text);
if (hasEn(c.text) && sc > score) { score = sc; best = { index: idx, text: c.text }; }
});
return best;
}

async function extractBilingualPairsFromDocxBytes(bytes, fileName) {
var ab = bytes instanceof Uint8Array ? uint8ToExactArrayBuffer(bytes) : bytes;
var pkg = await parseDocxPackage(ab);
var entry = pkg.entries.find(function (x) { return /^word\/document\.xml$/i.test(x.name); });
if (!entry) return [];

var xml = new DOMParser().parseFromString(decodeUtf8(entry.bytes), "application/xml");
var tables = Array.prototype.slice.call(xml.getElementsByTagNameNS("*", "tbl"));
var pairs = [];

function addPair(arText, enText, mode) {
arText = flat(arText);
enText = flat(enText);
if (!arText || !enText) return;
if (!hasAr(arText) || !hasEn(enText)) return;
if (arText.length < 2 || enText.length < 2) return;
pairs.push({ ar: arText, en: enText, file: fileName || "", mode: mode || "docx-table" });
}

tables.forEach(function (tbl) {
var rows = Array.prototype.slice.call(tbl.getElementsByTagNameNS("*", "tr"));
rows.forEach(function (tr) {
var tcs = Array.prototype.slice.call(tr.getElementsByTagNameNS("*", "tc"));
var cells = tcs.map(function (tc) { return { text: cellTextFromTc(tc) }; }).filter(function (c) { return !!c.text; });
if (cells.length < 2) return;
var arCell = bestArabicCell(cells);
var enCell = bestEnglishCell(cells, arCell ? arCell.index : -1);
if (arCell && enCell) addPair(arCell.text, enCell.text, "docx-table-row");
});
});

return pairs;
}

async function importDocxZipAsTM(file, ui) {
var zipEntries = await readZipAllEntries(await file.arrayBuffer());
var docxEntries = zipEntries.filter(function (e) {
return /\.docx$/i.test(e.name) && !/(^|\/)~\$/i.test(e.name) && e.bytes && e.bytes.length;
});
if (!docxEntries.length) throw new Error("ÙÙ ÙØªÙ Ø§ÙØ¹Ø«ÙØ± Ø¹ÙÙ ÙÙÙØ§Øª DOCX Ø¯Ø§Ø®Ù ÙÙÙ ZIP.");

var totalPairs = 0;
var added = 0;
var failed = 0;
var beforeAll = APP.tus.length;
APP.stop = false;

for (var i = 0; i < docxEntries.length; i++) {
if (APP.stop) break;
var entry = docxEntries[i];
try {
ui.progress(i, docxEntries.length);
ui.status("Ø§Ø³ØªÙØ±Ø§Ø¯ Word ZIP: " + asc(i + 1) + " / " + asc(docxEntries.length) + " â " + entry.name);
var pairs = await extractBilingualPairsFromDocxBytes(entry.bytes, entry.name);
totalPairs += pairs.length;
pairs.forEach(function (p) {
var before = APP.tus.length;
addTU(p.ar, p.en, -1, "zip-word:" + entry.name);
if (APP.tus.length > before) added++;
});
} catch (e) {
failed++;
}
if (i % 5 === 0) await new Promise(function (resolve) { setTimeout(resolve, 1); });
}

APP.built = APP.tus.length > 0;
ui.progress(docxEntries.length, docxEntries.length);
return { files: docxEntries.length, totalPairs: totalPairs, added: added, failed: failed, totalTM: APP.tus.length, before: beforeAll };
}


function ensureCATViewport() {
try {
var metas = document.getElementsByTagName("meta");
for (var i = 0; i < metas.length; i++) {
if ((metas[i].getAttribute("name") || "").toLowerCase() === "viewport") {
metas[i].setAttribute("content", "width=device-width, initial-scale=1, viewport-fit=cover");
return;
}
}
var m = document.createElement("meta");
m.setAttribute("name", "viewport");
m.setAttribute("content", "width=device-width, initial-scale=1, viewport-fit=cover");
(document.head || document.documentElement).appendChild(m);
} catch (e) {}
}

function readLocalFileText(file) {
if (file && typeof file.text === "function") return file.text();
return new Promise(function (resolve, reject) {
try {
var reader = new FileReader();
reader.onload = function () { resolve(String(reader.result || "")); };
reader.onerror = function () { reject(reader.error || new Error("FileReader failed.")); };
reader.readAsText(file, "UTF-8");
} catch (e) { reject(e); }
});
}

function buildHiddenHTMLMemoryFromText(htmlText, fileName, ui) {
if (APP.building) return Promise.resolve({ rows: 0, added: 0, totalTM: APP.tus.length, busy: true });
resetMemory();
APP.building = true;
APP.stop = false;

return new Promise(function (resolve, reject) {
try {
var doc = new DOMParser().parseFromString(String(htmlText || ""), "text/html");
var rows = Array.prototype.slice.call(doc.querySelectorAll("tr"));
var total = rows.length;
var i = 0;
var before = APP.tus.length;

ui.status("Reading hidden HTML TM: " + (fileName || "memory.html"));
ui.progress(0, total || 1);

function finish() {
APP.built = APP.tus.length > 0;
APP.building = false;
ui.progress(total || 1, total || 1);
resolve({ rows: total, added: APP.tus.length - before, totalTM: APP.tus.length });
}

function step() {
if (APP.stop) {
APP.building = false;
ui.status("Hidden HTML TM import stopped.");
resolve({ rows: total, added: APP.tus.length - before, totalTM: APP.tus.length, stopped: true });
return;
}

var end = Math.min(i + 120, total);
for (; i < end; i++) {
var r = rows[i];
var cells = Array.prototype.slice.call(r.querySelectorAll("td,th"));
if (!cells.length) continue;

var arTexts = [];
var enTexts = [];

cells.forEach(function (cell, ci) {
var tx = textOf(cell);
if (!tx || tx.length < 2) return;
var ac = arCount(tx);
var ec = enCount(tx);

if (ac >= 2) {
arTexts.push(tx);
APP.cells.push({ text: tx, lang: "ar", row: i, cell: ci, p: profile(tx, "ar") });
}

if (ec >= 2) {
enTexts.push(tx);
APP.cells.push({ text: tx, lang: "en", row: i, cell: ci, p: profile(tx, "en") });
}
});

APP.rows[i] = { ar: arTexts, en: enTexts };

if (arTexts.length && enTexts.length) {
addTU(arTexts.join("\n"), enTexts.join("\n"), i, "hidden-html-combined-row:" + (fileName || ""));
var arLimit = Math.min(arTexts.length, 4);
var enLimit = Math.min(enTexts.length, 4);
for (var a = 0; a < arLimit; a++) {
for (var e = 0; e < enLimit; e++) {
addTU(arTexts[a], enTexts[e], i, "hidden-html-cell-pair:" + (fileName || ""));
}
}
}
}

ui.progress(i, total || 1);
ui.status("Hidden HTML TM: " + asc(i) + " / " + asc(total) + " â TM: " + asc(APP.tus.length));

if (i < total) setTimeout(step, 1);
else finish();
}

if (!total) {
APP.built = false;
APP.building = false;
reject(new Error("No table rows <tr> found in the HTML file."));
return;
}

step();
} catch (e) {
APP.building = false;
reject(e);
}
});
}


function createHost() {
var old = document.getElementById(APP.hostId);
if (old) return old;
var host = document.createElement("div");
host.id = APP.hostId;
host.style.all = "initial";
document.documentElement.appendChild(host);
return host;
}

function initUI() {
ensureCATViewport();
var host = createHost();
var shadow = host.shadowRoot || host.attachShadow({ mode: "open" });

shadow.innerHTML = [
"<style>",
":host{all:initial}",
"*{box-sizing:border-box}",
".fab{position:fixed;right:18px;bottom:18px;z-index:2147483647;border:0;border-radius:999px;padding:12px 18px;background:#2563eb;color:#fff;font:800 13px 'Segoe UI',Tahoma,Arial;box-shadow:0 10px 30px rgba(0,0,0,.25);cursor:pointer;direction:ltr}",
".panel{position:fixed;inset:12px;z-index:2147483647;background:#f8fafc;border:1px solid #dbe2ea;border-radius:14px;box-shadow:0 20px 70px rgba(15,23,42,.30);display:none;direction:rtl;font-family:'GE SS Two Light','Segoe UI',Tahoma,Arial;color:#111827;overflow:hidden}",
".panel.open{display:flex;flex-direction:column}",
".panel.sourceCollapsed .inputArea{display:none!important;height:0!important;padding:0!important;border:0!important;min-height:0!important;overflow:hidden!important}",
".panel.sourceCollapsed .tablewrap{flex:1 1 auto!important;min-height:0!important}",
".panel.sourceCollapsed .mainbox{min-height:0!important}",
".topTools{display:flex;align-items:center;gap:6px}",
".iconBtn{height:30px;min-width:34px;padding:0 10px;border:1px solid #d9e0ea;border-radius:8px;background:#fff;font:800 12px 'Segoe UI',Tahoma,Arial;cursor:pointer}",
".iconBtn.on{background:#0f766e;color:#fff;border-color:#0f766e}",
".top{height:46px;background:#fff;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;gap:10px;padding:0 14px}",
".title{font-weight:900;font-size:15px;margin-left:auto;direction:ltr;font-family:'Segoe UI',Segoe,Arial}",
".close{border:0;width:30px;height:30px;border-radius:8px;background:#fee2e2;color:#991b1b;cursor:pointer;font-weight:900}",
".dash{display:grid;grid-template-columns:repeat(5,minmax(115px,1fr));gap:10px;padding:10px 12px;background:#f8fafc;border-bottom:1px solid #e5e7eb}",
".statCard{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:9px 10px;text-align:center}",
".statCard .lab{font-size:12px;color:#64748b;font-weight:800}",
".statCard .val{font-size:22px;font-weight:900;direction:ltr;margin-top:3px;font-family:'Segoe UI',Segoe,Arial}",
"#confirmedStat{color:#168A45!important}",
".body{display:grid;grid-template-columns:260px minmax(0,1fr);gap:12px;padding:12px;min-height:0;flex:1}",
".side,.mainbox{background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden}",
".side{padding:12px;display:flex;flex-direction:column;gap:8px;overflow:auto}",
"button,select,input{height:34px;border:1px solid #d9e0ea;border-radius:9px;background:#fff;font:800 12px 'GE SS Two Light','Segoe UI',Tahoma,Arial;cursor:pointer}",
".primary{background:#2563eb;color:#fff;border-color:#2563eb}",
".green{background:#16a34a;color:#fff;border-color:#16a34a}",
".red{background:#dc2626;color:#fff;border-color:#dc2626}",
".gold{background:#f59e0b;color:#fff;border-color:#f59e0b}",
"textarea{width:100%;min-height:120px;resize:vertical;border:1px solid #d9e0ea;border-radius:10px;padding:10px;font:15px/1.8 'GE SS Two Light','Segoe UI',Tahoma,Arial;direction:auto}",
".statusBox{border:1px solid #e5e7eb;background:#f8fafc;border-radius:10px;padding:9px;min-height:56px;font-size:12px;color:#475569;line-height:1.6}",
".bar{height:6px;background:#e5e7eb;border-radius:999px;overflow:hidden}",
".fill{height:100%;width:0%;background:#2563eb}",
".mainbox{display:flex;flex-direction:column;min-height:0}",
".inputArea{padding:10px;border-bottom:1px solid #e5e7eb;background:#fbfdff}",
".tablewrap{overflow:auto;min-height:0;flex:1}",
"table{border-collapse:separate;border-spacing:0;width:100%;table-layout:fixed;direction:ltr;background:#fff}",
"th{position:sticky;top:0;z-index:2;height:34px;background:#eef4ff;border-bottom:1px solid #dbe2ea;border-right:1px solid #e5e7eb;font-size:13px;text-align:center;font-family:'Segoe UI',Segoe,Arial}",
"td{border-bottom:1px solid #eef2f7;border-right:1px solid #eef2f7;padding:9px;vertical-align:top;font-size:15px;line-height:1.8;background:#fff}",
"tr:nth-child(even) td{background:#f8fbff}",
".ar{direction:rtl;text-align:justify;text-justify:kashida;font-family:'GE SS Two Light','GE SS Light Text',Tahoma,Arial,sans-serif;font-size:15px}",
".en{direction:ltr;text-align:justify;font-family:'Segoe UI',Segoe,Arial,sans-serif;font-size:15px}",
".num{width:42px;text-align:center;font-family:'Segoe UI',Segoe,Arial}",
".src{width:24%}",
".best{width:28%}",
".match{width:75px;text-align:center;font-weight:900;direction:ltr;font-family:'Segoe UI',Segoe,Arial}",
".target{width:30%}",
".stat{width:110px;text-align:center}",
".pill{display:inline-block;padding:3px 7px;border-radius:999px;background:#eef2ff;color:#1d4ed8;font-size:11px;font-weight:900}",
".pill.confirmed{background:#EAF8EF;color:#168A45;border:1px solid #B7E4C7}",
".needsRow td{background:#FFF2CC!important}",
".small{color:#64748b;font-size:11px;margin-top:5px;direction:ltr}",
".qa{margin-top:6px;color:#b45309;font-size:11px;line-height:1.4}",
".suggest{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px}",
".sug{height:24px;padding:0 7px;border-radius:999px;background:#ecfdf5;border:1px solid #bbf7d0;color:#166534;font-size:11px}",
".mini{font-size:11px;color:#64748b;line-height:1.5}",
".hiddenFile{display:none}",
".targetDraft.ar{font-family:'GE SS Two Light','GE SS Light Text',Tahoma,Arial;font-size:15px;text-align:justify;text-justify:kashida}",
".targetDraft.en{font-family:'Segoe UI',Segoe,Arial;font-size:15px;text-align:justify}",
"",
"/* ===== Mobile responsive + hidden HTML TM button fix ===== */",
"@media (max-width: 820px), (hover:none) and (pointer:coarse){",
".panel{",
" inset:0!important;",
" width:100dvw!important;",
" height:100dvh!important;",
" max-width:100dvw!important;",
" max-height:100dvh!important;",
" border-radius:0!important;",
" border:0!important;",
"}",
".panel.open{display:flex!important;flex-direction:column!important}",
".top{",
" height:auto!important;",
" min-height:54px!important;",
" padding:8px 10px!important;",
" gap:8px!important;",
" flex-wrap:wrap!important;",
" position:sticky!important;",
" top:0!important;",
" z-index:10!important;",
"}",
".title{",
" font-size:12px!important;",
" line-height:1.35!important;",
" white-space:normal!important;",
" max-width:calc(100% - 145px)!important;",
"}",
".close{width:38px!important;height:38px!important}",
".iconBtn{height:38px!important;min-width:64px!important;font-size:13px!important}",
".dash{",
" display:flex!important;",
" grid-template-columns:none!important;",
" overflow-x:auto!important;",
" gap:8px!important;",
" padding:8px!important;",
" -webkit-overflow-scrolling:touch!important;",
"}",
".statCard{",
" min-width:145px!important;",
" flex:0 0 145px!important;",
" padding:8px!important;",
" border-radius:12px!important;",
"}",
".statCard .lab{font-size:11px!important;line-height:1.35!important}",
".statCard .val{font-size:19px!important}",
".body{",
" display:flex!important;",
" flex-direction:column!important;",
" padding:8px!important;",
" gap:8px!important;",
" min-height:0!important;",
" overflow:auto!important;",
" -webkit-overflow-scrolling:touch!important;",
"}",
".side{",
" width:100%!important;",
" max-height:none!important;",
" display:grid!important;",
" grid-template-columns:1fr 1fr!important;",
" gap:7px!important;",
" padding:8px!important;",
" overflow:visible!important;",
"}",
".side button,.side select,.side input{",
" width:100%!important;",
" min-width:0!important;",
" height:40px!important;",
" font-size:12px!important;",
" padding:0 8px!important;",
" border-radius:999px!important;",
" white-space:nowrap!important;",
" overflow:hidden!important;",
" text-overflow:ellipsis!important;",
"}",
".statusBox,.bar,.mini{grid-column:1 / -1!important}",
".mainbox{",
" width:100%!important;",
" min-height:52vh!important;",
" overflow:hidden!important;",
"}",
".inputArea{padding:8px!important}",
"textarea#source{",
" min-height:96px!important;",
" max-height:28vh!important;",
" font-size:16px!important;",
"}",
".tablewrap{",
" overflow:auto!important;",
" -webkit-overflow-scrolling:touch!important;",
"}",
".tablewrap table,",
".tablewrap thead,",
".tablewrap tbody,",
".tablewrap tr,",
".tablewrap th,",
".tablewrap td{",
" display:block!important;",
" width:100%!important;",
"}",
".tablewrap thead{display:none!important}",
".tablewrap tr{",
" border:1px solid #dbe2ea!important;",
" border-radius:14px!important;",
" margin:10px 0!important;",
" overflow:hidden!important;",
" background:#fff!important;",
"}",
".tablewrap td{",
" border-right:0!important;",
" border-bottom:1px solid #eef2f7!important;",
" padding:10px!important;",
" background:#fff!important;",
"}",
".tablewrap td::before{",
" display:block!important;",
" margin-bottom:5px!important;",
" color:#64748b!important;",
" font:900 11px 'Segoe UI',Tahoma,Arial!important;",
" direction:ltr!important;",
" text-align:left!important;",
"}",
".tablewrap td.num::before{content:\"#\"}",
".tablewrap td.src::before{content:\"Source Segment\"}",
".tablewrap td.best::before{content:\"Best Match\"}",
".tablewrap td.match::before{content:\"Match\"}",
".tablewrap td.target::before{content:\"Target Draft\"}",
".tablewrap td.stat::before{content:\"Status\"}",
".targetDraft{min-height:78px!important;font-size:15px!important}",
".fab{",
" right:12px!important;",
" bottom:12px!important;",
" padding:12px 14px!important;",
"}",
"}",
"@media (max-width:420px){",
".side{grid-template-columns:1fr!important}",
".statCard{min-width:132px!important;flex-basis:132px!important}",
"}",
"","</style>",

"<button class='fab' id='fab'>CAT V45 Pro</button>",
"<section class='panel' id='panel'>",
"<div class='top'><button class='close' id='close'>\xd7</button><div class='topTools'><button class='iconBtn' id='toggleSourceIcon' title='\u0637\u064a/\u0625\u0638\u0647\u0627\u0631 \u0644\u0648\u062d\u0629 \u0627\u0644\u0645\u0635\u062f\u0631'>SRC</button><button class='iconBtn' id='toggleHtmlIcon' title='\u0625\u062e\u0641\u0627\u0621/\u0625\u0638\u0647\u0627\u0631 \u0645\u062d\u062a\u0648\u0649 HTML'>HTML</button></div><div class='title'>CAT Translation Memory V45 Professional Stable Enhanced</div></div>",

"<div class='dash'>",
"<div class='statCard'><div class='lab'>\u0645\u0639\u062f\u0644 \u0627\u0644\u062a\u0637\u0627\u0628\u0642 \u0645\u0646 100</div><div class='val' id='avgStat'>0%</div></div>",
"<div class='statCard'><div class='lab'>Segments</div><div class='val' id='segStat'>0</div></div>",
"<div class='statCard'><div class='lab'>Confirmed</div><div class='val' id='confirmedStat'>0</div></div>",
"<div class='statCard'><div class='lab'>Needs Translation</div><div class='val' id='needsStat'>0</div></div>",
"<div class='statCard'><div class='lab'>Needs Review</div><div class='val' id='reviewStat'>0</div></div>",
"</div>",

"<div class='body'>",
"<aside class='side'>",
"<button class='green' id='build'>\u0628\u0646\u0627\u0621 \u0630\u0627\u0643\u0631\u0629 \u0627\u0644\u062a\u0631\u062c\u0645\u0629</button>",
"<button class='primary' id='importHTMLMemory' title='Hidden HTML Translation Memory'>Import HTML TM</button>",
"<button class='primary' id='analyze'>\u062a\u062d\u0644\u064a\u0644 \u0627\u0644\u0646\u0635</button>",
"<button class='gold' id='acceptAll'>\u0627\u0639\u062a\u0645\u0627\u062f \u0627\u0644\u0623\u0641\u0636\u0644</button>",
"<button id='copy'>\u0646\u0633\u062e Target Draft</button>",
"<button id='concordance'>\u0628\u062d\u062b Concordance</button>",
"<input id='concordQ' placeholder='\u0628\u062d\u062b \u0641\u064a \u0627\u0644\u0630\u0627\u0643\u0631\u0629...' style='padding:0 8px'>",
"<button id='importDOCX'>Import Word DOCX</button>",
"<button id='importDOCXZip'>Ø§Ø³ØªÙØ±Ø§Ø¯ ZIP Word ÙØ°Ø§ÙØ±Ø©</button>",
"<button id='importTerms'>\u0627\u0633\u062a\u064a\u0631\u0627\u062f \u0645\u0635\u0637\u0644\u062d\u0627\u062a CSV</button>",
"<button id='importTMX'>\u0627\u0633\u062a\u064a\u0631\u0627\u062f TMX</button>",
"<button id='exportTMX'>\u062a\u0635\u062f\u064a\u0631 TMX</button>",
"<button id='exportXLIFF'>\u062a\u0635\u062f\u064a\u0631 XLIFF</button>",
"<button id='saveProject'>\u062d\u0641\u0638 \u0645\u0634\u0631\u0648\u0639 JSON</button>",
"<button id='loadProject'>\u0641\u062a\u062d \u0645\u0634\u0631\u0648\u0639 JSON</button>",
"<button id='report'>\u062a\u0642\u0631\u064a\u0631 HTML</button>",
"<button id='word'>Word A3 + Track Changes</button>",
"<button id='wordSameFormat'>ØªØµØ¯ÙØ± DOCX Ø¨ÙÙØ³ ØªÙØ³ÙÙ Ø§ÙÙØµØ¯Ø±</button>",
"<button id='clear'>\u0645\u0633\u062d \u0627\u0644\u0646\u062a\u0627\u0626\u062c</button>",
"<button class='red' id='stop'>\u0625\u064a\u0642\u0627\u0641</button>",
"<select id='slang'><option value='auto'>\u062a\u0644\u0642\u0627\u0626\u064a</option><option value='ar'>\u0639\u0631\u0628\u064a \u2190 \u0625\u0646\u062c\u0644\u064a\u0632\u064a</option><option value='en'>English \u2192 Arabic</option></select>",
"<div class='bar'><div class='fill' id='fill'></div></div>",
"<div class='statusBox' id='status'>\u062c\u0627\u0647\u0632. \u0627\u0636\u063a\u0637 \xab\u0628\u0646\u0627\u0621 \u0630\u0627\u0643\u0631\u0629 \u0627\u0644\u062a\u0631\u062c\u0645\u0629\xbb \u0623\u0648\u0644\u064b\u0627.</div>",
"<div class='mini'>Local only \xb7 No network \xb7 No CDN \xb7 No external API</div>",
"</aside>",

"<main class='mainbox'>",
"<div class='inputArea'><textarea id='source' placeholder='\u0623\u0644\u0635\u0642 \u0647\u0646\u0627 \u0627\u0644\u0646\u0635 \u0627\u0644\u0639\u0631\u0628\u064a \u0623\u0648 \u0627\u0644\u0625\u0646\u062c\u0644\u064a\u0632\u064a \u0627\u0644\u0645\u0631\u0627\u062f \u062a\u062d\u0644\u064a\u0644\u0647...'></textarea></div>",
"<div class='tablewrap'>",
"<table>",
"<thead><tr><th class='num'>#</th><th class='src'>Source Segment</th><th class='best'>Best Match</th><th class='match'>Match</th><th class='target'>Target Draft</th><th class='stat'>Status</th></tr></thead>",
"<tbody id='res'><tr><td colspan='6' style='text-align:center;padding:30px;color:#64748b'>\u0644\u0627 \u062a\u0648\u062c\u062f \u0646\u062a\u0627\u0626\u062c \u0628\u0639\u062f.</td></tr></tbody>",
"</table>",
"</div>",
"</main>",
"</div>",

"<input class='hiddenFile' id='fileDOCX' type='file' accept='.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document'>",
"<input class='hiddenFile' id='fileHTMLMemory' type='file' accept='.html,.htm,text/html'>",
"<input class='hiddenFile' id='fileDOCXZip' type='file' accept='.zip,application/zip,application/x-zip-compressed'>",
"<input class='hiddenFile' id='fileTerms' type='file' accept='.csv,.txt'>",
"<input class='hiddenFile' id='fileTMX' type='file' accept='.tmx,.xml,.txt'>",
"<input class='hiddenFile' id='fileProject' type='file' accept='.json'>",
"</section>"
].join("");

var $ = function (s) { return shadow.querySelector(s); };
var panel = $("#panel");
var status = $("#status");
var fill = $("#fill");
var res = $("#res");
var source = $("#source");

var ui = {
status: function (m) { status.textContent = m; },
progress: function (done, total) {
var p = total ? Math.round(done / total * 100) : 0;
fill.style.width = p + "%";
}
};

function open() { panel.classList.add("open"); }
function close() { panel.classList.remove("open"); }

function setSourceCollapsed(collapsed) {
collapsed = !!collapsed;
panel.classList.toggle("sourceCollapsed", collapsed);
var btn = $("#toggleSourceIcon");
var inputArea = $(".inputArea");
if (inputArea) {
inputArea.style.display = collapsed ? "none" : "block";
inputArea.style.visibility = collapsed ? "hidden" : "visible";
inputArea.style.height = collapsed ? "0" : "auto";
inputArea.style.padding = collapsed ? "0" : "10px";
inputArea.style.overflow = "hidden";
}
if (btn) {
btn.textContent = collapsed ? "SRC+" : "SRC\u2212";
btn.classList.toggle("on", collapsed);
btn.setAttribute("aria-pressed", collapsed ? "true" : "false");
}
ui.status(collapsed ? "\u062a\u0645 \u0625\u062e\u0641\u0627\u0621 \u0644\u0648\u062d\u0629 \u0627\u0644\u0645\u0635\u062f\u0631." : "\u062a\u0645 \u0625\u0638\u0647\u0627\u0631 \u0644\u0648\u062d\u0629 \u0627\u0644\u0645\u0635\u062f\u0631.");
}

function setHtmlHidden(hidden) {
hidden = !!hidden;
var sid = APP.hostId + "-page-hide-style";
var st = document.getElementById(sid);
if (hidden) {
if (!st) {
st = document.createElement("style");
st.id = sid;
st.textContent = "body > *{visibility:hidden!important;} body{background:#fff!important;}";
document.documentElement.appendChild(st);
}
} else if (st) {
st.remove();
}
var btn = $("#toggleHtmlIcon");
if (btn) {
btn.textContent = hidden ? "HTML+" : "HTML\u2212";
btn.classList.toggle("on", hidden);
btn.setAttribute("aria-pressed", hidden ? "true" : "false");
}
ui.status(hidden ? "\u062a\u0645 \u0625\u062e\u0641\u0627\u0621 \u0645\u062d\u062a\u0648\u0649 \u0635\u0641\u062d\u0629 HTML." : "\u062a\u0645 \u0625\u0638\u0647\u0627\u0631 \u0645\u062d\u062a\u0648\u0649 \u0635\u0641\u062d\u0629 HTML.");
}

function updateStats() {
var total = APP.results.length;
var sum = 0;
var needs = 0;
var review = 0;
var confirmed = 0;
APP.results.forEach(function (r) {
var sc = +r.score || 0;
var issues = qaIssues(r.segment.text, r.target || "");
sum += sc;
if (r.status === "Needs" || !flat(r.target || "")) needs++;
else if (r.status === "Confirmed" && sc >= 95 && !issues.length) confirmed++;
else review++;
});
var avg = total ? Math.round(sum / total) : 0;
$("#avgStat").textContent = matchLabel(avg);
$("#avgStat").style.color = matchColor(avg);
$("#segStat").textContent = asc(total);
$("#confirmedStat").textContent = asc(confirmed);
$("#confirmedStat").style.color = "#168A45";
$("#needsStat").textContent = asc(needs);
$("#needsStat").style.color = needs ? "#DC2626" : "#168A45";
$("#reviewStat").textContent = asc(review);
$("#reviewStat").style.color = review ? "#F59E0B" : "#168A45";
}

function updateStoredTargets() {
var boxes = Array.prototype.slice.call(res.querySelectorAll(".targetDraft"));
boxes.forEach(function (b) {
var i = +b.getAttribute("data-i");
if (APP.results[i]) {
APP.results[i].target = b.value || "";
if (!APP.results[i].target) APP.results[i].status = "Needs";
else if ((+APP.results[i].score || 0) >= 95 && !qaIssues(APP.results[i].segment.text, APP.results[i].target).length) APP.results[i].status = "Confirmed";
else APP.results[i].status = "Review";
}
});
updateStats();
}

function renderResults(results) {
res.innerHTML = "";
if (!results.length) {
res.innerHTML = "<tr><td colspan='6' style='text-align:center;padding:30px;color:#64748b'>\u0644\u0627 \u062a\u0648\u062c\u062f \u0646\u062a\u0627\u0626\u062c.</td></tr>";
updateStats();
return;
}

var frag = document.createDocumentFragment();
results.forEach(function (r, i) {
var tr = document.createElement("tr");
var isNeeds = r.status === "Needs" || !r.target;
if (isNeeds) tr.className = "needsRow";
var srcClass = r.segment.lang === "ar" ? "ar" : "en";
var tgtClass = r.targetLang === "ar" ? "ar" : "en";
var qa = qaIssues(r.segment.text, r.target || "");
var suggestions = getSuggestions(r.segment.text, r.targetLang);
var mColor = matchColor(r.score);
var pillClass = r.status === "Confirmed" ? "pill confirmed" : "pill";

tr.innerHTML =
"<td class='num'>" + esc(i + 1) + "</td>" +
"<td class='src " + srcClass + "'>" + esc(r.segment.text) + "</td>" +
"<td class='best " + tgtClass + "'>" +
(r.best ? esc(r.best) : "<b>Needs Translation</b>") +
"<div class='small'>" + esc(r.mode || "") + "</div>" +
"</td>" +
"<td class='match' style='color:" + mColor + "'>" + matchLabel(r.score) + "</td>" +
"<td class='target " + tgtClass + "'>" +
"<textarea class='targetDraft " + tgtClass + "' data-i='" + i + "'>" + esc(r.target || "") + "</textarea>" +
"<div class='suggest'>" + suggestions.map(function (sug) { return "<button class='sug' data-v='" + esc(sug) + "'>" + esc(sug) + "</button>"; }).join("") + "</div>" +
(qa.length ? "<div class='qa'>QA: " + esc(qa.join(" | ")) + "</div>" : "") +
"</td>" +
"<td class='stat'><span class='" + pillClass + "'>" + esc(r.status || "") + "</span></td>";
frag.appendChild(tr);
});
res.appendChild(frag);

Array.prototype.slice.call(res.querySelectorAll(".sug")).forEach(function (btn) {
btn.onclick = function () {
var area = btn.closest("td").querySelector("textarea");
var v = btn.getAttribute("data-v") || "";
if (!area) return;
area.value = flat((area.value || "") + " " + v);
area.dispatchEvent(new Event("input"));
};
});
Array.prototype.slice.call(res.querySelectorAll(".targetDraft")).forEach(function (area) {
area.oninput = function () { updateStoredTargets(); };
});
updateStats();
}

function analyze() {
if (!APP.built || !APP.tus.length) { ui.status("\u0627\u0628\u0646\u0650 \u0627\u0644\u0630\u0627\u0643\u0631\u0629 \u0623\u0648\u0644\u064b\u0627 \u0628\u0627\u0644\u0636\u063a\u0637 \u0639\u0644\u0649 \xab\u0628\u0646\u0627\u0621 \u0630\u0627\u0643\u0631\u0629 \u0627\u0644\u062a\u0631\u062c\u0645\u0629\xbb."); return; }
APP.stop = false;
var v = source.value.trim();
if (!v) { ui.status("\u0623\u0644\u0635\u0642 \u0627\u0644\u0646\u0635 \u0623\u0648\u0644\u064b\u0627."); return; }
var forced = $("#slang").value;
var L = forced === "auto" ? null : forced;
var segs = APP.keepDocxParagraphs ? splitParagraphSegments(v, L) : splitSegments(v, L);
if (!segs.length) { ui.status("\u0644\u0645 \u0623\u062c\u062f Segments \u0642\u0627\u0628\u0644\u0629 \u0644\u0644\u062a\u062d\u0644\u064a\u0644."); return; }
APP.results = [];
res.innerHTML = "";
ui.status("\u062c\u0627\u0631\u064a \u0627\u0644\u062a\u062d\u0644\u064a\u0644...");
ui.progress(0, segs.length);
updateStats();
var i = 0;

function step() {
if (APP.stop) { ui.status("\u062a\u0645 \u0625\u064a\u0642\u0627\u0641 \u0627\u0644\u062a\u062d\u0644\u064a\u0644."); return; }
var end = Math.min(i + 15, segs.length);
for (; i < end; i++) {
var seg = segs[i];
var m = searchOne(seg.text, seg.lang);
APP.results.push({
segment: seg,
best: m.target || "",
target: m.target || "",
targetLang: m.targetLang,
score: m.score || 0,
status: m.status || "Review",
mode: m.mode || "",
sourceFound: m.source || ""
});
}
ui.progress(i, segs.length);
ui.status("\u062a\u0645 \u062a\u062d\u0644\u064a\u0644 " + asc(i) + " \u0645\u0646 " + asc(segs.length));
renderResults(APP.results);
if (i < segs.length) setTimeout(step, 1);
else { ui.status("\u0627\u0643\u062a\u0645\u0644 \u0627\u0644\u062a\u062d\u0644\u064a\u0644. \u0639\u062f\u062f \u0627\u0644\u0646\u062a\u0627\u0626\u062c: " + asc(APP.results.length)); updateStats(); }
}
step();
}

$("#fab").onclick = open;
$("#close").onclick = close;
window.addEventListener("CAT_V45_PRO_OPEN", open);

$("#toggleSourceIcon").onclick = function () { setSourceCollapsed(!panel.classList.contains("sourceCollapsed")); };
$("#toggleHtmlIcon").onclick = function () { setHtmlHidden(!document.getElementById(APP.hostId + "-page-hide-style")); };
setSourceCollapsed(false);
setHtmlHidden(false);
$("#build").onclick = function () { APP.stop = false; buildMemory(ui); };
$("#analyze").onclick = analyze;
$("#stop").onclick = function () { APP.stop = true; ui.status("\u062c\u0627\u0631\u064a \u0627\u0644\u0625\u064a\u0642\u0627\u0641..."); };

$("#acceptAll").onclick = function () {
APP.results.forEach(function (r) {
if (r.best) {
r.target = r.best;
r.status = r.score >= 95 && !qaIssues(r.segment.text, r.target).length ? "Confirmed" : "Review";
}
});
renderResults(APP.results);
ui.status("\u062a\u0645 \u0627\u0639\u062a\u0645\u0627\u062f \u0623\u0641\u0636\u0644 \u0627\u0644\u0645\u0637\u0627\u0628\u0642\u0627\u062a.");
};

$("#copy").onclick = function () {
updateStoredTargets();
var text = APP.results.map(function (r) { return r.target || ""; }).filter(Boolean).join("\n\n");
if (navigator.clipboard) navigator.clipboard.writeText(text);
ui.status("\u062a\u0645 \u0646\u0633\u062e Target Draft.");
};

$("#clear").onclick = function () {
APP.results = [];
res.innerHTML = "<tr><td colspan='6' style='text-align:center;padding:30px;color:#64748b'>\u062a\u0645 \u0627\u0644\u0645\u0633\u062d.</td></tr>";
ui.progress(0, 0);
ui.status("\u062a\u0645 \u0645\u0633\u062d \u0627\u0644\u0646\u062a\u0627\u0626\u062c.");
updateStats();
};

$("#concordance").onclick = function () {
var q = flat($("#concordQ").value || "");
if (!q) { ui.status("\u0627\u0643\u062a\u0628 \u0643\u0644\u0645\u0629 \u0623\u0648 \u0639\u0628\u0627\u0631\u0629 \u0644\u0644\u0628\u062d\u062b \u0641\u064a Concordance."); return; }
var L = lang(q);
var qP = profile(q, L);
var matches = [];
APP.tus.forEach(function (tu) {
var trg = L === "ar" ? tu.en : tu.ar;
var p = L === "ar" ? tu.arP : tu.enP;
var srcFound = L === "ar" ? tu.ar : tu.en;
var sc = scoreProfiles(qP, p);
if (p.nl.indexOf(qP.nl) >= 0 || p.compact.indexOf(qP.compact) >= 0 || sc >= 55) {
matches.push({ segment: { text: q, lang: L }, best: trg, target: trg, targetLang: L === "ar" ? "en" : "ar", score: Math.max(sc, 55), status: "Concordance", mode: "concordance", sourceFound: srcFound });
}
});
matches.sort(function (a, b) { return b.score - a.score; });
APP.results = matches.slice(0, 80);
renderResults(APP.results);
ui.status("\u0646\u062a\u0627\u0626\u062c Concordance: " + asc(APP.results.length));
};



$("#importHTMLMemory").onclick = function () { $("#fileHTMLMemory").click(); };
$("#fileHTMLMemory").onchange = async function () {
var f = $("#fileHTMLMemory").files && $("#fileHTMLMemory").files[0];
if (!f) return;
try {
ui.status("Importing hidden HTML Translation Memory...");
var txt = await readLocalFileText(f);
var summary = await buildHiddenHTMLMemoryFromText(txt, f.name || "memory.html", ui);
ui.status(
"ØªÙ Ø§Ø³ØªÙØ±Ø§Ø¯ HTML ÙØ°Ø§ÙØ±Ø© ÙØ®ÙÙØ©. Ø§ÙØµÙÙÙ: " + asc(summary.rows) +
" â Ø§ÙÙØ­Ø¯Ø§Øª Ø§ÙÙØ¶Ø§ÙØ©: " + asc(summary.added) +
" â Ø¥Ø¬ÙØ§ÙÙ TM: " + asc(summary.totalTM) +
". Ø§ÙØµÙ Ø§ÙÙØµ ÙÙ Source Ø«Ù Ø§Ø¶ØºØ· ØªØ­ÙÙÙ Ø§ÙÙØµ."
);
} catch (e) {
ui.status("ÙØ´Ù Ø§Ø³ØªÙØ±Ø§Ø¯ HTML ÙØ°Ø§ÙØ±Ø© ÙØ®ÙÙØ©: " + (e && e.message ? e.message : e));
}
$("#fileHTMLMemory").value = "";
};

$("#importDOCX").onclick = function () { $("#fileDOCX").click(); };
$("#fileDOCX").onchange = async function () {
var f = $("#fileDOCX").files && $("#fileDOCX").files[0];
if (!f) return;
try {
ui.status("Reading Word DOCX locally as source template...");

var ab = await f.arrayBuffer();
APP.sourceDocxArrayBuffer = ab;
APP.sourceDocxName = f.name || "source.docx";
APP.keepDocxParagraphs = true;

var pkg = await parseDocxPackage(ab);
source.value = pkg.text;
setSourceCollapsed(false);

ui.status("ØªÙ Ø§Ø³ØªÙØ±Ø§Ø¯ DOCX ÙÙØ§ÙØ¨ ÙØµØ¯Ø±. Ø§ÙÙÙØ±Ø§Øª: " + asc(pkg.paragraphs.length) + ". Ø§ÙØ¢Ù Ø§Ø¶ØºØ· ØªØ­ÙÙÙØ Ø«Ù ØµØ¯ÙØ± Ø¨ÙÙØ³ ØªÙØ³ÙÙ Ø§ÙÙØµØ¯Ø±.");
} catch (e) {
APP.sourceDocxArrayBuffer = null;
APP.sourceDocxName = "";
APP.keepDocxParagraphs = false;
ui.status("DOCX import failed: " + (e && e.message ? e.message : e));
}

$("#fileDOCX").value = "";
};

$("#importDOCXZip").onclick = function () { $("#fileDOCXZip").click(); };
$("#fileDOCXZip").onchange = async function () {
var f = $("#fileDOCXZip").files && $("#fileDOCXZip").files[0];
if (!f) return;
try {
ui.status("Ø¬Ø§Ø±Ù Ø§Ø³ØªÙØ±Ø§Ø¯ ZIP Word ÙØ°Ø§ÙØ±Ø© ØªØ±Ø¬ÙØ©...");
var summary = await importDocxZipAsTM(f, ui);
ui.status(
"ØªÙ Ø§Ø³ØªÙØ±Ø§Ø¯ ZIP Word. Ø§ÙÙÙÙØ§Øª: " + asc(summary.files) +
" â Ø§ÙØ£Ø²ÙØ§Ø¬ Ø§ÙÙØ³ØªØ®Ø±Ø¬Ø©: " + asc(summary.totalPairs) +
" â Ø§ÙÙØ¶Ø§ÙØ© Ø¨Ø¹Ø¯ Ø­Ø°Ù Ø§ÙØªÙØ±Ø§Ø±: " + asc(summary.added) +
" â Ø¥Ø¬ÙØ§ÙÙ TM: " + asc(summary.totalTM) +
(summary.failed ? " â ÙÙÙØ§Øª ØªØ¹Ø°Ø± ÙØ±Ø§Ø¡ØªÙØ§: " + asc(summary.failed) : "")
);
} catch (e) {
ui.status("ÙØ´Ù Ø§Ø³ØªÙØ±Ø§Ø¯ ZIP Word: " + (e && e.message ? e.message : e));
}
$("#fileDOCXZip").value = "";
};

$("#importTerms").onclick = function () { $("#fileTerms").click(); };
$("#fileTerms").onchange = function () {
var f = $("#fileTerms").files && $("#fileTerms").files[0];
if (!f) return;
f.text().then(function (txt) { APP.terms = parseCSV(txt); ui.status("\u062a\u0645 \u0627\u0633\u062a\u064a\u0631\u0627\u062f \u0627\u0644\u0645\u0635\u0637\u0644\u062d\u0627\u062a: " + asc(APP.terms.length)); });
};

$("#importTMX").onclick = function () { $("#fileTMX").click(); };
$("#fileTMX").onchange = function () {
var f = $("#fileTMX").files && $("#fileTMX").files[0];
if (!f) return;
f.text().then(function (txt) {
var count = importTMXText(txt);
ui.status("\u062a\u0645 \u0627\u0633\u062a\u064a\u0631\u0627\u062f TMX. \u0627\u0644\u0648\u062d\u062f\u0627\u062a \u0627\u0644\u0645\u0636\u0627\u0641\u0629: " + asc(count) + " \u2014 \u0625\u062c\u0645\u0627\u0644\u064a TM: " + asc(APP.tus.length));
});
};

$("#exportTMX").onclick = function () { download("cat_v45_memory.tmx", exportTMX(), "application/xml;charset=utf-8"); ui.status("\u062a\u0645 \u062a\u0635\u062f\u064a\u0631 TMX."); };
$("#exportXLIFF").onclick = function () { updateStoredTargets(); download("cat_v45_project.xlf", exportXLIFF(APP.results), "application/xml;charset=utf-8"); ui.status("\u062a\u0645 \u062a\u0635\u062f\u064a\u0631 XLIFF."); };

$("#saveProject").onclick = function () {
updateStoredTargets();
var project = { app: "CAT V45 Professional Stable Enhanced", version: APP.version, date: new Date().toISOString(), terms: APP.terms, results: APP.results };
download("cat_v45_project.json", JSON.stringify(project, null, 2), "application/json;charset=utf-8");
ui.status("\u062a\u0645 \u062d\u0641\u0638 \u0627\u0644\u0645\u0634\u0631\u0648\u0639.");
};

$("#loadProject").onclick = function () { $("#fileProject").click(); };
$("#fileProject").onchange = function () {
var f = $("#fileProject").files && $("#fileProject").files[0];
if (!f) return;
f.text().then(function (txt) {
try {
var p = JSON.parse(txt);
APP.terms = p.terms || [];
APP.results = p.results || [];
renderResults(APP.results);
ui.status("\u062a\u0645 \u0641\u062a\u062d \u0627\u0644\u0645\u0634\u0631\u0648\u0639. \u0627\u0644\u0646\u062a\u0627\u0626\u062c: " + asc(APP.results.length));
} catch (e) { ui.status("\u062a\u0639\u0630\u0631 \u0641\u062a\u062d \u0627\u0644\u0645\u0634\u0631\u0648\u0639: " + e.message); }
});
};

$("#report").onclick = function () { updateStoredTargets(); download("cat_v45_qa_report.html", createReport(APP.results), "text/html;charset=utf-8"); ui.status("\u062a\u0645 \u062a\u0635\u062f\u064a\u0631 \u062a\u0642\u0631\u064a\u0631 HTML."); };
$("#word").onclick = function () { updateStoredTargets(); download("cat_v45_word_a3_track_changes.doc", createWord(APP.results), "application/msword;charset=utf-8"); ui.status("\u062a\u0645 \u062a\u0635\u062f\u064a\u0631 Word A3 \u0645\u0639 Track Changes \u0628\u0635\u0631\u064a."); };
$("#wordSameFormat").onclick = async function () {
try {
updateStoredTargets();

if (!APP.sourceDocxArrayBuffer) {
ui.status("Ø§Ø³ØªÙØ±Ø¯ ÙÙÙ DOCX ÙØµØ¯Ø± Ø£ÙÙÙØ§ Ø­ØªÙ ÙÙÙÙ Ø§ÙØªØµØ¯ÙØ± Ø¨ÙÙØ³ Ø§ÙØªÙØ³ÙÙ.");
return;
}

ui.status("Ø¬Ø§Ø±Ù Ø¥ÙØ´Ø§Ø¡ ÙÙÙ Ø§ÙÙØ¯Ù Ø¨ÙÙØ³ ØªÙØ³ÙÙ Ø§ÙÙØµØ¯Ø±...");
var out = await createTargetDocxSameFormat(APP.results);
var base = (APP.sourceDocxName || "source.docx").replace(/\.docx$/i, "");

downloadBytes(
base + "_TARGET_SAME_FORMAT.docx",
out,
"application/vnd.openxmlformats-officedocument.wordprocessingml.document"
);

ui.status("ØªÙ ØªØµØ¯ÙØ± ÙÙÙ DOCX Ø§ÙÙØ¯Ù Ø¨ÙÙØ³ ÙØ§ÙØ¨ ÙØªÙØ³ÙÙ Ø§ÙÙØµØ¯Ø± ÙØ¯Ø± Ø§ÙØ¥ÙÙØ§Ù.");
} catch (e) {
ui.status("ÙØ´Ù ØªØµØ¯ÙØ± DOCX Ø¨ÙÙØ³ Ø§ÙØªÙØ³ÙÙ: " + (e && e.message ? e.message : e));
}
};

updateStats();
setTimeout(open, 300);
}

ready(function () {
try { initUI(); }
catch (e) { alert("CAT V45 Professional error: " + (e && e.message ? e.message : e)); }
});
})();
