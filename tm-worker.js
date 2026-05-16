/* =========================================================
   Global Translation Memory Matching Engine
   Arabic ↔ English HTML CAT Tool
   No external libraries
   Target: Browser / Web Worker / Vercel static app
========================================================= */

export type Lang = "ar" | "en" | "mixed" | "unknown";

export type MatchType =
  | "exact"
  | "normalized_exact"
  | "formatting_only"
  | "structural"
  | "fuzzy"
  | "partial"
  | "repeated"
  | "none";

export type MatchStatus =
  | "Confirmed"
  | "Needs Review"
  | "Needs Translation";

export interface TMThresholds {
  confirmed: number;
  review: number;
  minimumReliable: number;
  fuzzyCandidateLimit: number;
  neighborWindow: number;
}

export interface TMMetadata {
  rowIndex?: number;
  cellIndex?: number;
  tableIndex?: number;
  location?: string;
  extractionType?: string;
}

export interface TMPair {
  id: string;
  source: string;
  target: string;
  sourceNorm: string;
  sourceCompact: string;
  targetNorm: string;
  sourceLang: Lang;
  targetLang: Lang;
  tokens: string[];
  metadata: TMMetadata;
}

export interface MatchResult {
  sourceSegment: string;
  bestMatchingSource: string;
  suggestedTarget: string;
  matchPercentage: number;
  matchType: MatchType;
  status: MatchStatus;
  explanation: string;
  candidateMetadata: TMMetadata | null;
}

export interface EngineOptions {
  sourceLang?: Lang;
  targetLang?: Lang;
  thresholds?: Partial<TMThresholds>;
}

const DEFAULT_THRESHOLDS: TMThresholds = {
  confirmed: 95,
  review: 70,
  minimumReliable: 70,
  fuzzyCandidateLimit: 250,
  neighborWindow: 2
};

/* =========================================================
   Basic utilities
========================================================= */

function safeString(v: unknown): string {
  return String(v ?? "");
}

function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function hasArabic(s: string): boolean {
  return /[\u0600-\u06FF]/.test(safeString(s));
}

function hasLatin(s: string): boolean {
  return /[A-Za-z]/.test(safeString(s));
}

function arabicRatio(s: string): number {
  const text = safeString(s);
  if (!text) return 0;
  const ar = (text.match(/[\u0600-\u06FF]/g) || []).length;
  return ar / Math.max(1, text.length);
}

function latinRatio(s: string): number {
  const text = safeString(s);
  if (!text) return 0;
  const en = (text.match(/[A-Za-z]/g) || []).length;
  return en / Math.max(1, text.length);
}

function detectLang(s: string): Lang {
  const ar = arabicRatio(s);
  const en = latinRatio(s);

  if (ar > 0.18 && en > 0.10) return "mixed";
  if (ar > 0.12) return "ar";
  if (en > 0.12) return "en";
  return "unknown";
}

function decodeHtmlEntities(input: string): string {
  const text = safeString(input);
  if (!text || typeof document === "undefined") return text;

  const textarea = document.createElement("textarea");
  textarea.innerHTML = text;
  return textarea.value;
}

function textFromElement(el: Element): string {
  return decodeHtmlEntities(el.textContent || "")
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* =========================================================
   Arabic-English normalization
========================================================= */

export function normalizeForMatch(input: string): string {
  let s = decodeHtmlEntities(safeString(input));

  s = s
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
    .replace(/\u0640/g, "")
    .replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, "")
    .replace(/[\u200B\u200C\u200D\u2060\uFEFF\u034F]/g, "")
    .replace(/\u00A0|\u202F|\u2007|[\u2000-\u200A]/g, " ")

    // Arabic letters
    .replace(/[أإآٱ]/g, "ا")
    .replace(/[ىی]/g, "ي")
    .replace(/ک/g, "ك")
    .replace(/[ہھۀ]/g, "ه")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")

    // Arabic/Persian digits
    .replace(/[٠-٩]/g, d => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[۰-۹]/g, d => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))

    // punctuation normalization
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

  return s;
}

