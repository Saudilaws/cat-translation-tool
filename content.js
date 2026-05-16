(function () {
"use strict";

/* =========================================================
   CAT TOOL FROM SCRATCH - content.js
   Version: CAT Tool MVP+ 3.0
   Arabic / English CAT Tool
   - Local IndexedDB Translation Memory
   - Import HTML
   - Deep HTML extraction
   - Long / discontinuous similarity
   - Context-aware matching
   - User feedback / rating system
   - Optional Machine Translation API for Needs Translation only
   - Category / tags for TM pairs
   - updatedAt / createdAt for each TM pair
========================================================= */

const APP = {
  id: "az-cat-tool-from-scratch",
  version: "CAT Tool MVP+ 3.0",
  dbName: "AZ_CAT_TOOL_DB",
  dbVersion: 3,
  storeName: "tm",
  hostId: "az-cat-tool-host",
  db: null,
  importedDoc: null,
  importedName: "",
  tmCache: [],
  rows: [],
  stop: false,
  currentQuery: "",
  settingsKey: "AZ_CAT_TOOL_SETTINGS_V3",
  settings: {
    mtEnabled: false,
    mtUrl: "",
    mtKey: "",
    mtProvider: "generic",
    defaultCategory: "عام",
    defaultTags: ""
  }
};

if (document.getElementById(APP.hostId)) {
  document.getElementById(APP.hostId).remove();
}

const host = document.createElement("div");
host.id = APP.hostId;
document.documentElement.appendChild(host);

const shadow = host.attachShadow({ mode: "open" });

shadow.innerHTML = `
<style>
:host{
  all:initial;
  font-family:system-ui,"Segoe UI",Tahoma,Arial,sans-serif;
  color:#111827;
}
*{box-sizing:border-box}
#fab{
  position:fixed;
  right:22px;
  bottom:22px;
  z-index:2147483647;
  width:64px;
  height:64px;
  border-radius:50%;
  border:none;
  background:#0F8F4F;
  color:white;
  font-size:24px;
  font-weight:800;
  cursor:pointer;
  box-shadow:0 12px 35px rgba(0,0,0,.25);
}
#mask{
  position:fixed;
  inset:0;
  z-index:2147483646;
  background:rgba(15,23,42,.35);
  display:none;
}
#panel{
  position:fixed;
  inset:24px;
  z-index:2147483647;
  background:#f8fafc;
  border:1px solid #e5e7eb;
  border-radius:24px;
  display:none;
  overflow:hidden;
  box-shadow:0 30px 90px rgba(0,0,0,.30);
  direction:rtl;
}
.header{
  height:72px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  padding:0 22px;
  background:white;
  border-bottom:1px solid #e5e7eb;
}
.title{
  display:flex;
  flex-direction:column;
  gap:4px;
}
.title strong{
  font-size:20px;
  color:#0f172a;
}
.title small{
  color:#64748b;
  direction:ltr;
  text-align:right;
}
.header-actions{
  display:flex;
  gap:8px;
  align-items:center;
}
.iconbtn{
  border:1px solid #e5e7eb;
  background:white;
  color:#0f172a;
  border-radius:12px;
  min-width:42px;
  height:38px;
  cursor:pointer;
  font-size:16px;
}
.iconbtn:hover{background:#f1f5f9}
.body{
  height:calc(100% - 72px);
  display:grid;
  grid-template-columns:390px 1fr;
  overflow:hidden;
}
.sidebar{
  background:white;
  border-left:1px solid #e5e7eb;
  padding:16px;
  overflow:auto;
}
.main{
  padding:16px;
  overflow:auto;
}
.group{
  background:#ffffff;
  border:1px solid #e5e7eb;
  border-radius:18px;
  padding:14px;
  margin-bottom:14px;
}
.group h3{
  margin:0 0 10px;
  font-size:15px;
  color:#0f172a;
}
textarea,input,select{
  width:100%;
  border:1px solid #d1d5db;
  border-radius:14px;
  padding:11px;
  font-size:14px;
  font-family:inherit;
  outline:none;
  background:white;
}
textarea:focus,input:focus,select:focus{
  border-color:#0F8F4F;
  box-shadow:0 0 0 3px rgba(15,143,79,.12);
}
textarea{
  min-height:140px;
  resize:vertical;
  direction:auto;
  line-height:1.8;
}
.label{
  display:block;
  font-size:12px;
  color:#475569;
  margin:8px 0 5px;
}
.btnrow{
  display:flex;
  gap:8px;
  flex-wrap:wrap;
}
button.action{
  border:none;
  border-radius:12px;
  padding:10px 12px;
  cursor:pointer;
  background:#0F8F4F;
  color:white;
  font-weight:700;
}
button.action.secondary{background:#334155}
button.action.light{
  background:#f1f5f9;
  color:#0f172a;
  border:1px solid #e5e7eb;
}
button.action.warn{background:#b45309}
button.action.danger{background:#dc2626}
button.action.purple{background:#6d28d9}
button.action:disabled{
  opacity:.55;
  cursor:not-allowed;
}
.counters{
  display:grid;
  grid-template-columns:repeat(5,1fr);
  gap:10px;
  margin-bottom:14px;
}
.card{
  background:white;
  border:1px solid #e5e7eb;
  border-radius:16px;
  padding:12px;
  text-align:center;
}
.card b{
  display:block;
  font-size:24px;
  color:#0f172a;
}
.card span{
  color:#64748b;
  font-size:12px;
}
#status{
  font-size:13px;
  color:#475569;
  line-height:1.8;
}
.table{
  width:100%;
  border-collapse:separate;
  border-spacing:0 10px;
}
.table th{
  text-align:right;
  color:#475569;
  font-size:12px;
  padding:4px 8px;
}
.table td{
  background:white;
  border-top:1px solid #e5e7eb;
  border-bottom:1px solid #e5e7eb;
  padding:12px;
  vertical-align:top;
  line-height:1.8;
  font-size:14px;
}
.table td:first-child{
  border-right:1px solid #e5e7eb;
  border-radius:14px 0 0 14px;
}
.table td:last-child{
  border-left:1px solid #e5e7eb;
  border-radius:0 14px 14px 0;
}
.badge{
  display:inline-block;
  padding:4px 8px;
  border-radius:999px;
  font-size:12px;
  font-weight:700;
  margin:2px;
}
.confirmed{background:#dcfce7;color:#166534}
.review{background:#fef3c7;color:#92400e}
.needs{background:#fee2e2;color:#991b1b}
.match{background:#e0f2fe;color:#075985}
.context{background:#ede9fe;color:#5b21b6}
.mt{background:#dbeafe;color:#1d4ed8}
.cat{background:#f3f4f6;color:#374151}
.target,.source{
  direction:auto;
  white-space:pre-wrap;
}
.smallnote{
  font-size:12px;
  color:#64748b;
  margin-top:6px;
  line-height:1.7;
}
.hidden{display:none !important}
.fileline{
  margin-top:8px;
  color:#64748b;
  font-size:12px;
  line-height:1.7;
}
.progress{
  height:8px;
  background:#e5e7eb;
  border-radius:999px;
  overflow:hidden;
  margin-top:10px;
}
#bar{
  height:100%;
  width:0%;
  background:#0F8F4F;
  transition:width .15s ease;
}
.feedback{
  display:flex;
  gap:6px;
  flex-wrap:wrap;
  margin-top:8px;
}
.feedback button{
  border:1px solid #e5e7eb;
  background:#f8fafc;
  border-radius:10px;
  padding:6px 8px;
  cursor:pointer;
  font-size:12px;
}
.feedback button:hover{background:#eef2ff}
details summary{
  cursor:pointer;
  color:#475569;
  font-size:12px;
}
.checkboxline{
  display:flex;
  gap:8px;
  align-items:center;
  font-size:13px;
  color:#334155;
  margin:8px 0;
}
.checkboxline input{
  width:auto;
}
@media(max-width:900px){
  #panel{
    inset:8px;
    border-radius:18px;
  }
  .body{grid-template-columns:1fr}
  .sidebar{
    border-left:none;
    border-bottom:1px solid #e5e7eb;
    max-height:46vh;
  }
  .counters{grid-template-columns:repeat(2,1fr)}
}
</style>

<button id="fab" title="Open CAT">CAT</button>

<div id="mask"></div>

<div id="panel">
  <div class="header">
    <div class="title">
      <strong>CAT Translation Tool</strong>
      <small>Local TM · Context · Rating · Optional MT API · Categories</small>
    </div>
    <div class="header-actions">
      <button id="hideCounters" class="iconbtn" title="إخفاء العدادات">▦</button>
      <button id="close" class="iconbtn" title="إغلاق">✕</button>
    </div>
  </div>

  <div class="body">
    <aside class="sidebar">

      <div class="group">
        <h3>النص المصدر</h3>
        <textarea id="sourceText" placeholder="ألصق النص المراد تحليله هنا..."></textarea>
        <div class="btnrow" style="margin-top:10px">
          <button id="analyze" class="action">تحليل</button>
          <button id="clearSource" class="action light">مسح</button>
          <button id="stop" class="action danger">إيقاف</button>
        </div>
        <div class="smallnote">التحليل يستخدم التشابه النصي + التشابه المتقطع + السياق السابق واللاحق.</div>
      </div>

      <div class="group">
        <h3>الترجمة الآلية للمحتوى غير الموجود</h3>

        <label class="checkboxline">
          <input id="mtEnabled" type="checkbox">
          تفعيل الترجمة الآلية للمقاطع Needs Translation فقط
        </label>

        <span class="label">API URL</span>
        <input id="mtUrl" placeholder="مثال: https://libretranslate.example/translate">

        <span class="label">API Key / Bearer Token اختياري</span>
        <input id="mtKey" placeholder="اتركه فارغًا إذا لم يكن مطلوبًا">

        <span class="label">نوع الاستجابة</span>
        <select id="mtProvider">
          <option value="generic">Generic / LibreTranslate compatible</option>
          <option value="openaiLike">OpenAI-like response</option>
        </select>

        <div class="btnrow" style="margin-top:10px">
          <button id="saveMTSettings" class="action light">حفظ إعدادات API</button>
          <button id="translateNeeds" class="action purple">ترجمة Needs فقط</button>
        </div>

        <div class="smallnote">
          لا يتم إرسال أي نص إلى API إلا إذا فعّلت الخيار وضغطت الترجمة أو شغّلت التحليل مع تفعيل MT.
        </div>
      </div>

      <div class="group">
        <h3>تصنيف الأزواج الجديدة</h3>
        <span class="label">التصنيف الافتراضي</span>
        <input id="defaultCategory" placeholder="مثال: Legal / Finance / عام">

        <span class="label">الوسوم الافتراضية</span>
        <input id="defaultTags" placeholder="مثال: نظام, عقود, لوائح">

        <div class="btnrow" style="margin-top:10px">
          <button id="saveClassSettings" class="action light">حفظ التصنيف</button>
        </div>
      </div>

      <div class="group">
        <h3>بناء ذاكرة الترجمة</h3>
        <div class="btnrow">
          <button id="buildPage" class="action">من الصفحة الحالية</button>
          <button id="pickHtml" class="action secondary">استيراد HTML</button>
          <button id="buildImported" class="action warn">بناء من الملف</button>
        </div>
        <input id="htmlFile" type="file" accept=".html,.htm,.txt" class="hidden">
        <div id="fileInfo" class="fileline">لم يتم استيراد ملف بعد.</div>
        <div class="smallnote">الاستخراج يفحص الخلايا، الأسطر، br، والعناصر المتداخلة.</div>
      </div>

      <div class="group">
        <h3>إدخال زوج ترجمي يدويًا</h3>
        <textarea id="manualAr" placeholder="النص العربي"></textarea>
        <textarea id="manualEn" placeholder="English translation" style="margin-top:8px"></textarea>

        <span class="label">تصنيف الزوج</span>
        <input id="manualCategory" placeholder="مثال: Legal">

        <span class="label">وسوم الزوج</span>
        <input id="manualTags" placeholder="مثال: contracts, laws, نظام">

        <div class="btnrow" style="margin-top:10px">
          <button id="savePair" class="action">حفظ الزوج</button>
        </div>
      </div>

      <div class="group">
        <h3>إدارة الذاكرة</h3>
        <span class="label">فلترة حسب التصنيف أو الوسم</span>
        <input id="tmFilter" placeholder="مثال: Legal أو contracts">

        <div class="btnrow" style="margin-top:10px">
          <button id="reloadTM" class="action light">تحديث الذاكرة</button>
          <button id="exportJson" class="action light">تصدير JSON</button>
          <button id="importJsonBtn" class="action light">استيراد JSON</button>
          <button id="clearTM" class="action danger">مسح الذاكرة</button>
        </div>
        <input id="jsonFile" type="file" accept=".json" class="hidden">
      </div>

      <div class="group">
        <h3>الحالة</h3>
        <div id="status">جاهز.</div>
        <div class="progress"><div id="bar"></div></div>
      </div>

    </aside>

    <main class="main">
      <div id="counterBox" class="counters">
        <div class="card"><b id="cTotal">0</b><span>Segments</span></div>
        <div class="card"><b id="cAvg">0%</b><span>Average</span></div>
        <div class="card"><b id="cConfirmed">0</b><span>Confirmed</span></div>
        <div class="card"><b id="cReview">0</b><span>Needs Review</span></div>
        <div class="card"><b id="cNeeds">0</b><span>Needs Translation</span></div>
      </div>

      <div class="group">
        <div class="btnrow">
          <button id="jumpReview" class="action light">انتقال إلى Needs Review</button>
          <button id="jumpNeeds" class="action light">انتقال إلى Needs Translation</button>
          <button id="acceptBest" class="action">اعتماد أفضل النتائج</button>
          <button id="copyDraft" class="action secondary">نسخ المسودة</button>
        </div>
      </div>

      <table class="table">
        <thead>
          <tr>
            <th style="width:38px">#</th>
            <th style="width:25%">Source</th>
            <th style="width:30%">Best Target</th>
            <th style="width:85px">Score</th>
            <th style="width:115px">Status</th>
            <th>Reason / Metadata / Feedback</th>
          </tr>
        </thead>
        <tbody id="results"></tbody>
      </table>
    </main>
  </div>
</div>
`;

const $ = id => shadow.getElementById(id);

/* =========================
   Settings
========================= */

function loadSettings() {
  try {
    const raw = localStorage.getItem(APP.settingsKey);
    if (raw) {
      APP.settings = Object.assign(APP.settings, JSON.parse(raw));
    }
  } catch (e) {}
}

function saveSettings() {
  localStorage.setItem(APP.settingsKey, JSON.stringify(APP.settings));
}

function applySettingsToUI() {
  $("mtEnabled").checked = !!APP.settings.mtEnabled;
  $("mtUrl").value = APP.settings.mtUrl || "";
  $("mtKey").value = APP.settings.mtKey || "";
  $("mtProvider").value = APP.settings.mtProvider || "generic";
  $("defaultCategory").value = APP.settings.defaultCategory || "عام";
  $("defaultTags").value = APP.settings.defaultTags || "";
  $("manualCategory").value = APP.settings.defaultCategory || "عام";
  $("manualTags").value = APP.settings.defaultTags || "";
}

function readSettingsFromUI() {
  APP.settings.mtEnabled = !!$("mtEnabled").checked;
  APP.settings.mtUrl = $("mtUrl").value.trim();
  APP.settings.mtKey = $("mtKey").value.trim();
  APP.settings.mtProvider = $("mtProvider").value;
  APP.settings.defaultCategory = $("defaultCategory").value.trim() || "عام";
  APP.settings.defaultTags = $("defaultTags").value.trim();
  saveSettings();
}

/* =========================
   Basic Helpers
========================= */

function setStatus(msg) {
  $("status").textContent = msg;
}

function setProgress(n) {
  $("bar").style.width = Math.max(0, Math.min(100, n)) + "%";
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatDate(ts) {
  if (!ts) return "";
  try {
    return new Date(ts).toLocaleString();
  } catch (e) {
    return "";
  }
}

function parseTags(input) {
  if (Array.isArray(input)) return input.map(String).map(x => x.trim()).filter(Boolean);

  return String(input || "")
    .split(/[,،;؛|]/g)
    .map(x => x.trim())
    .filter(Boolean);
}

function tagsToText(tags) {
  return parseTags(tags).join(", ");
}

/* =========================
   Normalization
========================= */

function normalizeText(input) {
  let s = String(input || "");

  s = s
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
    .replace(/\u0640/g, "")
    .replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, "")
    .replace(/[\u200B\u200C\u200D\u2060\uFEFF\u034F]/g, "")
    .replace(/[\u00A0\u202F\u2007-\u200A]/g, " ");

  s = s
    .replace(/[أإآٱ]/g, "ا")
    .replace(/[ىی]/g, "ي")
    .replace(/ک/g, "ك")
    .replace(/[ہھۀ]/g, "ه");

  s = s.replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
  s = s.replace(/[۰-۹]/g, d => "۰۱۲۳۴۵۶۷۸۹".indexOf(d));

  s = s.toLowerCase();

  s = s
    .replace(/[“”„‟]/g, '"')
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[‐-‒–—―]/g, "-")
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  return s;
}

function compactText(input) {
  return normalizeText(input).replace(/\s+/g, "");
}

function hasArabic(s) {
  return /[\u0600-\u06FF]/.test(String(s || ""));
}

function hasEnglish(s) {
  return /[A-Za-z]/.test(String(s || ""));
}

function detectLang(s) {
  const text = String(s || "");
  const ar = (text.match(/[\u0600-\u06FF]/g) || []).length;
  const en = (text.match(/[A-Za-z]/g) || []).length;

  if (ar > en) return "ar";
  if (en > ar) return "en";
  return "mixed";
}

function cleanVisibleText(s) {
  return String(s || "")
    .replace(/\u00A0/g, " ")
    .replace(/[ \t\r\f\v]+/g, " ")
    .replace(/\n\s+/g, "\n")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanOneLine(s) {
  return String(s || "")
    .replace(/\s+/g, " ")
    .replace(/\u00A0/g, " ")
    .trim();
}

/* =========================
   Segmentation
========================= */

function splitSegments(text) {
  const normalized = String(text || "")
    .replace(/\r/g, "\n")
    .replace(/\u00A0/g, " ");

  const raw = normalized
    .split(/\n+|(?<=[.!؟?؛;])\s+/g)
    .map(x => cleanOneLine(x))
    .filter(Boolean);

  const out = [];

  for (const item of raw) {
    if (item.length <= 650) {
      out.push(item);
      continue;
    }

    const parts = item
      .split(/،|,|؛|;/g)
      .map(x => cleanOneLine(x))
      .filter(Boolean);

    if (parts.length > 1) out.push(...parts);
    else out.push(item);
  }

  return out.filter(x => normalizeText(x).length > 0);
}

/* =========================
   Similarity
========================= */

const AR_STOP = new Set([
  "في","من","إلى","الى","على","عن","أن","ان","إن","او","أو","ثم","كما","قد","كل",
  "هذا","هذه","ذلك","تلك","هو","هي","هم","هن","ما","لا","لم","لن","كان","كانت",
  "يكون","تكون","يجب","يجوز","وفقا","وفق","بموجب","مع","بعد","قبل"
].map(normalizeText));

const EN_STOP = new Set([
  "the","a","an","of","to","in","on","for","and","or","as","by","with","from",
  "that","this","these","those","is","are","was","were","be","been","being",
  "shall","may","must","should","under","pursuant","according"
]);

function tokenize(s) {
  const n = normalizeText(s);
  if (!n) return [];

  return n
    .split(/\s+/)
    .filter(t => t.length > 1)
    .filter(t => !AR_STOP.has(t))
    .filter(t => !EN_STOP.has(t));
}

function tokenFreq(tokens) {
  const m = new Map();
  for (const t of tokens) m.set(t, (m.get(t) || 0) + 1);
  return m;
}

function cosineTokens(aTokens, bTokens) {
  if (!aTokens.length || !bTokens.length) return 0;

  const a = tokenFreq(aTokens);
  const b = tokenFreq(bTokens);

  let dot = 0;
  let na = 0;
  let nb = 0;

  for (const [, v] of a) na += v * v;
  for (const [, v] of b) nb += v * v;

  for (const [k, v] of a) {
    if (b.has(k)) dot += v * b.get(k);
  }

  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function diceList(a, b) {
  if (!a.length || !b.length) return 0;

  const map = new Map();
  for (const x of a) map.set(x, (map.get(x) || 0) + 1);

  let hit = 0;
  for (const y of b) {
    const c = map.get(y) || 0;
    if (c > 0) {
      hit++;
      map.set(y, c - 1);
    }
  }

  return (2 * hit) / (a.length + b.length);
}

function chargrams(s, size) {
  const n = compactText(s);
  if (!n) return [];
  if (n.length <= size) return [n];

  const out = [];
  for (let i = 0; i <= n.length - size; i++) {
    out.push(n.slice(i, i + size));
  }
  return out;
}

function skipgrams(tokens) {
  const out = [];
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i + 1]) out.push(tokens[i] + "_" + tokens[i + 1]);
    if (tokens[i + 2]) out.push(tokens[i] + "_" + tokens[i + 2]);
  }
  return out;
}

