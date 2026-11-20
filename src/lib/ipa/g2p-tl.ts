/**
 * Tagalog spelling → broad IPA draft. Mapping ported from epitran's tgl-Latn (MIT, Mortensen et al.),
 * plus common Filipino spellings (mga, ng as a word, -iy-/-uw- glides). Stress and glottal stops
 * aren't written in standard spelling, so the SLP confirms or edits every suggestion.
 */
const MAP: [string, string][] = [
  ["ng", "ŋ"],
  ["ny", "ɲ"],
  ["ch", "t͡ʃ"],
  ["ts", "t͡ʃ"],
  ["sy", "ʃ"],
  ["dy", "d͡ʒ"],
  ["ñ", "ɲ"],
  ["ë", "ə"],
  ["a", "a"],
  ["b", "b"],
  ["c", "k"],
  ["d", "d"],
  ["e", "e"],
  ["f", "f"],
  ["g", "ɡ"],
  ["h", "h"],
  ["i", "i"],
  ["j", "d͡ʒ"],
  ["k", "k"],
  ["l", "l"],
  ["m", "m"],
  ["n", "n"],
  ["o", "o"],
  ["p", "p"],
  ["q", "k"],
  ["r", "ɾ"],
  ["s", "s"],
  ["t", "t"],
  ["u", "u"],
  ["v", "v"],
  ["w", "w"],
  ["x", "ks"],
  ["y", "j"],
  ["z", "z"],
];

const WORDS: Record<string, string> = { mga: "maŋa", ng: "naŋ" };

export function suggestTagalogIpa(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFC")
    .replace(/[^\p{L}\s'-]/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => {
      if (WORDS[w]) return WORDS[w];
      let out = "";
      let i = 0;
      const s = w.replace(/['-]/g, "ʔ"); // a written hyphen or apostrophe is a glottal stop: mag-aral
      while (i < s.length) {
        if (s[i] === "ʔ") {
          out += "ʔ";
          i++;
          continue;
        }
        const hit = MAP.find(([o]) => s.startsWith(o, i));
        if (!hit) {
          i++;
          continue;
        }
        out += hit[1];
        i += hit[0].length;
      }
      return out;
    })
    .join(" ");
}

/** Only offer the suggestion for text that looks Tagalog-spellable (no English digraphs like th, sh). */
export const looksTagalog = (text: string) => !!text.trim() && !/(th|sh|ph|ee|oo|ou|ea|ck|wh|[qxcfvz]{2})/i.test(text);