export function compactForMatch(input: string): string {
  return normalizeForMatch(input).replace(/[^\p{L}\p{N}]+/gu, "");
}

export function tokenize(input: string): string[] {
  const norm = normalizeForMatch(input);
  return norm
    .split(/\s+/)
    .map(t => t.trim())
    .filter(t => t.length >= 2)
    .filter(t => !COMMON_STOPWORDS.has(t));
}

const COMMON_STOPWORDS = new Set<string>([
  "في", "من", "على", "الى", "إلى", "عن", "او", "أو", "و", "ف", "ثم",
  "the", "of", "and", "or", "to", "in", "on", "for", "a", "an", "by",
  "this", "that", "shall", "may"
]);

/* =========================================================
   False-positive protection
========================================================= */

function extractNumbers(s: string): string[] {
  const norm = normalizeForMatch(s);
  return norm.match(/\d+(?:[./-]\d+)*/g) || [];
}

function sameNumbersOrSafe(source: string, candidateSource: string): boolean {
  const a = extractNumbers(source);
  const b = extractNumbers(candidateSource);

  if (!a.length && !b.length) return true;
  if (a.length !== b.length) return false;

  const as = a.slice().sort().join("|");
  const bs = b.slice().sort().join("|");

  return as === bs;
}

function hasNegationMismatch(a: string, b: string): boolean {
  const an = normalizeForMatch(a);
  const bn = normalizeForMatch(b);

  const arNegA = /\b(لا|ليس|ليست|لم|لن|دون|غير)\b/.test(an);
  const arNegB = /\b(لا|ليس|ليست|لم|لن|دون|غير)\b/.test(bn);

  const enNegA = /\b(no|not|never|without|unless)\b/.test(an);
  const enNegB = /\b(no|not|never|without|unless)\b/.test(bn);

  return arNegA !== arNegB || enNegA !== enNegB;
}

function targetIsValid(target: string, expectedTargetLang: Lang): boolean {
  const t = safeString(target).trim();
  if (!t) return false;

  if (expectedTargetLang === "en") {
    if (arabicRatio(t) > 0.12) return false;
    if (!hasLatin(t)) return false;
  }

  if (expectedTargetLang === "ar") {
    if (latinRatio(t) > 0.40) return false;
    if (!hasArabic(t)) return false;
  }

  return true;
}

function cleanTarget(target: string, expectedTargetLang: Lang): string {
  let t = safeString(target)
    .replace(/([A-Za-z0-9.!?;])([\u0600-\u06FF])/g, "$1\n$2")
    .replace(/([\u0600-\u06FF])([A-Za-z])/g, "$1\n$2")
    .replace(/\s+/g, " ")
    .trim();

  if (expectedTargetLang === "en") {
    const parts = t
      .split(/(?:\n+|\r+|(?<=[.!?;])\s+)/g)
      .map(x => x.trim())
      .filter(Boolean)
      .filter(x => arabicRatio(x) < 0.12);

    t = parts.join(" ").replace(/\s+/g, " ").trim();
  }

  return t;
}

/* =========================================================
   Similarity functions
========================================================= */

function levenshteinRatio(a: string, b: string): number {
  a = normalizeForMatch(a);
  b = normalizeForMatch(b);

  if (a === b) return 1;
  if (!a || !b) return 0;

  const m = a.length;
  const n = b.length;

  if (Math.max(m, n) > 1200) {
    return charNgramSimilarity(a, b, 3);
  }

  const dp = new Array(n + 1);

  for (let j = 0; j <= n; j++) dp[j] = j;

  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;

    for (let j = 1; j <= n; j++) {
      const temp = dp[j];
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;

      dp[j] = Math.min(
        dp[j] + 1,
        dp[j - 1] + 1,
        prev + cost
      );

      prev = temp;
    }
  }

  const dist = dp[n];
  return 1 - dist / Math.max(m, n);
}

function charNgrams(s: string, n = 3): Set<string> {
  const x = compactForMatch(s);
  const out = new Set<string>();

  if (x.length <= n) {
    if (x) out.add(x);
    return out;
  }

  for (let i = 0; i <= x.length - n; i++) {
    out.add(x.slice(i, i + n));
  }

  return out;
}

