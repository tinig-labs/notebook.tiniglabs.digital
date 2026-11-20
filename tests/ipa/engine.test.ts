import { describe, expect, it } from "vitest";
import fixtures from "./fixtures.json";
import { distance, segment, WEIGHT_SUM } from "@/lib/ipa/segment";
import { applyMarks, compare } from "@/lib/ipa/compare";
import { suggestTagalogIpa } from "@/lib/ipa/g2p-tl";

const one = (s: string) => segment(s)[0];

describe("panphon port", () => {
  it("matches panphon's weighted substitution cost for every phone pair", () => {
    for (const [a, b, cost] of fixtures.pairs as [string, string, number][]) {
      expect(distance(one(a), one(b)) * WEIGHT_SUM, `${a}→${b}`).toBeCloseTo(cost, 6);
    }
  });

  it("segments like panphon's ipa_segs", () => {
    for (const [w, segs] of Object.entries(fixtures.segs)) expect(segment(w).map((s) => s.text.normalize("NFC")), w).toEqual(segs);
  });

  it("ignores stress, syllable marks, slashes and spaces for matching", () => {
    expect(segment("/ˈsa.ɡiŋ/").map((s) => s.text)).toEqual(["s", "a", "ɡ", "i", "ŋ"]);
    expect(segment("saging").map((s) => s.text)).toEqual(["s", "a", "ɡ", "i", "n", "ɡ"]); // ASCII g → ɡ
  });
});

describe("SODA classification", () => {
  it("flags a substitution and suggests stopping", () => {
    const a = compare(["saɡiŋ"], "taɡiŋ")!;
    const errs = a.ops.filter((o) => o.type !== "C");
    expect(errs.map((o) => [o.type, o.t?.text, o.p?.text])).toEqual([["S", "s", "t"]]);
    expect(errs[0].suggested).toContain("stopping");
    expect(a.metrics.pcc).toBeCloseTo(2 / 3);
  });

  it("flags fronting of a velar", () => {
    const e = compare(["baɡaj"], "badaj")!.ops.find((o) => o.type === "S")!;
    expect([e.t?.text, e.p?.text]).toEqual(["ɡ", "d"]);
    expect(e.suggested).toContain("fronting");
  });

  it("flags an omitted final consonant", () => {
    const e = compare(["tubiɡ"], "tubi")!.ops.filter((o) => o.type !== "C");
    expect(e.map((o) => o.type)).toEqual(["O"]);
    expect(e[0].suggested).toContain("final");
  });

  it("flags an addition", () => {
    const e = compare(["isda"], "isada")!.ops.filter((o) => o.type !== "C");
    expect(e.map((o) => [o.type, o.p?.text])).toEqual([["A", "a"]]);
  });

  it("treats diacritic-only differences as distortion and ɾ/r, i/j as the same", () => {
    expect(compare(["sapa"], "s̪apa")!.ops[0].type).toBe("D");
    expect(compare(["ɾosas"], "rosas")!.ops.every((o) => o.type === "C")).toBe(true);
    expect(compare(["baɡaj na baɡaj"], "baɡainabaɡai")!.ops.every((o) => o.type === "C")).toBe(true);
  });

  it("aligns a whole sentence against unspaced model output", () => {
    const a = compare(["baɡaj na baɡaj po kajoŋ maɡkasama"], "baɡajnabaɡajpokajumaɡkasama")!;
    const errs = a.ops.filter((o) => o.type !== "C").map((o) => `${o.type}:${o.t?.text ?? ""}>${o.p?.text ?? ""}`);
    expect(errs).toEqual(["S:o>u", "O:ŋ>"]);
  });

  it("accepts SLP pairs with diacritics, like ɡ=ɡ̤", () => {
    expect(compare(["saɡiŋ"], "saɡ̤iŋ")!.ops[2].type).toBe("D");
    expect(compare(["saɡiŋ"], "saɡ̤iŋ", ["ɡ=ɡ̤"])!.ops.every((o) => o.type === "C")).toBe(true);
  });

  it("picks the closest accepted variant", () => {
    expect(compare(["kamaj", "kamaʔ"], "kamaʔ")!.target).toBe("kamaʔ");
  });

  it("keeps SLP marks only where the phones still match", () => {
    const a = compare(["saɡiŋ"], "taɡiŋ")!;
    const r = applyMarks(a, [
      { key: "t0", tPhone: "s", pPhone: "t", type: "D", tags: ["stopping"], note: "dentalised" },
      { key: "t2", tPhone: "ɡ", pPhone: "k", tags: [], note: "stale" },
    ]);
    expect(r.ops[0].finalType).toBe("D");
    expect(r.metrics.counts.S).toBe(0);
    expect(r.detached.map((m) => m.note)).toEqual(["stale"]);
  });
});

describe("Tagalog spelling suggestions", () => {
  it.each([
    ["saging", "saɡiŋ"],
    ["mga bata", "maŋa bata"],
    ["tsinelas", "t͡ʃinelas"],
    ["nanay", "nanaj"],
    ["mag-aral", "maɡʔaɾal"],
  ])("%s → %s", (w, ipa) => expect(suggestTagalogIpa(w)).toBe(ipa));
});
