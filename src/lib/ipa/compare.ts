import { distance, feat, isConsonant, segment, type Seg } from "./segment";

/**
 * Compares produced IPA with the SLP's ideal IPA:
 *   1. segment both (panphon inventory),
 *   2. align with Needleman–Wunsch, substitution = feature-weighted distance, insertion/deletion = 1,
 *   3. classify each aligned pair with SODA (Substitution, Omission, Distortion, Addition),
 *   4. suggest likely phonological processes from the feature changes.
 * Runs on the device, so it works offline and updates as soon as IPA is edited.
 */

export type ErrorType = "C" | "S" | "O" | "D" | "A";

export const PROCESSES = {
  fronting: "Fronting",
  backing: "Backing",
  stopping: "Stopping",
  gliding: "Gliding",
  devoicing: "Devoicing",
  voicing: "Voicing",
  denasalization: "Denasalisation",
  nasalization: "Nasalisation",
  glottal: "Glottal replacement",
  deaffrication: "Deaffrication",
  affrication: "Affrication",
  cluster: "Cluster reduction",
  final: "Final consonant deletion",
  initial: "Initial consonant deletion",
  vowel: "Vowel change",
  lateralization: "Lateralisation",
} as const;
export type Process = keyof typeof PROCESSES;

export type Op = {
  key: string; // stable id for SLP marks: target position, or the addition's place
  ti: number | null; // index in the target segments
  pi: number | null; // index in the produced segments
  t: Seg | null;
  p: Seg | null;
  type: ErrorType; // automatic classification
  cost: number; // 0..~1.2, feature distance (indels = 1)
  suggested: Process[];
};

export type Metrics = {
  pcc: number | null; // percent consonants correct (Shriberg): C / target consonants
  per: number; // phone error rate: (S + O + A) / target phones
  fer: number; // feature error rate: summed feature distance / target phones
  counts: Record<ErrorType, number>;
  targetPhones: number;
  targetConsonants: number;
};

export type Analysis = { target: string; targetSegs: Seg[]; producedSegs: Seg[]; ops: Op[]; metrics: Metrics };

/** Pairs Tagalog SLPs usually accept as the same sound. Each is also overridable per pair. */
export const DEFAULT_EQUIVALENCES: [string, string][] = [
  ["ɾ", "r"],
  ["i", "j"],
  ["u", "w"],
];

const pairKey = (a: string, b: string) => (a < b ? `${a}=${b}` : `${b}=${a}`);

export function equivalenceSet(extra: string[] = []) {
  const s = new Set(DEFAULT_EQUIVALENCES.map(([a, b]) => pairKey(a, b)));
  for (const e of extra) {
    const [a, b] = e.split("=");
    if (a && b) s.add(pairKey(a.normalize("NFD"), b.normalize("NFD")));
  }
  return s;
}

function align(T: Seg[], P: Seg[], eq: Set<string>) {
  const n = T.length;
  const m = P.length;
  // Accepted pairs match on the exact sounds (e.g. ɡ=ɡ̤) or on their base letters (e.g. ɾ=r).
  const same = (i: number, j: number) => eq.has(pairKey(T[i].text, P[j].text)) || eq.has(pairKey(T[i].base, P[j].base));
  const sub = (i: number, j: number) => (same(i, j) ? 0 : distance(T[i], P[j]));
  const D = Array.from({ length: n + 1 }, () => new Float64Array(m + 1));
  for (let i = 1; i <= n; i++) D[i][0] = i;
  for (let j = 1; j <= m; j++) D[0][j] = j;
  for (let i = 1; i <= n; i++)
    for (let j = 1; j <= m; j++) D[i][j] = Math.min(D[i - 1][j - 1] + sub(i - 1, j - 1), D[i - 1][j] + 1, D[i][j - 1] + 1);

  // Backtrace. On ties prefer a substitution, then an omission: matches how SLPs read alignments.
  const pairs: { ti: number | null; pi: number | null; cost: number }[] = [];
  let i = n;
  let j = m;
  const eps = 1e-9;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && Math.abs(D[i][j] - (D[i - 1][j - 1] + sub(i - 1, j - 1))) < eps) {
      pairs.push({ ti: i - 1, pi: j - 1, cost: sub(i - 1, j - 1) });
      i--;
      j--;
    } else if (i > 0 && Math.abs(D[i][j] - (D[i - 1][j] + 1)) < eps) {
      pairs.push({ ti: i - 1, pi: null, cost: 1 });
      i--;
    } else {
      pairs.push({ ti: null, pi: j - 1, cost: 1 });
      j--;
    }
  }
  return { pairs: pairs.reverse(), total: D[n][m] };
}