function jaccardSet(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;

  let inter = 0;
  a.forEach(x => {
    if (b.has(x)) inter++;
  });

  const union = a.size + b.size - inter;
  return union ? inter / union : 0;
}

function tokenSimilarity(a: string, b: string): number {
  const ta = new Set(tokenize(a));
  const tb = new Set(tokenize(b));
  return jaccardSet(ta, tb);
}

function charNgramSimilarity(a: string, b: string, n = 3): number {
  return jaccardSet(charNgrams(a, n), charNgrams(b, n));
}

function weightedSimilarity(a: string, b: string): number {
  const token = tokenSimilarity(a, b);
  const ngram = charNgramSimilarity(a, b, 3);
  const lev = levenshteinRatio(a, b);

  return token * 0.45 + ngram * 0.35 + lev * 0.20;
}

function containmentScore(query: string, candidate: string): number {
  const q = normalizeForMatch(query);
  const c = normalizeForMatch(candidate);

  if (!q || !c) return 0;
  if (q === c) return 1;

  if (c.includes(q)) {
    return clamp(q.length / Math.max(1, c.length), 0.72, 0.95);
  }

  if (q.includes(c)) {
    return clamp(c.length / Math.max(1, q.length), 0.72, 0.92);
  }

  return 0;
}

/* =========================================================
   HTML bilingual extraction
========================================================= */

interface ExtractedCell {
  text: string;
  lang: Lang;
  tableIndex: number;
  rowIndex: number;
  cellIndex: number;
}

interface ExtractedRow {
  tableIndex: number;
  rowIndex: number;
  cells: ExtractedCell[];
  arCells: ExtractedCell[];
  enCells: ExtractedCell[];
}

function parseHtml(htmlOrDoc: string | Document): Document {
  if (typeof htmlOrDoc !== "string") return htmlOrDoc;

  return new DOMParser().parseFromString(htmlOrDoc, "text/html");
}

function extractRows(htmlOrDoc: string | Document): ExtractedRow[] {
  const doc = parseHtml(htmlOrDoc);
  const rows: ExtractedRow[] = [];

  const tables = Array.from(doc.querySelectorAll("table"));

  if (tables.length) {
    tables.forEach((table, tableIndex) => {
      const trs = Array.from(table.querySelectorAll("tr"));

      trs.forEach((tr, rowIndex) => {
        const cellElements = Array.from(tr.querySelectorAll("th,td"));

        const cells = cellElements
          .map((cell, cellIndex): ExtractedCell => {
            const text = textFromElement(cell);
            return {
              text,
              lang: detectLang(text),
              tableIndex,
              rowIndex,
              cellIndex
            };
          })
          .filter(c => c.text.length > 0);

        if (!cells.length) return;

        rows.push({
          tableIndex,
          rowIndex,
          cells,
          arCells: cells.filter(c => c.lang === "ar" || (c.lang === "mixed" && arabicRatio(c.text) >= latinRatio(c.text))),
          enCells: cells.filter(c => c.lang === "en" || (c.lang === "mixed" && latinRatio(c.text) > arabicRatio(c.text)))
        });
      });
    });

    return rows;
  }

  // Fallback for non-table HTML
  const blocks = Array.from(doc.querySelectorAll("p,div,li,section,article"));
  blocks.forEach((el, i) => {
    const text = textFromElement(el);
    if (!text) return;

    const cell: ExtractedCell = {
      text,
      lang: detectLang(text),
      tableIndex: 0,
      rowIndex: i,
      cellIndex: 0
    };

    rows.push({
      tableIndex: 0,
      rowIndex: i,
      cells: [cell],
      arCells: cell.lang === "ar" ? [cell] : [],
      enCells: cell.lang === "en" ? [cell] : []
    });
  });

  return rows;
}