function lcsTokenRatio(aTokens, bTokens) {
  if (!aTokens.length || !bTokens.length) return 0;

  const a = aTokens;
  const b = bTokens;
  const prev = new Array(b.length + 1).fill(0);
  const curr = new Array(b.length + 1).fill(0);

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      curr[j] = a[i - 1] === b[j - 1]
        ? prev[j - 1] + 1
        : Math.max(prev[j], curr[j - 1]);
    }

    for (let j = 0; j <= b.length; j++) {
      prev[j] = curr[j];
      curr[j] = 0;
    }
  }

  return prev[b.length] / Math.max(a.length, b.length);
}

function containmentScore(aTokens, bTokens) {
  if (!aTokens.length || !bTokens.length) return 0;

  const bSet = new Set(bTokens);
  let hit = 0;

  for (const t of aTokens) {
    if (bSet.has(t)) hit++;
  }

  return hit / Math.max(1, aTokens.length);
}

function lengthPenalty(a, b) {
  const la = normalizeText(a).length;
  const lb = normalizeText(b).length;
  if (!la || !lb) return 0.75;

  const min = Math.min(la, lb);
  const max = Math.max(la, lb);

  return Math.max(0.72, min / max);
}

function similarity(a, b) {
  const na = normalizeText(a);
  const nb = normalizeText(b);

  if (!na || !nb) return 0;
  if (na === nb) return 100;

  const ca = compactText(a);
  const cb = compactText(b);

  if (ca && cb && ca === cb) return 99;

  if (na.includes(nb) || nb.includes(na)) {
    const min = Math.min(na.length, nb.length);
    const max = Math.max(na.length, nb.length);
    return Math.round(90 + 9 * (min / max));
  }

  const ta = tokenize(na);
  const tb = tokenize(nb);

  const tokenDice = diceList(ta, tb);
  const cosine = cosineTokens(ta, tb);
  const lcs = lcsTokenRatio(ta, tb);
  const containment = Math.max(containmentScore(ta, tb), containmentScore(tb, ta));
  const grams3 = diceList(chargrams(ca, 3), chargrams(cb, 3));
  const grams4 = diceList(chargrams(ca, 4), chargrams(cb, 4));
  const skip = diceList(skipgrams(ta), skipgrams(tb));
  const penalty = lengthPenalty(a, b);

  let score =
    tokenDice * 0.22 +
    cosine * 0.20 +
    lcs * 0.17 +
    containment * 0.16 +
    grams3 * 0.10 +
    grams4 * 0.07 +
    skip * 0.08;

  score = score * penalty;

  if (containment >= 0.88 && tokenDice >= 0.70) score = Math.max(score, 0.88);
  if (lcs >= 0.80 && cosine >= 0.75) score = Math.max(score, 0.90);

  return Math.round(score * 100);
}

