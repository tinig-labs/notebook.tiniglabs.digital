import type { Mark, Op } from "./compare";

/**
 * Editing the produced (bottom) row sound by sound. Edits act on the aligned ops, then the produced
 * IPA is rebuilt as text. A space goes before the first produced phone of each target word, so the
 * stored IPA stays readable ("taɡiŋ na …") even though the model writes none.
 */
export type ProducedEdit =
  | { kind: "replace"; key: string; text: string } // change one produced sound (empty = omit)
  | { kind: "omit"; key: string }
  | { kind: "insert"; at: number; text: string } // before op index `at` (ops.length = at the end)
  | { kind: "removeAdded"; key: string };

type OpLike = Pick<Op, "t" | "p" | "key">;

/** New produced IPA after one edit (pass no edit to get the current row as text). */
export function editProduced(ops: OpLike[], edit?: ProducedEdit): string {
  let out = "";
  let spacePending = false;
  const emit = (text: string) => {
    const t = text.trim();
    if (!t) return;
    out += (out && spacePending ? " " : "") + t;
    spacePending = false;
  };
  ops.forEach((o, i) => {
    if (i > 0 && o.t?.wordStart) spacePending = true;
    if (edit?.kind === "insert" && edit.at === i) emit(edit.text);
    const hit = edit && "key" in edit && edit.key === o.key;
    emit(hit ? (edit.kind === "replace" ? edit.text : "") : (o.p?.text ?? ""));
  });
  if (edit?.kind === "insert" && edit.at >= ops.length) emit(edit.text);
  return out;
}

/**
 * Keeps an SLP's note and tags on a sound whose produced phone they just changed: same target
 * position, new phone. A manual type override is dropped, since the new sound is classified afresh.
 */
export function remapMarks(marks: Mark[], edit: ProducedEdit): Mark[] {
  if (edit.kind === "insert") return marks;
  if (edit.kind === "removeAdded") return marks.filter((m) => m.key !== edit.key);
  const text = edit.kind === "replace" ? edit.text.trim() : "";
  return marks.map((m) => (m.key === edit.key ? { ...m, pPhone: text || undefined, type: undefined } : m));
}