function pairSameRow(row: ExtractedRow): TMPair[] {
  const pairs: TMPair[] = [];

  if (!row.arCells.length || !row.enCells.length) return pairs;

  for (const ar of row.arCells) {
    let bestEn = row.enCells[0];
    let bestDist = Math.abs(ar.cellIndex - bestEn.cellIndex);

    for (const en of row.enCells) {
      const d = Math.abs(ar.cellIndex - en.cellIndex);
      if (d < bestDist) {
        bestDist = d;
        bestEn = en;
      }
    }

    pairs.push(makePair(ar.text, bestEn.text, "same_row", {
      tableIndex: row.tableIndex,
      rowIndex: row.rowIndex,
      cellIndex: ar.cellIndex,
      location: `table:${row.tableIndex}/row:${row.rowIndex}/cell:${ar.cellIndex}`,
      extractionType: "same_row"
    }));
  }

  return pairs;
}

function pairNeighborRows(rows: ExtractedRow[], index: number, windowSize: number): TMPair[] {
  const row = rows[index];
  const pairs: TMPair[] = [];

  if (!row.arCells.length || row.enCells.length) return pairs;

  const nearby: ExtractedRow[] = [];

  for (let offset = 1; offset <= windowSize; offset++) {
    if (rows[index - offset]) nearby.push(rows[index - offset]);
    if (rows[index + offset]) nearby.push(rows[index + offset]);
  }

  const enCandidates = nearby
    .filter(r => r.tableIndex === row.tableIndex)
    .flatMap(r => r.enCells);

  if (!enCandidates.length) return pairs;

  for (const ar of row.arCells) {
    let best = enCandidates[0];
    let bestDist = Math.abs(row.rowIndex - best.rowIndex);

    for (const en of enCandidates) {
      const d = Math.abs(row.rowIndex - en.rowIndex);
      if (d < bestDist) {
        bestDist = d;
        best = en;
      }
    }

    pairs.push(makePair(ar.text, best.text, "neighbor_row", {
      tableIndex: row.tableIndex,
      rowIndex: row.rowIndex,
      cellIndex: ar.cellIndex,
      location: `table:${row.tableIndex}/row:${row.rowIndex}/neighbor:${best.rowIndex}`,
      extractionType: "neighbor_row"
    }));
  }

  return pairs;
}

function makePair(
  source: string,
  target: string,
  extractionType: string,
  metadata: TMMetadata
): TMPair {
  const sourceNorm = normalizeForMatch(source);
  const targetNorm = normalizeForMatch(target);
  const sourceLang = detectLang(source);
  const targetLang = detectLang(target);

  return {
    id: `${metadata.tableIndex ?? 0}:${metadata.rowIndex ?? 0}:${metadata.cellIndex ?? 0}:${sourceNorm.slice(0, 20)}`,
    source,
    target,
    sourceNorm,
    sourceCompact: compactForMatch(source),
    targetNorm,
    sourceLang,
    targetLang,
    tokens: tokenize(source),
    metadata: {
      ...metadata,
      extractionType
    }
  };
}

export function extractBilingualPairs(
  htmlOrDoc: string | Document,
  options: EngineOptions = {}
): TMPair[] {
  const thresholds = { ...DEFAULT_THRESHOLDS, ...options.thresholds };
  const expectedTarget = options.targetLang || "en";

  const rows = extractRows(htmlOrDoc);
  const pairs: TMPair[] = [];

  rows.forEach((row, index) => {
    pairs.push(...pairSameRow(row));
    pairs.push(...pairNeighborRows(rows, index, thresholds.neighborWindow));
  });

  const cleaned = pairs
    .map(p => {
      const target = cleanTarget(p.target, expectedTarget);
      return {
        ...p,
        target,
        targetNorm: normalizeForMatch(target)
      };
    })
    .filter(p => p.source.trim() && targetIsValid(p.target, expectedTarget));

  const seen = new Set<string>();
  const out: TMPair[] = [];

  for (const p of cleaned) {
    const key = p.sourceCompact + "||" + compactForMatch(p.target);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }

  return out;
}

/* =========================================================
   Global TM index
========================================================= */

export class GlobalTMEngine {
  private pairs: TMPair[] = [];
  private exact = new Map<string, TMPair[]>();
  private compact = new Map<string, TMPair[]>();
  private tokenIndex = new Map<string, Set<number>>();
  private repeated = new Map<string, TMPair>();
  private thresholds: TMThresholds;
  private sourceLang: Lang;
  private targetLang: Lang;

