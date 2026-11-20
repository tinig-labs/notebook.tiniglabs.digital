import { applyMarks, compare, PROCESSES, type Process } from "./compare";
import type { Item, Recording, Target, Transcript } from "@/lib/local/types";

/** The patient's IPA: what the SLP reviewed, otherwise the model's draft (same rule as IpaReview). */
export function producedIpa(r: Recording, transcript: Transcript | null | undefined) {
  return r.ipaEdited?.trim() || transcript?.ipa?.trim() || null;
}

export function reviewRecording(
  r: Recording,
  opts: { transcript?: Transcript | null; target?: Target | null; equivalences?: string[] },
) {
  const targetIpa = r.targetIpa?.length ? r.targetIpa : opts.target?.ipa;
  const produced = producedIpa(r, opts.transcript);
  if (!targetIpa?.length || !produced) return null;
  const a = compare(targetIpa, produced, opts.equivalences);
  if (!a) return null;
  const rv = applyMarks(a, r.review?.marks);
  return { ...rv, target: a.target, produced };
}

/** Compact text for CSV: S:ɡ→d[Fronting]; O:ŋ */
export function errorSummary(ops: ReturnType<typeof applyMarks>["ops"], labelName: (id: string) => string | undefined) {
  return ops
    .filter((o) => o.finalType !== "C")
    .map((o) => {
      const tags = (o.mark ? o.tags : []).map((t) => (t in PROCESSES ? PROCESSES[t as Process] : labelName(t))).filter(Boolean);
      const pair = o.finalType === "O" ? o.t?.text : o.finalType === "A" ? `+${o.p?.text}` : `${o.t?.text}→${o.p?.text}`;
      return `${o.finalType}:${pair}${tags.length ? `[${tags.join(", ")}]` : ""}${o.mark?.note ? ` "${o.mark.note}"` : ""}`;
    })
    .join("; ");
}

export const equivalencesOf = (labels: Item<"label">[]) => labels.filter((l) => l.value.scope === "equiv").map((l) => l.value.name);
