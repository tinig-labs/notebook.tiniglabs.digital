import { describe, expect, it } from "vitest";
import { compare } from "@/lib/ipa/compare";
import { editProduced, remapMarks } from "@/lib/ipa/edit";

const ops = (target: string, produced: string) => compare([target], produced)!.ops;
const key = (o: ReturnType<typeof ops>, t: string) => o.find((x) => x.t?.text === t)!.key;

describe("editing the produced row", () => {
  it("rebuilds the row as text, with word spaces from the target", () => {
    expect(editProduced(ops("baɡaj na baɡaj", "baɡajnabaɡaj"))).toBe("baɡaj na baɡaj");
  });

  it("replaces one sound", () => {
    const o = ops("saɡiŋ", "saɡ̤iŋ");
    expect(editProduced(o, { kind: "replace", key: key(o, "ɡ"), text: "ɡ" })).toBe("saɡiŋ");
    expect(compare(["saɡiŋ"], editProduced(o, { kind: "replace", key: key(o, "ɡ"), text: "ɡ" }))!.ops.every((x) => x.type === "C")).toBe(true);
  });

  it("omits a sound, which then aligns as an omission", () => {
    const o = ops("saɡiŋ", "saɡiŋ");
    const next = editProduced(o, { kind: "omit", key: key(o, "ŋ") });
    expect(next).toBe("saɡi");
    expect(compare(["saɡiŋ"], next)!.ops.filter((x) => x.type !== "C").map((x) => x.type)).toEqual(["O"]);
  });

  it("keeps the word space when the first sound of a word is omitted", () => {
    const o = ops("baɡaj na baɡaj", "baɡajnabaɡaj");
    const n = o.find((x) => x.t?.text === "n")!;
    expect(editProduced(o, { kind: "omit", key: n.key })).toBe("baɡaj a baɡaj");
  });

  it("inserts a sound at a gap, which aligns as an addition", () => {
    const o = ops("isda", "isda");
    const next = editProduced(o, { kind: "insert", at: 2, text: "a" });
    expect(next).toBe("isada");
    expect(compare(["isda"], next)!.ops.filter((x) => x.type === "A").map((x) => x.p?.text)).toEqual(["a"]);
    expect(editProduced(o, { kind: "insert", at: o.length, text: "h" })).toBe("isdah");
  });

  it("removes an added sound", () => {
    const o = ops("isda", "isada");
    const add = o.find((x) => x.type === "A")!;
    expect(editProduced(o, { kind: "removeAdded", key: add.key })).toBe("isda");
  });

  it("moves an SLP note to the edited sound and drops a stale type override", () => {
    const o = ops("saɡiŋ", "taɡiŋ");
    const k = key(o, "s");
    const marks = remapMarks([{ key: k, tPhone: "s", pPhone: "t", type: "D", tags: ["stopping"], note: "n" }], { kind: "replace", key: k, text: "θ" });
    expect(marks[0]).toMatchObject({ key: k, pPhone: "θ", type: undefined, tags: ["stopping"], note: "n" });
  });
});