const dorsal = (s: Seg) => feat(s.feats, "hi") === 1 && feat(s.feats, "back") === 1 && feat(s.feats, "cor") !== 1;
const coronal = (s: Seg) => feat(s.feats, "cor") === 1;
const glottal = (s: Seg) => /^[ʔh]$/u.test(s.base);
const stop = (s: Seg) => feat(s.feats, "cont") === -1 && feat(s.feats, "son") === -1 && feat(s.feats, "delrel") !== 1;
const fricative = (s: Seg) => feat(s.feats, "cont") === 1 && feat(s.feats, "son") === -1;
const affricate = (s: Seg) => feat(s.feats, "delrel") === 1;
const liquid = (s: Seg) => feat(s.feats, "cons") === 1 && feat(s.feats, "son") === 1 && feat(s.feats, "nas") !== 1;
const glide = (s: Seg) => feat(s.feats, "syl") === -1 && feat(s.feats, "cons") === -1 && feat(s.feats, "son") === 1;

function substitutionProcesses(t: Seg, p: Seg): Process[] {
  if (!t.feats || !p.feats) return [];
  if (!isConsonant(t) && !isConsonant(p)) return ["vowel"];
  const out: Process[] = [];
  if (glottal(p) && !glottal(t)) out.push("glottal");
  if (dorsal(t) && coronal(p)) out.push("fronting");
  if (coronal(t) && dorsal(p)) out.push("backing");
  if ((fricative(t) || affricate(t)) && stop(p)) out.push("stopping");
  if (affricate(t) && fricative(p)) out.push("deaffrication");
  if (fricative(t) && affricate(p)) out.push("affrication");
  if (liquid(t) && glide(p)) out.push("gliding");
  if (feat(t.feats, "nas") === 1 && feat(p.feats, "nas") === -1) out.push("denasalization");
  if (feat(t.feats, "nas") === -1 && feat(p.feats, "nas") === 1 && isConsonant(t)) out.push("nasalization");
  if (feat(t.feats, "lat") !== 1 && feat(p.feats, "lat") === 1) out.push("lateralization");
  if (feat(t.feats, "voi") === 1 && feat(p.feats, "voi") === -1) out.push("devoicing");
  if (feat(t.feats, "voi") === -1 && feat(p.feats, "voi") === 1) out.push("voicing");
  return out;
}

function analyseOne(targetIpa: string, produced: Seg[], eq: Set<string>): Analysis {
  const T = segment(targetIpa);
  const { pairs } = align(T, produced, eq);
  let lastTi = -1;
  const addSeen = new Map<string, number>();
  const ops: Op[] = pairs.map(({ ti, pi, cost }) => {
    const t = ti === null ? null : T[ti];
    const p = pi === null ? null : produced[pi];
    let type: ErrorType;
    let suggested: Process[] = [];
    if (t && p) {
      if (cost === 0 || t.text === p.text) type = "C";
      else if (t.base === p.base || eq.has(pairKey(t.base, p.base))) type = "D";
      else {
        type = "S";
        suggested = substitutionProcesses(t, p);
      }
    } else if (t) {
      type = "O";
      if (isConsonant(t)) {
        const prev = ti! > 0 ? T[ti! - 1] : null;
        const next = ti! < T.length - 1 ? T[ti! + 1] : null;
        if (t.wordEnd) suggested.push("final");
        else if (t.wordStart) suggested.push("initial");
        if ((prev && !t.wordStart && isConsonant(prev)) || (next && !t.wordEnd && isConsonant(next))) suggested.push("cluster");
      }
    } else type = "A";
    if (ti !== null) lastTi = ti;
    // Additions are keyed by where they fall and what was added, so marks survive edits elsewhere.
    let key = `t${ti}`;
    if (ti === null) {
      const k = `a${lastTi}:${p!.text}`;
      const n = (addSeen.get(k) ?? 0) + 1;
      addSeen.set(k, n);
      key = `${k}:${n}`;
    }
    return { key, ti, pi, t, p, type, cost, suggested };
  });
  return { target: targetIpa, targetSegs: T, producedSegs: produced, ops, metrics: metricsOf(ops, T) };
}