  constructor(options: EngineOptions = {}) {
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...options.thresholds };
    this.sourceLang = options.sourceLang || "ar";
    this.targetLang = options.targetLang || "en";
  }

  buildFromHtml(htmlOrDoc: string | Document): void {
    const pairs = extractBilingualPairs(htmlOrDoc, {
      sourceLang: this.sourceLang,
      targetLang: this.targetLang,
      thresholds: this.thresholds
    });

    this.buildFromPairs(pairs);
  }

  buildFromPairs(pairs: TMPair[]): void {
    this.pairs = [];
    this.exact.clear();
    this.compact.clear();
    this.tokenIndex.clear();
    this.repeated.clear();

    for (const pair of pairs) {
      if (!pair.source || !pair.target) continue;
      if (!targetIsValid(pair.target, this.targetLang)) continue;

      const index = this.pairs.length;
      this.pairs.push(pair);

      this.addToMap(this.exact, pair.sourceNorm, pair);
      this.addToMap(this.compact, pair.sourceCompact, pair);

      for (const token of pair.tokens) {
        if (!this.tokenIndex.has(token)) this.tokenIndex.set(token, new Set());
        this.tokenIndex.get(token)!.add(index);
      }

      if (!this.repeated.has(pair.sourceCompact)) {
        this.repeated.set(pair.sourceCompact, pair);
      }
    }
  }

  private addToMap(map: Map<string, TMPair[]>, key: string, pair: TMPair): void {
    if (!key) return;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(pair);
  }

  matchSegment(sourceSegment: string): MatchResult {
    const sourceNorm = normalizeForMatch(sourceSegment);
    const sourceCompact = compactForMatch(sourceSegment);

    if (!sourceNorm) return this.none(sourceSegment, "Empty source segment.");

    const exactCandidates = this.exact.get(sourceNorm) || [];

    const exact = this.pickBestCandidate(sourceSegment, exactCandidates, 100, "normalized_exact");
    if (exact) return exact;

    const compactCandidates = this.compact.get(sourceCompact) || [];

    const formatting = this.pickBestCandidate(sourceSegment, compactCandidates, 98, "formatting_only");
    if (formatting) return formatting;

    const repeated = this.repeated.get(sourceCompact);
    if (repeated && targetIsValid(repeated.target, this.targetLang)) {
      return this.result(sourceSegment, repeated, 99, "repeated", "Repeated source segment found in global TM.");
    }

    const partial = this.partialMatch(sourceSegment);
    if (partial.matchPercentage >= this.thresholds.minimumReliable) return partial;

    const fuzzy = this.fuzzyMatch(sourceSegment);
    if (fuzzy.matchPercentage >= this.thresholds.minimumReliable) return fuzzy;

    return this.none(sourceSegment, "No reliable translation found anywhere in the imported HTML.");
  }

  private pickBestCandidate(
    source: string,
    candidates: TMPair[],
    score: number,
    type: MatchType
  ): MatchResult | null {
    const valid = candidates.filter(c => this.isCandidateSafe(source, c, score));

    if (!valid.length) return null;

    const best = this.resolveConflicts(source, valid);

    if (!best) return null;

    return this.result(
      source,
      best,
      score,
      type,
      type === "normalized_exact"
        ? "Normalized source equals normalized TM source."
        : "Only formatting, punctuation, spacing, or harmless orthographic differences were detected."
    );
  }

  private partialMatch(source: string): MatchResult {
    let bestPair: TMPair | null = null;
    let bestScore = 0;

    for (const pair of this.pairs) {
      const contain = containmentScore(source, pair.source);

      if (contain < 0.72) continue;

      const fuzzy = weightedSimilarity(source, pair.source);
      const score = Math.round((contain * 0.65 + fuzzy * 0.35) * 100);

      if (score > bestScore && this.isCandidateSafe(source, pair, score)) {
        bestScore = score;
        bestPair = pair;
      }
    }

    if (!bestPair) {
      return this.none(source, "No reliable partial/subsegment match.");
    }

    const score = clamp(bestScore, 70, 94);

    return this.result(
      source,
      bestPair,
      score,
      "partial",
      "Source appears as part of a longer or shorter global TM entry."
    );
  }

  private fuzzyMatch(source: string): MatchResult {
    const candidateIndexes = this.collectFuzzyCandidates(source);
    let bestPair: TMPair | null = null;
    let bestScore = 0;

    for (const index of candidateIndexes) {
      const pair = this.pairs[index];
      if (!pair) continue;

      const sim = weightedSimilarity(source, pair.source);
      const score = Math.round(sim * 100);

      if (score > bestScore && this.isCandidateSafe(source, pair, score)) {
        bestScore = score;
        bestPair = pair;
      }
    }

    if (!bestPair || bestScore < this.thresholds.minimumReliable) {
      return this.none(source, "Fuzzy score below reliability threshold.");
    }

    return this.result(
      source,
      bestPair,
      clamp(bestScore, 70, 94),
      "fuzzy",
      "Best global fuzzy match selected using token, character n-gram, and Levenshtein similarity."
    );
  }

  private collectFuzzyCandidates(source: string): number[] {
    const tokens = tokenize(source);
    const scores = new Map<number, number>();

    for (const token of tokens) {
      const indexes = this.tokenIndex.get(token);
      if (!indexes) continue;

      indexes.forEach(i => {
        scores.set(i, (scores.get(i) || 0) + 1);
      });
    }

    return Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, this.thresholds.fuzzyCandidateLimit)
      .map(x => x[0]);
  }

  private isCandidateSafe(source: string, candidate: TMPair, score: number): boolean {
    if (!candidate.target || !targetIsValid(candidate.target, this.targetLang)) return false;

    if (score < this.thresholds.minimumReliable) return false;

    if (!sameNumbersOrSafe(source, candidate.source)) return false;

    if (hasNegationMismatch(source, candidate.source)) return false;

    const tokenScore = tokenSimilarity(source, candidate.source);
    const charScore = charNgramSimilarity(source, candidate.source);

    if (score < 85 && tokenScore < 0.25 && charScore < 0.35) return false;

    return true;
  }

  private resolveConflicts(source: string, candidates: TMPair[]): TMPair | null {
    if (!candidates.length) return null;
    if (candidates.length === 1) return candidates[0];

    const ranked = candidates
      .map(c => ({
        pair: c,
        score: weightedSimilarity(source, c.source)
      }))
      .sort((a, b) => b.score - a.score);

    const best = ranked[0];
    const second = ranked[1];

    if (second && Math.abs(best.score - second.score) < 0.02) {
      const bestTarget = compactForMatch(best.pair.target);
      const secondTarget = compactForMatch(second.pair.target);

      if (bestTarget !== secondTarget) {
        return null;
      }
    }

    return best.pair;
  }

  private result(
    source: string,
    pair: TMPair,
    score: number,
    type: MatchType,
    explanation: string
  ): MatchResult {
    const finalScore = clamp(Math.round(score), 0, 100);
    const target = cleanTarget(pair.target, this.targetLang);

    return {
      sourceSegment: source,
      bestMatchingSource: pair.source,
      suggestedTarget: target,
      matchPercentage: finalScore,
      matchType: type,
      status: this.statusFromScore(finalScore),
      explanation,
      candidateMetadata: pair.metadata
    };
  }

  private none(source: string, explanation: string): MatchResult {
    return {
      sourceSegment: source,
      bestMatchingSource: "",
      suggestedTarget: "",
      matchPercentage: 0,
      matchType: "none",
      status: "Needs Translation",
      explanation,
      candidateMetadata: null
    };
  }

  private statusFromScore(score: number): MatchStatus {
    if (score >= this.thresholds.confirmed) return "Confirmed";
    if (score >= this.thresholds.review) return "Needs Review";
    return "Needs Translation";
  }
}

/* =========================================================
   Integration helper for CAT table
========================================================= */

export function analyzeSegmentsWithGlobalTM(
  engine: GlobalTMEngine,
  sourceSegments: string[]
): MatchResult[] {
  return sourceSegments.map(segment => engine.matchSegment(segment));
}
