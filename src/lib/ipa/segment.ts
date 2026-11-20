import data from "./features.json";

/**
 * IPA segmentation and phonological features, from panphon (MIT, Mortensen et al.).
 * Features are panphon's 22 weighted features; + = 1, - = -1, 0 = 0 (unspecified).
 */

export type Seg = {
  text: string; // as written (NFD)
  base: string; // without diacritics: decides C vs D
  feats: Int8Array | null; // null = not an IPA segment panphon knows
  wordStart: boolean; // first phone of a word in the target (for display + process rules)
  wordEnd: boolean;
};

const SEGMENTS = data.segments as Record<string, string>;
export const FEATURE_NAMES = data.names as string[];
export const WEIGHTS = Float32Array.from(data.weights as number[]);
export const WEIGHT_SUM = WEIGHTS.reduce((a, b) => a + b, 0);
const F = Object.fromEntries(FEATURE_NAMES.map((n, i) => [n, i])) as Record<string, number>;

const MAX_LEN = Object.keys(SEGMENTS).reduce((m, k) => Math.max(m, [...k].length), 1);
const cache = new Map<string, Int8Array | null>();

export function features(seg: string): Int8Array | null {
  if (cache.has(seg)) return cache.get(seg)!;
  const s = SEGMENTS[seg];
  const v = s ? Int8Array.from(s, (c) => (c === "+" ? 1 : c === "-" ? -1 : 0)) : null;
  cache.set(seg, v);
  return v;
}

export const feat = (v: Int8Array | null, name: string) => (v ? v[F[name]] : 0);

/** Marks that don't change which segment it is: stress, syllable breaks, tones, linking. */
const IGNORE = /[ˈˌ.‿|ˑ˥-˩̀-̂̄̌]/gu;
const DIACRITIC = /[̀-ͯʰ-˿᷀-᷿]/u;
// Tie bars stay: t͡ʃ is one segment, t ʃ is two.
const TIE = /[͜͡]/u;

export function normalize(ipa: string) {
  return ipa
    .normalize("NFD")
    .replace(/g/g, "ɡ") // ASCII g → IPA ɡ
    .replace(/[ː:]/g, "ː") // length
    .replace(/[/[\]]/g, "") // slashes and brackets around transcriptions
    .replace(IGNORE, "")
    .trim();
}

/** Base phone without diacritics, keeping tie bars and the length mark's absence. */
export function baseOf(seg: string) {
  return [...seg].filter((c) => TIE.test(c) || !DIACRITIC.test(c)).join("");
}

/**
 * Greedy longest match over panphon's segment inventory (≈6,400 segments with diacritics).
 * Spaces mark word boundaries; unknown diacritics attach to the previous segment.
 */
export function segment(ipa: string): Seg[] {
  const out: Seg[] = [];
  const words = normalize(ipa).split(/\s+/).filter(Boolean);
  for (const w of words) {
    const chars = [...w];
    const start = out.length;
    let i = 0;
    while (i < chars.length) {
      let hit = "";
      for (let len = Math.min(MAX_LEN, chars.length - i); len > 0; len--) {
        const cand = chars.slice(i, i + len).join("");
        if (SEGMENTS[cand]) {
          hit = cand;
          break;
        }
      }
      if (!hit) {
        const c = chars[i];
        if ((DIACRITIC.test(c) || TIE.test(c) || c === "ː") && out.length > start) {
          // Diacritic panphon has no row for: keep it on the previous phone, keep that phone's features.
          const prev = out[out.length - 1];
          prev.text += c;
          i++;
          continue;
        }
        hit = c;
      }
      out.push({ text: hit, base: baseOf(hit), feats: features(hit) ?? features(baseOf(hit)), wordStart: out.length === start, wordEnd: false });
      i += [...hit].length;
    }
    if (out.length > start) out[out.length - 1].wordEnd = true;
  }
  return out;
}

/** panphon's weighted_substitution_cost, divided by the insertion cost so indels cost 1. */
export function distance(a: Seg, b: Seg): number {
  if (a.text === b.text) return 0;
  if (!a.feats || !b.feats) return a.base === b.base ? 0.1 : 1;
  let s = 0;
  for (let k = 0; k < WEIGHTS.length; k++) s += Math.abs(a.feats[k] - b.feats[k]) * WEIGHTS[k];
  return s / WEIGHT_SUM;
}

export const isConsonant = (s: Seg) => (s.feats ? s.feats[F.syl] !== 1 : !/[aeiouəɛɔɪʊæɐɑɒʌɨʉɯyøœɤ]/u.test(s.base));