/* =========================
   IndexedDB
========================= */

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(APP.dbName, APP.dbVersion);

    req.onupgradeneeded = e => {
      const db = e.target.result;
      let store;

      if (!db.objectStoreNames.contains(APP.storeName)) {
        store = db.createObjectStore(APP.storeName, { keyPath: "id" });
      } else {
        store = e.target.transaction.objectStore(APP.storeName);
      }

      const indexes = [
        ["key", "key", { unique: false }],
        ["arNorm", "arNorm", { unique: false }],
        ["enNorm", "enNorm", { unique: false }],
        ["createdAt", "createdAt", { unique: false }],
        ["updatedAt", "updatedAt", { unique: false }],
        ["rating", "rating", { unique: false }],
        ["votes", "votes", { unique: false }],
        ["category", "category", { unique: false }],
        ["source", "source", { unique: false }]
      ];

      for (const [name, keyPath, opts] of indexes) {
        if (!store.indexNames.contains(name)) {
          store.createIndex(name, keyPath, opts);
        }
      }
    };

    req.onsuccess = e => {
      APP.db = e.target.result;
      resolve(APP.db);
    };

    req.onerror = () => reject(req.error);
  });
}

function txStore(mode) {
  return APP.db.transaction(APP.storeName, mode).objectStore(APP.storeName);
}