export function metricsOf(ops: Pick<Op, "type" | "t" | "cost">[], T: Seg[]): Metrics {
  const counts: Record<ErrorType, number> = { C: 0, S: 0, O: 0, D: 0, A: 0 };
  let fer = 0;
  let cons = 0;
  let consOk = 0;
  for (const o of ops) {
    counts[o.type]++;
    fer += o.type === "C" ? 0 : o.cost;
    if (o.t && isConsonant(o.t)) {
      cons++;
      if (o.type === "C") consOk++;
    }
  }
  const n = Math.max(1, T.length);
  return {
    pcc: cons ? consOk / cons : null,
    per: (counts.S + counts.O + counts.A) / n,
    fer: fer / n,
    counts,
    targetPhones: T.length,
    targetConsonants: cons,
  };
}

/** Best-matching variant of the target (the SLP can list accepted pronunciations). */
export function compare(targetVariants: string[], producedIpa: string, equivalences: string[] = []): Analysis | null {
  const variants = targetVariants.map((v) => v.trim()).filter(Boolean);
  const produced = segment(producedIpa);
  if (!variants.length || !produced.length) return null;
  const eq = equivalenceSet(equivalences);
  let best: Analysis | null = null;
  for (const v of variants) {
    const a = analyseOne(v, produced, eq);
    if (!best || a.metrics.fer < best.metrics.fer) best = a;
  }
  return best;
}

// ---- SLP marks: their corrections and notes, layered over the automatic result ------------------

export type Mark = {
  key: string;
  tPhone?: string;
  pPhone?: string;
  type?: ErrorType; // SLP's classification, if they changed it
  tags: string[]; // process keys (accepted suggestions or chosen) and error label ids
  note?: string;
};

export type ReviewedOp = Op & { finalType: ErrorType; mark: Mark | null; tags: string[] };

/**
 * Applies marks to a fresh analysis. A mark re-attaches only if its phones still match, so a note
 * about ɡ→d never lands on a different sound after the IPA is edited; the rest come back as detached.
 */
export function applyMarks(a: Analysis, marks: Mark[] = []) {
  const byKey = new Map(marks.map((m) => [m.key, m]));
  const used = new Set<string>();
  const ops: ReviewedOp[] = a.ops.map((o) => {
    const m = byKey.get(o.key);
    const fits = m && (m.tPhone ?? "") === (o.t?.text ?? "") && (m.pPhone ?? "") === (o.p?.text ?? "");
    if (fits) used.add(m.key);
    const mark = fits ? m : null;
    return { ...o, mark, finalType: mark?.type ?? o.type, tags: mark ? mark.tags : [] };
  });
  const metrics = metricsOf(
    ops.map((o) => ({ type: o.finalType, t: o.t, cost: o.finalType === "C" ? 0 : o.cost })),
    a.targetSegs,
  );
  return { ops, metrics, detached: marks.filter((m) => !used.has(m.key) && (m.note || m.tags.length || m.type)) };
}

export const pct = (x: number | null) => (x === null ? "—" : `${Math.round(x * 100)}%`);