function getAllTM() {
  return new Promise((resolve, reject) => {
    const req = txStore("readonly").getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

function getTMById(id) {
  return new Promise((resolve, reject) => {
    const req = txStore("readonly").get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

function putTM(entry) {
  return new Promise((resolve, reject) => {
    const req = txStore("readwrite").put(entry);
    req.onsuccess = () => resolve(entry);
    req.onerror = () => reject(req.error);
  });
}

function clearTMStore() {
  return new Promise((resolve, reject) => {
    const req = txStore("readwrite").clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function refreshCache() {
  APP.tmCache = await getAllTM();

  for (const e of APP.tmCache) {
    if (typeof e.rating !== "number") e.rating = 0;
    if (typeof e.votes !== "number") e.votes = 0;
    if (typeof e.positive !== "number") e.positive = 0;
    if (typeof e.negative !== "number") e.negative = 0;
    if (!e.category) e.category = "عام";
    if (!Array.isArray(e.tags)) e.tags = parseTags(e.tags);
    if (!e.createdAt) e.createdAt = Date.now();
    if (!e.updatedAt) e.updatedAt = e.createdAt;
  }

  setStatus("تم تحميل ذاكرة الترجمة: " + APP.tmCache.length + " زوج ترجمي.");
}

/* =========================
   TM Entry
========================= */

function hashString(str) {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;

  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }

  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  return ((h2 >>> 0).toString(36) + (h1 >>> 0).toString(36));
}

function makeEntry(ar, en, meta) {
  ar = cleanOneLine(ar);
  en = cleanOneLine(en);

  const arNorm = normalizeText(ar);
  const enNorm = normalizeText(en);

  if (!arNorm || !enNorm) return null;
  if (arNorm.length < 2 || enNorm.length < 2) return null;

  const category = meta && meta.category
    ? cleanOneLine(meta.category)
    : (APP.settings.defaultCategory || "عام");

  const tags = meta && meta.tags
    ? parseTags(meta.tags)
    : parseTags(APP.settings.defaultTags);

  const key = arNorm + " || " + enNorm;

  return {
    id: "tm_" + hashString(key),
    key,
    ar,
    en,
    arNorm,
    enNorm,
    arCompact: compactText(ar),
    enCompact: compactText(en),
    source: meta && meta.source ? meta.source : "",
    context: meta && meta.context ? meta.context : "",
    contextPrev: meta && meta.contextPrev ? cleanOneLine(meta.contextPrev) : "",
    contextNext: meta && meta.contextNext ? cleanOneLine(meta.contextNext) : "",
    category,
    tags,
    rating: 0,
    votes: 0,
    positive: 0,
    negative: 0,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
}

async function saveEntries(entries) {
  const unique = new Map();

  for (const e of entries) {
    if (e && e.key) unique.set(e.id, e);
  }

  const arr = Array.from(unique.values());

  for (let i = 0; i < arr.length; i++) {
    const fresh = arr[i];
    const old = await getTMById(fresh.id);

    if (old) {
      fresh.rating = Number(old.rating || 0);
      fresh.votes = Number(old.votes || 0);
      fresh.positive = Number(old.positive || 0);
      fresh.negative = Number(old.negative || 0);
      fresh.createdAt = old.createdAt || fresh.createdAt;
      fresh.updatedAt = Date.now();

      if (!fresh.category && old.category) fresh.category = old.category;
      if ((!fresh.tags || !fresh.tags.length) && old.tags) fresh.tags = parseTags(old.tags);
    }

    await putTM(fresh);

    if (i % 80 === 0) {
      setProgress((i / Math.max(1, arr.length)) * 100);
      await sleep(0);
    }
  }

  setProgress(100);
  await refreshCache();
  return arr.length;
}

/* =========================
   Deep HTML Extraction
========================= */

function isBadText(t) {
  const n = normalizeText(t);
  if (!n) return true;
  if (n.length < 2) return true;
  if (/^(page|صفحة)\s*\d+$/i.test(n)) return true;
  if (/^\d+$/.test(n) && n.length <= 3) return true;
  return false;
}

function uniqueTexts(arr) {
  const seen = new Set();
  const out = [];

  for (const x of arr) {
    const t = cleanOneLine(x);
    const n = normalizeText(t);
    if (!n || seen.has(n) || isBadText(t)) continue;
    seen.add(n);
    out.push(t);
  }

  return out;
}

function getTextWithBreaks(el) {
  const clone = el.cloneNode(true);

  clone.querySelectorAll("br").forEach(br => {
    br.replaceWith(clone.ownerDocument.createTextNode("\n"));
  });

  clone.querySelectorAll("p,div,li,h1,h2,h3,h4,h5,h6").forEach(node => {
    node.appendChild(clone.ownerDocument.createTextNode("\n"));
  });

  return cleanVisibleText(clone.textContent || "");
}

function splitMixedTextByLanguage(text) {
  const lines = String(text || "")
    .split(/\n+| {2,}/g)
    .map(cleanOneLine)
    .filter(Boolean);

  const out = [];

  for (const line of lines) {
    if (hasArabic(line) && hasEnglish(line)) {
      const parts = line
        .split(/(?<=[\u0600-\u06FF])\s+(?=[A-Za-z])|(?<=[A-Za-z])\s+(?=[\u0600-\u06FF])/g)
        .map(cleanOneLine)
        .filter(Boolean);

      out.push(...parts);
    } else {
      out.push(line);
    }
  }

  return uniqueTexts(out);
}

function getCellDeepTexts(cell) {
  const all = [];

  const full = cleanOneLine(cell.innerText || cell.textContent || "");
  if (full) all.push(full);

  const withBreaks = getTextWithBreaks(cell);
  if (withBreaks) {
    all.push(withBreaks);
    all.push(...splitMixedTextByLanguage(withBreaks));
  }

  const children = Array.from(cell.querySelectorAll("p,div,span,li,strong,b,em,u,h1,h2,h3,h4,h5,h6"));
  for (const child of children) {
    const t = cleanOneLine(child.innerText || child.textContent || "");
    if (t) all.push(t);
  }

  return uniqueTexts(all);
}

function getRowDeepTexts(row) {
  const cells = Array.from(row.cells || []);
  const out = [];

  for (const cell of cells) {
    out.push(...getCellDeepTexts(cell));
  }

  return uniqueTexts(out);
}

function chooseArabicTexts(texts) {
  return texts.filter(t => hasArabic(t));
}

function chooseEnglishTexts(texts) {
  return texts.filter(t => hasEnglish(t) && !hasArabic(t));
}

function nearestByShape(source, candidates) {
  if (!candidates || !candidates.length) return "";

  const sLen = normalizeText(source).length;
  let best = candidates[0];
  let bestScore = -Infinity;

  for (const c of candidates) {
    const cLen = normalizeText(c).length;
    const ratio = Math.min(sLen, cLen) / Math.max(1, Math.max(sLen, cLen));
    const punctA = (String(source).match(/[.:;،؛؟?]/g) || []).length;
    const punctB = (String(c).match(/[.:;،؛؟?]/g) || []).length;
    const punctScore = 1 - Math.min(1, Math.abs(punctA - punctB) / 6);
    const score = ratio * 0.75 + punctScore * 0.25;

    if (score > bestScore) {
      best = c;
      bestScore = score;
    }
  }

  return best;
}

function pairByOrderOrShape(arTexts, enTexts, meta) {
  const entries = [];

  if (!arTexts.length || !enTexts.length) return entries;

  const ar = uniqueTexts(arTexts);
  const en = uniqueTexts(enTexts);

  const joined = makeEntry(ar.join(" "), en.join(" "), meta);
  if (joined) entries.push(joined);

  if (ar.length === en.length) {
    for (let i = 0; i < ar.length; i++) {
      const e = makeEntry(ar[i], en[i], {
        ...meta,
        context: meta.context + "-ordered-" + i
      });
      if (e) entries.push(e);
    }
  } else {
    const limit = Math.min(8, Math.max(ar.length, en.length));

    for (let i = 0; i < Math.min(ar.length, limit); i++) {
      const bestEn = nearestByShape(ar[i], en);
      const e = makeEntry(ar[i], bestEn, {
        ...meta,
        context: meta.context + "-shape-ar-" + i
      });
      if (e) entries.push(e);
    }

    if (ar.length <= 4 && en.length <= 4) {
      const e2 = makeEntry(ar.join(" "), en.join(" "), {
        ...meta,
        context: meta.context + "-small-merge"
      });
      if (e2) entries.push(e2);
    }
  }

  return entries;
}

function buildPairsFromRows(root, sourceName) {
  const entries = [];
  const rows = Array.from(root.querySelectorAll("tr"));

  const snapshots = rows.map(row => {
    const texts = getRowDeepTexts(row);
    return {
      texts,
      all: texts.join(" "),
      ar: chooseArabicTexts(texts),
      en: chooseEnglishTexts(texts)
    };
  });

  let arBuffer = [];
  let enBuffer = [];
  let contextBuffer = "";

  for (let idx = 0; idx < snapshots.length; idx++) {
    const snap = snapshots[idx];
    if (!snap.texts.length) continue;

    const prev = snapshots[idx - 1] ? snapshots[idx - 1].all : "";
    const next = snapshots[idx + 1] ? snapshots[idx + 1].all : "";

    if (snap.ar.length && snap.en.length) {
      entries.push(...pairByOrderOrShape(snap.ar, snap.en, {
        source: sourceName,
        context: "row-deep-" + idx,
        contextPrev: prev,
        contextNext: next,
        category: APP.settings.defaultCategory,
        tags: APP.settings.defaultTags
      }));

      arBuffer = [];
      enBuffer = [];
      contextBuffer = "";
      continue;
    }

    if (snap.ar.length && !snap.en.length) {
      arBuffer.push(...snap.ar);
      contextBuffer = contextBuffer || prev;
      if (arBuffer.length > 6) arBuffer = arBuffer.slice(-6);

      if (enBuffer.length) {
        entries.push(...pairByOrderOrShape(arBuffer, enBuffer, {
          source: sourceName,
          context: "multi-row-merge-" + idx,
          contextPrev: contextBuffer,
          contextNext: next,
          category: APP.settings.defaultCategory,
          tags: APP.settings.defaultTags
        }));

        arBuffer = [];
        enBuffer = [];
        contextBuffer = "";
      }

      continue;
    }

    if (snap.en.length && !snap.ar.length) {
      enBuffer.push(...snap.en);
      contextBuffer = contextBuffer || prev;
      if (enBuffer.length > 6) enBuffer = enBuffer.slice(-6);

      if (arBuffer.length) {
        entries.push(...pairByOrderOrShape(arBuffer, enBuffer, {
          source: sourceName,
          context: "multi-row-merge-" + idx,
          contextPrev: contextBuffer,
          contextNext: next,
          category: APP.settings.defaultCategory,
          tags: APP.settings.defaultTags
        }));

        arBuffer = [];
        enBuffer = [];
        contextBuffer = "";
      }
    }
  }

  return entries;
}

function buildPairsFromBlocks(root, sourceName) {
  const selector = "p,div,span,li,h1,h2,h3,h4,h5,h6,td,th";
  const nodes = Array.from(root.querySelectorAll(selector));

  const blocks = [];

  for (const el of nodes) {
    if (el.closest("#" + APP.hostId)) continue;

    const deep = getCellDeepTexts(el);
    for (const text of deep) {
      if (isBadText(text)) continue;

      const lang = detectLang(text);
      if (lang === "ar" || lang === "en") {
        const prevEl = el.previousElementSibling;
        const nextEl = el.nextElementSibling;

        blocks.push({
          text,
          lang,
          prev: prevEl ? cleanOneLine(prevEl.innerText || prevEl.textContent || "") : "",
          next: nextEl ? cleanOneLine(nextEl.innerText || nextEl.textContent || "") : ""
        });
      }
    }
  }

  const entries = [];

  for (let i = 0; i < blocks.length - 1; i++) {
    const a = blocks[i];
    const b = blocks[i + 1];

    if (a.lang === "ar" && b.lang === "en") {
      const e = makeEntry(a.text, b.text, {
        source: sourceName,
        context: "near-block-" + i,
        contextPrev: a.prev,
        contextNext: b.next,
        category: APP.settings.defaultCategory,
        tags: APP.settings.defaultTags
      });
      if (e) entries.push(e);
    }

    if (a.lang === "en" && b.lang === "ar") {
      const e = makeEntry(b.text, a.text, {
        source: sourceName,
        context: "near-block-" + i,
        contextPrev: a.prev,
        contextNext: b.next,
        category: APP.settings.defaultCategory,
        tags: APP.settings.defaultTags
      });
      if (e) entries.push(e);
    }
  }

  return entries;
}

async function buildMemoryFromRoot(root, sourceName) {
  APP.stop = false;
  readSettingsFromUI();

  setStatus("جاري استخراج الأزواج الترجمية بفحص عميق...");
  setProgress(5);

  const rowPairs = buildPairsFromRows(root, sourceName);
  setProgress(45);
  await sleep(0);

  const blockPairs = buildPairsFromBlocks(root, sourceName);
  setProgress(70);
  await sleep(0);

  const all = [...rowPairs, ...blockPairs];

  setStatus("تم استخراج " + all.length + " زوج محتمل. جاري الحفظ...");
  const saved = await saveEntries(all);

  setStatus("تم بناء الذاكرة. عدد الأزواج المحفوظة أو المحدّثة: " + saved);
}

/* =========================
   Matching
========================= */

function entryMatchesFilter(entry) {
  const f = normalizeText($("tmFilter").value || "");
  if (!f) return true;

  const category = normalizeText(entry.category || "");
  const tags = normalizeText(tagsToText(entry.tags || []));
  const source = normalizeText(entry.source || "");

  return category.includes(f) || tags.includes(f) || source.includes(f);
}

function getCompareSide(queryLang, entry, query) {
  if (queryLang === "ar") {
    return { compare: entry.ar, target: entry.en, side: "AR→EN" };
  }

  if (queryLang === "en") {
    return { compare: entry.en, target: entry.ar, side: "EN→AR" };
  }

  const arScore = similarity(query, entry.ar);
  const enScore = similarity(query, entry.en);

  if (arScore >= enScore) {
    return { compare: entry.ar, target: entry.en, side: "AR→EN" };
  }

  return { compare: entry.en, target: entry.ar, side: "EN→AR" };
}

function contextBonus(prev, next, entry) {
  let bonus = 0;
  let parts = 0;

  if (prev && entry.contextPrev) {
    bonus += similarity(prev, entry.contextPrev);
    parts++;
  }

  if (next && entry.contextNext) {
    bonus += similarity(next, entry.contextNext);
    parts++;
  }

  if (!parts) return 0;

  const avg = bonus / parts;

  if (avg >= 85) return 7;
  if (avg >= 70) return 5;
  if (avg >= 55) return 3;
  if (avg >= 40) return 1;

  return 0;
}

function ratingBonus(entry) {
  const rating = Number(entry.rating || 0);
  const votes = Number(entry.votes || 0);

  if (!votes) return 0;

  if (rating >= 4) return 4;
  if (rating >= 2) return 2;
  if (rating <= -4) return -8;
  if (rating <= -2) return -4;

  return 0;
}

function findBestMatch(segment, prevSegment, nextSegment) {
  const q = cleanOneLine(segment);
  APP.currentQuery = q;

  const qLang = detectLang(q);
  let best = null;

  for (const entry of APP.tmCache) {
    if (!entryMatchesFilter(entry)) continue;

    const side = getCompareSide(qLang, entry, q);
    if (!side.compare || !side.target) continue;

    const base = similarity(q, side.compare);
    const ctx = contextBonus(prevSegment, nextSegment, entry);
    const rate = ratingBonus(entry);

    let score = Math.max(0, Math.min(100, base + ctx + rate));

    if (score < 70) {
      const qCompact = compactText(q);
      const cCompact = compactText(side.compare);

      if (qCompact && cCompact && (qCompact.includes(cCompact) || cCompact.includes(qCompact))) {
        score = Math.max(score, 86 + ctx + rate);
      }
    }

    if (!best || score > best.score) {
      best = {
        score: Math.round(score),
        baseScore: base,
        contextScore: ctx,
        ratingScore: rate,
        target: side.target,
        sourceFound: side.compare,
        reason: side.side + " | direct + long/discontinuous + context",
        entry,
        entryId: entry.id,
        category: entry.category || "عام",
        tags: entry.tags || [],
        createdAt: entry.createdAt || 0,
        updatedAt: entry.updatedAt || 0
      };
    }

    if (score >= 100) break;
  }

  if (!best || best.score < 75) {
    const split = findSplitMergeMatch(q, prevSegment, nextSegment);
    if (split && (!best || split.score > best.score)) {
      best = split;
    }
  }

  if (!best) {
    return {
      score: 0,
      baseScore: 0,
      contextScore: 0,
      ratingScore: 0,
      target: "",
      sourceFound: "",
      reason: "no-match",
      entryId: "",
      category: "",
      tags: [],
      createdAt: 0,
      updatedAt: 0
    };
  }

  return best;
}

function findSplitMergeMatch(segment, prevSegment, nextSegment) {
  const parts = splitSegments(segment);
  if (parts.length <= 1) return null;

  const targets = [];
  const sources = [];
  const scores = [];
  const ids = [];
  let metaEntry = null;

  for (const part of parts) {
    let localBest = null;
    const lang = detectLang(part);

    for (const entry of APP.tmCache) {
      if (!entryMatchesFilter(entry)) continue;

      const side = getCompareSide(lang, entry, part);
      const base = similarity(part, side.compare);
      const ctx = contextBonus(prevSegment, nextSegment, entry);
      const rate = ratingBonus(entry);
      const score = Math.max(0, Math.min(100, base + ctx + rate));

      if (!localBest || score > localBest.score) {
        localBest = {
          score,
          target: side.target,
          sourceFound: side.compare,
          entryId: entry.id,
          entry
        };
      }
    }

    if (localBest && localBest.score >= 72 && localBest.target) {
      targets.push(localBest.target);
      sources.push(localBest.sourceFound);
      scores.push(localBest.score);
      ids.push(localBest.entryId);
      metaEntry = metaEntry || localBest.entry;
    }
  }

  if (!targets.length) return null;

  const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

  return {
    score: Math.min(94, avg),
    baseScore: avg,
    contextScore: 0,
    ratingScore: 0,
    target: targets.join("\n"),
    sourceFound: sources.join("\n---\n"),
    reason: "split/merge smart match + discontinuous matching",
    entryId: ids[0] || "",
    category: metaEntry ? metaEntry.category || "عام" : "",
    tags: metaEntry ? metaEntry.tags || [] : [],
    createdAt: metaEntry ? metaEntry.createdAt || 0 : 0,
    updatedAt: metaEntry ? metaEntry.updatedAt || 0 : 0
  };
}

function getStatus(score, target, fromMT) {
  if (fromMT) return "Needs Review";
  if (!target || score < 70) return "Needs Translation";
  if (score >= 95) return "Confirmed";
  return "Needs Review";
}

function statusClass(status) {
  if (status === "Confirmed") return "confirmed";
  if (status === "Needs Review") return "review";
  return "needs";
}

/* =========================
   Machine Translation API
========================= */

function targetLangForSource(text) {
  const lang = detectLang(text);
  if (lang === "ar") return { source: "ar", target: "en" };
  if (lang === "en") return { source: "en", target: "ar" };
  return { source: "auto", target: "en" };
}

async function callMachineTranslation(text) {
  readSettingsFromUI();

  if (!APP.settings.mtEnabled) {
    throw new Error("MT is disabled.");
  }

  if (!APP.settings.mtUrl) {
    throw new Error("MT API URL is empty.");
  }

  const langs = targetLangForSource(text);

  const headers = {
    "Content-Type": "application/json"
  };

  if (APP.settings.mtKey) {
    headers.Authorization = "Bearer " + APP.settings.mtKey;
  }

  let body;

  if (APP.settings.mtProvider === "openaiLike") {
    body = {
      model: "translation-model",
      messages: [
        {
          role: "system",
          content: "Translate accurately between Arabic and English. Return only the translation."
        },
        {
          role: "user",
          content: text
        }
      ]
    };
  } else {
    body = {
      q: text,
      source: langs.source,
      target: langs.target,
      format: "text",
      api_key: APP.settings.mtKey || undefined
    };
  }

  const res = await fetch(APP.settings.mtUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    throw new Error("MT API error: HTTP " + res.status);
  }

  const data = await res.json();

  const translated =
    data.translatedText ||
    data.translation ||
    data.text ||
    data.result ||
    (data.data && data.data.translation) ||
    (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) ||
    "";

  return cleanOneLine(translated);
}

async function translateNeedsOnly() {
  readSettingsFromUI();

  if (!APP.settings.mtEnabled) {
    setStatus("فعّل خيار الترجمة الآلية أولًا.");
    return;
  }

  const needs = APP.rows.filter(r => r.status === "Needs Translation" && r.source);
  if (!needs.length) {
    setStatus("لا توجد مقاطع Needs Translation لترجمتها آليًا.");
    return;
  }

  setStatus("جاري ترجمة المقاطع غير الموجودة في الذاكرة عبر API...");
  setProgress(0);

  for (let i = 0; i < needs.length; i++) {
    if (APP.stop) {
      setStatus("تم إيقاف الترجمة الآلية.");
      break;
    }

    const row = needs[i];

    try {
      const mt = await callMachineTranslation(row.source);
      if (mt) {
        row.target = mt;
        row.score = 60;
        row.status = "Needs Review";
        row.reason = "Machine Translation API suggestion";
        row.fromMT = true;
      }
    } catch (err) {
      row.reason = "MT failed: " + (err && err.message ? err.message : err);
    }

    if (i % 2 === 0) {
      renderRows();
      updateCounters();
      setProgress((i / needs.length) * 100);
      await sleep(0);
    }
  }

  renderRows();
  updateCounters();
  setProgress(100);
  setStatus("اكتملت ترجمة المقاطع غير الموجودة في الذاكرة.");
}

/* =========================
   Analysis
========================= */

async function analyzeSource() {
  APP.stop = false;
  readSettingsFromUI();

  if (!APP.tmCache.length) {
    await refreshCache();
  }

  const text = $("sourceText").value || "";
  const segments = splitSegments(text);

  if (!segments.length) {
    setStatus("لا يوجد نص لتحليله.");
    return;
  }

  APP.rows = [];
  renderRows();

  setStatus("جاري التحليل بالسياق والتشابه المتقطع...");
  setProgress(0);

  for (let i = 0; i < segments.length; i++) {
    if (APP.stop) {
      setStatus("تم إيقاف التحليل.");
      break;
    }

    const source = segments[i];
    const prev = segments[i - 1] || "";
    const next = segments[i + 1] || "";

    const hit = findBestMatch(source, prev, next);

    let score = Number(hit.score || 0);
    let target = hit.target || "";
    let reason = hit.reason || "";
    let fromMT = false;

    if ((!target || score < 70) && APP.settings.mtEnabled && APP.settings.mtUrl) {
      try {
        const mt = await callMachineTranslation(source);
        if (mt) {
          target = mt;
          score = 60;
          reason = "Machine Translation API suggestion";
          fromMT = true;
        }
      } catch (err) {
        reason = "no-match | MT failed: " + (err && err.message ? err.message : err);
      }
    }

    const status = getStatus(score, target, fromMT);

    APP.rows.push({
      id: i + 1,
      source,
      prev,
      next,
      target,
      sourceFound: hit.sourceFound || "",
      score,
      baseScore: hit.baseScore || 0,
      contextScore: hit.contextScore || 0,
      ratingScore: hit.ratingScore || 0,
      status,
      reason,
      entryId: hit.entryId || "",
      category: hit.category || "",
      tags: hit.tags || [],
      createdAt: hit.createdAt || 0,
      updatedAt: hit.updatedAt || 0,
      fromMT
    });

    if (i % 5 === 0) {
      renderRows();
      updateCounters();
      setProgress((i / segments.length) * 100);
      await sleep(0);
    }
  }

  renderRows();
  updateCounters();
  setProgress(100);
  setStatus("اكتمل التحليل.");
}

function renderRows() {
  const tbody = $("results");

  tbody.innerHTML = APP.rows.map((row, index) => `
    <tr data-status="${escapeHtml(row.status)}" data-index="${index}">
      <td>${row.id}</td>
      <td>
        <div class="source">${escapeHtml(row.source)}</div>
      </td>
      <td>
        <div class="target">${escapeHtml(row.target || "")}</div>
      </td>
      <td>
        <span class="badge match">${row.score}%</span>
        ${row.contextScore ? `<br><span class="badge context">CTX +${row.contextScore}</span>` : ""}
        ${row.fromMT ? `<br><span class="badge mt">MT</span>` : ""}
      </td>
      <td>
        <span class="badge ${statusClass(row.status)}">${escapeHtml(row.status)}</span>
      </td>
      <td>
        <div>${escapeHtml(row.reason || "")}</div>

        <div class="smallnote">
          Base: ${Math.round(row.baseScore || row.score || 0)} |
          Context: ${Math.round(row.contextScore || 0)} |
          Rating: ${Math.round(row.ratingScore || 0)}
        </div>

        ${row.category ? `<span class="badge cat">Category: ${escapeHtml(row.category)}</span>` : ""}
        ${row.tags && row.tags.length ? `<span class="badge cat">Tags: ${escapeHtml(tagsToText(row.tags))}</span>` : ""}

        ${row.updatedAt ? `
          <div class="smallnote">
            Created: ${escapeHtml(formatDate(row.createdAt))}<br>
            Updated: ${escapeHtml(formatDate(row.updatedAt))}
          </div>
        ` : ""}

        ${row.sourceFound ? `
          <details>
            <summary>المصدر المطابق</summary>
            <div class="source">${escapeHtml(row.sourceFound)}</div>
          </details>
        ` : ""}

        <div class="feedback">
          <button data-act="good" data-index="${index}">👍 جيد</button>
          <button data-act="bad" data-index="${index}">👎 غير مناسب</button>
          <button data-act="save" data-index="${index}">💾 حفظ كزوج</button>
        </div>
      </td>
    </tr>
  `).join("");
}

function updateCounters() {
  const total = APP.rows.length;
  const avg = total
    ? Math.round(APP.rows.reduce((a, r) => a + Number(r.score || 0), 0) / total)
    : 0;

  const confirmed = APP.rows.filter(r => r.status === "Confirmed").length;
  const review = APP.rows.filter(r => r.status === "Needs Review").length;
  const needs = APP.rows.filter(r => r.status === "Needs Translation").length;

  $("cTotal").textContent = total;
  $("cAvg").textContent = avg + "%";
  $("cConfirmed").textContent = confirmed;
  $("cReview").textContent = review;
  $("cNeeds").textContent = needs;

  $("jumpReview").style.display = review ? "" : "none";
  $("jumpNeeds").style.display = needs ? "" : "none";
}

function acceptBest() {
  APP.rows = APP.rows.map(r => {
    if (r.target && r.score >= 70) {
      return {
        ...r,
        status: r.score >= 95 ? "Confirmed" : "Needs Review"
      };
    }
    return r;
  });

  renderRows();
  updateCounters();
  setStatus("تم اعتماد أفضل النتائج المتاحة.");
}

function copyDraft() {
  const draft = APP.rows
    .map(r => r.target || "")
    .join("\n\n");

  navigator.clipboard.writeText(draft).then(() => {
    setStatus("تم نسخ مسودة الترجمة.");
  }).catch(() => {
    setStatus("تعذر النسخ التلقائي. انسخ النتائج يدويًا.");
  });
}

function jumpToStatus(status) {
  const row = shadow.querySelector(`tr[data-status="${status}"]`);
  if (row) {
    row.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

/* =========================
   Feedback
========================= */

async function rateSuggestion(rowIndex, type) {
  const row = APP.rows[rowIndex];
  if (!row) return;

  if (!row.entryId) {
    setStatus("لا يوجد سجل ذاكرة مرتبط بهذا الاقتراح.");
    return;
  }

  const entry = await getTMById(row.entryId);
  if (!entry) {
    setStatus("لم يتم العثور على سجل الذاكرة المرتبط.");
    return;
  }

  entry.votes = Number(entry.votes || 0) + 1;

  if (type === "good") {
    entry.positive = Number(entry.positive || 0) + 1;
    entry.rating = Number(entry.rating || 0) + 1;
    setStatus("تم تسجيل التقييم: الاقتراح جيد.");
  } else {
    entry.negative = Number(entry.negative || 0) + 1;
    entry.rating = Number(entry.rating || 0) - 1;
    setStatus("تم تسجيل التقييم: الاقتراح غير مناسب.");
  }

  entry.updatedAt = Date.now();

  await putTM(entry);
  await refreshCache();
}

async function saveRowAsPair(rowIndex) {
  const row = APP.rows[rowIndex];
  if (!row || !row.source || !row.target) {
    setStatus("لا يوجد زوج صالح للحفظ.");
    return;
  }

  const lang = detectLang(row.source);

  let ar = "";
  let en = "";

  if (lang === "ar") {
    ar = row.source;
    en = row.target;
  } else if (lang === "en") {
    ar = row.target;
    en = row.source;
  } else {
    if (hasArabic(row.source)) {
      ar = row.source;
      en = row.target;
    } else {
      ar = row.target;
      en = row.source;
    }
  }

  const e = makeEntry(ar, en, {
    source: row.fromMT ? "machine-translation-api" : "user-feedback",
    context: "saved-from-analysis",
    contextPrev: row.prev || "",
    contextNext: row.next || "",
    category: APP.settings.defaultCategory || "عام",
    tags: APP.settings.defaultTags || ""
  });

  if (!e) {
    setStatus("تعذر حفظ الزوج.");
    return;
  }

  const old = await getTMById(e.id);
  if (old) {
    e.rating = Number(old.rating || 0) + 1;
    e.votes = Number(old.votes || 0) + 1;
    e.positive = Number(old.positive || 0) + 1;
    e.negative = Number(old.negative || 0);
    e.createdAt = old.createdAt || e.createdAt;
  } else {
    e.rating = 1;
    e.votes = 1;
    e.positive = 1;
  }

  e.updatedAt = Date.now();

  await putTM(e);
  await refreshCache();

  setStatus("تم حفظ هذا الاقتراح كزوج ترجمي في الذاكرة مع التصنيف والتاريخ.");
}

$("results").addEventListener("click", async e => {
  const btn = e.target.closest("button[data-act]");
  if (!btn) return;

  const index = Number(btn.getAttribute("data-index"));
  const act = btn.getAttribute("data-act");

  if (act === "good") await rateSuggestion(index, "good");
  if (act === "bad") await rateSuggestion(index, "bad");
  if (act === "save") await saveRowAsPair(index);
});

/* =========================
   Import / Export JSON
========================= */

function downloadFile(filename, text, type) {
  const blob = new Blob([text], { type: type || "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = filename;
  a.click();

  setTimeout(() => URL.revokeObjectURL(url), 500);
}

async function exportJSON() {
  await refreshCache();

  downloadFile(
    "cat-translation-memory-v3.json",
    JSON.stringify(APP.tmCache, null, 2),
    "application/json;charset=utf-8"
  );

  setStatus("تم تصدير ذاكرة الترجمة JSON مع التصنيفات وتاريخ آخر تحديث.");
}

async function importJSONFile(file) {
  const text = await file.text();
  const data = JSON.parse(text);

  if (!Array.isArray(data)) {
    setStatus("ملف JSON غير صحيح.");
    return;
  }

  const entries = [];

  for (const item of data) {
    if (item.ar && item.en) {
      const e = makeEntry(item.ar, item.en, {
        source: item.source || file.name,
        context: item.context || "json-import",
        contextPrev: item.contextPrev || "",
        contextNext: item.contextNext || "",
        category: item.category || APP.settings.defaultCategory || "عام",
        tags: item.tags || APP.settings.defaultTags || ""
      });

      if (e) {
        e.rating = Number(item.rating || 0);
        e.votes = Number(item.votes || 0);
        e.positive = Number(item.positive || 0);
        e.negative = Number(item.negative || 0);
        e.createdAt = Number(item.createdAt || Date.now());
        e.updatedAt = Number(item.updatedAt || e.createdAt);
        entries.push(e);
      }
    }
  }

  const saved = await saveEntries(entries);
  setStatus("تم استيراد " + saved + " زوج ترجمي من JSON.");
}

/* =========================
   Manual Pair
========================= */

async function saveManualPair() {
  const ar = $("manualAr").value;
  const en = $("manualEn").value;

  const e = makeEntry(ar, en, {
    source: "manual",
    context: "manual-entry",
    category: $("manualCategory").value.trim() || APP.settings.defaultCategory || "عام",
    tags: $("manualTags").value.trim() || APP.settings.defaultTags || ""
  });

  if (!e) {
    setStatus("أدخل نصًا عربيًا وإنجليزيًا صالحين.");
    return;
  }

  const old = await getTMById(e.id);
  if (old) {
    e.rating = Number(old.rating || 0);
    e.votes = Number(old.votes || 0);
    e.positive = Number(old.positive || 0);
    e.negative = Number(old.negative || 0);
    e.createdAt = old.createdAt || e.createdAt;
  }

  e.updatedAt = Date.now();

  await putTM(e);
  await refreshCache();

  $("manualAr").value = "";
  $("manualEn").value = "";

  setStatus("تم حفظ الزوج الترجمي يدويًا مع التصنيف وتاريخ آخر تحديث.");
}

/* =========================
   Panel / File Helpers
========================= */

function openPanel() {
  $("mask").style.display = "block";
  $("panel").style.display = "block";
}

function closePanel() {
  $("mask").style.display = "none";
  $("panel").style.display = "none";
}

async function loadHtmlFile(file) {
  const text = await file.text();
  const parser = new DOMParser();

  APP.importedDoc = parser.parseFromString(text, "text/html");
  APP.importedName = file.name;

  $("fileInfo").textContent = "تم استيراد: " + file.name;
  setStatus("تم تحميل ملف HTML. اضغط: بناء من الملف.");
}

/* =========================
   Events
========================= */

$("fab").addEventListener("click", openPanel);
$("close").addEventListener("click", closePanel);
$("mask").addEventListener("click", closePanel);

$("hideCounters").addEventListener("click", () => {
  $("counterBox").classList.toggle("hidden");
});

$("saveMTSettings").addEventListener("click", () => {
  readSettingsFromUI();
  setStatus("تم حفظ إعدادات الترجمة الآلية.");
});

$("saveClassSettings").addEventListener("click", () => {
  readSettingsFromUI();
  $("manualCategory").value = APP.settings.defaultCategory || "عام";
  $("manualTags").value = APP.settings.defaultTags || "";
  setStatus("تم حفظ إعدادات التصنيف والوسوم الافتراضية.");
});

$("translateNeeds").addEventListener("click", translateNeedsOnly);

$("clearSource").addEventListener("click", () => {
  $("sourceText").value = "";
  APP.rows = [];
  renderRows();
  updateCounters();
  setStatus("تم مسح النص المصدر.");
});

$("stop").addEventListener("click", () => {
  APP.stop = true;
  setStatus("جاري الإيقاف...");
});

$("analyze").addEventListener("click", analyzeSource);

$("buildPage").addEventListener("click", async () => {
  await buildMemoryFromRoot(document.body, location.href || "current-page");
});

$("pickHtml").addEventListener("click", () => {
  $("htmlFile").click();
});

$("htmlFile").addEventListener("change", async e => {
  const file = e.target.files && e.target.files[0];
  if (file) await loadHtmlFile(file);
});

$("buildImported").addEventListener("click", async () => {
  if (!APP.importedDoc) {
    setStatus("استورد ملف HTML أولًا.");
    return;
  }

  await buildMemoryFromRoot(APP.importedDoc.body, APP.importedName || "imported-html");
});

$("savePair").addEventListener("click", saveManualPair);

$("reloadTM").addEventListener("click", refreshCache);

$("tmFilter").addEventListener("input", () => {
  setStatus("تم تطبيق فلتر الذاكرة على التحليل القادم.");
});

$("clearTM").addEventListener("click", async () => {
  const ok = confirm("هل تريد مسح ذاكرة الترجمة المحلية بالكامل؟");
  if (!ok) return;

  await clearTMStore();
  APP.tmCache = [];
  APP.rows = [];
  renderRows();
  updateCounters();
  setStatus("تم مسح ذاكرة الترجمة.");
});

$("exportJson").addEventListener("click", exportJSON);

$("importJsonBtn").addEventListener("click", () => {
  $("jsonFile").click();
});

$("jsonFile").addEventListener("change", async e => {
  const file = e.target.files && e.target.files[0];
  if (file) await importJSONFile(file);
});

$("acceptBest").addEventListener("click", acceptBest);
$("copyDraft").addEventListener("click", copyDraft);

$("jumpReview").addEventListener("click", () => jumpToStatus("Needs Review"));
$("jumpNeeds").addEventListener("click", () => jumpToStatus("Needs Translation"));

/* =========================
   Init
========================= */

(async function init() {
  try {
    loadSettings();
    applySettingsToUI();

    await openDB();
    await refreshCache();

    updateCounters();

    setStatus("جاهز. الذاكرة الحالية: " + APP.tmCache.length + " زوج ترجمي.");
  } catch (err) {
    console.error(err);
    setStatus("حدث خطأ في فتح IndexedDB: " + (err && err.message ? err.message : err));
  }
})();

})();
