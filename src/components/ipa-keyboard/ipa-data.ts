// Full IPA chart (IPA 2020 revision) as static data. Bundled with the page; never fetched.
// [symbol, name]. Combining marks are flagged so the UI can render them on a dotted circle.

export type IpaSymbol = { s: string; name: string; combining?: boolean };
export type IpaRow = { label: string; symbols: IpaSymbol[] };
export type IpaTab = { id: string; label: string; rows: IpaRow[] };

const sym = (list: [string, string][]): IpaSymbol[] =>
  list.map(([s, name]) => ({ s, name, combining: /^\p{M}+$/u.test(s) }));

export const IPA_TABS: IpaTab[] = [
  {
    id: "common",
    label: "Tagalog",
    rows: [
      {
        label: "Frequent",
        symbols: sym([
          ["ʔ", "glottal stop"], ["ŋ", "velar nasal"], ["ɾ", "alveolar tap"], ["ɐ", "near-open central vowel"],
          ["ɛ", "open-mid front unrounded vowel"], ["ɪ", "near-close front unrounded vowel"],
          ["ʊ", "near-close back rounded vowel"], ["ɔ", "open-mid back rounded vowel"],
          ["ʃ", "voiceless postalveolar fricative"], ["t͡ʃ", "voiceless postalveolar affricate"],
          ["d͡ʒ", "voiced postalveolar affricate"], ["ɲ", "palatal nasal"], ["j", "palatal approximant"],
          ["w", "labial-velar approximant"], ["ɡ", "voiced velar plosive"],
          ["ˈ", "primary stress"], ["ˌ", "secondary stress"], ["ː", "long"], [".", "syllable break"],
          ["̃", "nasalized"], ["̪", "dental"], ["̚", "no audible release"],
        ]),
      },
    ],
  },
  {
    id: "pulmonic",
    label: "Consonants",
    rows: [
      { label: "Plosive", symbols: sym([
        ["p", "voiceless bilabial plosive"], ["b", "voiced bilabial plosive"],
        ["t", "voiceless alveolar plosive"], ["d", "voiced alveolar plosive"],
        ["ʈ", "voiceless retroflex plosive"], ["ɖ", "voiced retroflex plosive"],
        ["c", "voiceless palatal plosive"], ["ɟ", "voiced palatal plosive"],
        ["k", "voiceless velar plosive"], ["ɡ", "voiced velar plosive"],
        ["q", "voiceless uvular plosive"], ["ɢ", "voiced uvular plosive"], ["ʔ", "glottal stop"],
      ]) },
      { label: "Nasal", symbols: sym([
        ["m", "bilabial nasal"], ["ɱ", "labiodental nasal"], ["n", "alveolar nasal"], ["ɳ", "retroflex nasal"],
        ["ɲ", "palatal nasal"], ["ŋ", "velar nasal"], ["ɴ", "uvular nasal"],
      ]) },
      { label: "Trill", symbols: sym([["ʙ", "bilabial trill"], ["r", "alveolar trill"], ["ʀ", "uvular trill"]]) },
      { label: "Tap / flap", symbols: sym([
        ["ⱱ", "labiodental flap"], ["ɾ", "alveolar tap"], ["ɽ", "retroflex flap"],
      ]) },
      { label: "Fricative", symbols: sym([
        ["ɸ", "voiceless bilabial fricative"], ["β", "voiced bilabial fricative"],
        ["f", "voiceless labiodental fricative"], ["v", "voiced labiodental fricative"],
        ["θ", "voiceless dental fricative"], ["ð", "voiced dental fricative"],
        ["s", "voiceless alveolar fricative"], ["z", "voiced alveolar fricative"],
        ["ʃ", "voiceless postalveolar fricative"], ["ʒ", "voiced postalveolar fricative"],
        ["ʂ", "voiceless retroflex fricative"], ["ʐ", "voiced retroflex fricative"],
        ["ç", "voiceless palatal fricative"], ["ʝ", "voiced palatal fricative"],
        ["x", "voiceless velar fricative"], ["ɣ", "voiced velar fricative"],
        ["χ", "voiceless uvular fricative"], ["ʁ", "voiced uvular fricative"],
        ["ħ", "voiceless pharyngeal fricative"], ["ʕ", "voiced pharyngeal fricative"],
        ["h", "voiceless glottal fricative"], ["ɦ", "voiced glottal fricative"],
      ]) },
      { label: "Lateral fricative", symbols: sym([
        ["ɬ", "voiceless alveolar lateral fricative"], ["ɮ", "voiced alveolar lateral fricative"],
      ]) },
      { label: "Approximant", symbols: sym([
        ["ʋ", "labiodental approximant"], ["ɹ", "alveolar approximant"], ["ɻ", "retroflex approximant"],
        ["j", "palatal approximant"], ["ɰ", "velar approximant"],
      ]) },
      { label: "Lateral approximant", symbols: sym([
        ["l", "alveolar lateral approximant"], ["ɭ", "retroflex lateral approximant"],
        ["ʎ", "palatal lateral approximant"], ["ʟ", "velar lateral approximant"],
      ]) },
    ],
  },
  {
    id: "nonpulmonic",
    label: "Non-pulmonic & other",
    rows: [
      { label: "Clicks", symbols: sym([
        ["ʘ", "bilabial click"], ["ǀ", "dental click"], ["ǃ", "postalveolar click"],
        ["ǂ", "palatoalveolar click"], ["ǁ", "alveolar lateral click"],
      ]) },
      { label: "Implosives", symbols: sym([
        ["ɓ", "bilabial implosive"], ["ɗ", "alveolar implosive"], ["ʄ", "palatal implosive"],
        ["ɠ", "velar implosive"], ["ʛ", "uvular implosive"],
      ]) },
      { label: "Ejectives", symbols: sym([
        ["ʼ", "ejective"], ["pʼ", "bilabial ejective"], ["tʼ", "alveolar ejective"],
        ["kʼ", "velar ejective"], ["sʼ", "alveolar fricative ejective"],
      ]) },
      { label: "Other symbols", symbols: sym([
        ["ʍ", "voiceless labial-velar fricative"], ["w", "voiced labial-velar approximant"],
        ["ɥ", "voiced labial-palatal approximant"], ["ʜ", "voiceless epiglottal fricative"],
        ["ʢ", "voiced epiglottal fricative"], ["ʡ", "epiglottal plosive"],
        ["ɕ", "voiceless alveolo-palatal fricative"], ["ʑ", "voiced alveolo-palatal fricative"],
        ["ɺ", "alveolar lateral flap"], ["ɧ", "simultaneous ʃ and x"],
        ["͡", "tie bar above (affricates, double articulation)"], ["͜", "tie bar below"],
      ]) },
    ],
  },
  {
    id: "vowels",
    label: "Vowels",
    rows: [
      { label: "Close", symbols: sym([
        ["i", "close front unrounded"], ["y", "close front rounded"], ["ɨ", "close central unrounded"],
        ["ʉ", "close central rounded"], ["ɯ", "close back unrounded"], ["u", "close back rounded"],
      ]) },
      { label: "Near-close", symbols: sym([
        ["ɪ", "near-close front unrounded"], ["ʏ", "near-close front rounded"], ["ʊ", "near-close back rounded"],
      ]) },
      { label: "Close-mid", symbols: sym([
        ["e", "close-mid front unrounded"], ["ø", "close-mid front rounded"], ["ɘ", "close-mid central unrounded"],
        ["ɵ", "close-mid central rounded"], ["ɤ", "close-mid back unrounded"], ["o", "close-mid back rounded"],
      ]) },
      { label: "Mid", symbols: sym([["ə", "mid central (schwa)"], ["ɚ", "r-coloured schwa"]]) },
      { label: "Open-mid", symbols: sym([
        ["ɛ", "open-mid front unrounded"], ["œ", "open-mid front rounded"], ["ɜ", "open-mid central unrounded"],
        ["ɞ", "open-mid central rounded"], ["ʌ", "open-mid back unrounded"], ["ɔ", "open-mid back rounded"],
        ["ɝ", "r-coloured open-mid central"],
      ]) },
      { label: "Near-open", symbols: sym([["æ", "near-open front unrounded"], ["ɐ", "near-open central"]]) },
      { label: "Open", symbols: sym([
        ["a", "open front unrounded"], ["ɶ", "open front rounded"], ["ɑ", "open back unrounded"],
        ["ɒ", "open back rounded"],
      ]) },
    ],
  },
  {
    id: "diacritics",
    label: "Diacritics",
    rows: [
      { label: "Phonation", symbols: sym([
        ["̥", "voiceless"], ["̊", "voiceless (above)"], ["̬", "voiced"], ["ʰ", "aspirated"],
        ["̤", "breathy voiced"], ["̰", "creaky voiced"],
      ]) },
      { label: "Articulation", symbols: sym([
        ["̪", "dental"], ["̼", "linguolabial"], ["̺", "apical"], ["̻", "laminal"],
        ["̟", "advanced"], ["̠", "retracted"], ["̈", "centralized"], ["̽", "mid-centralized"],
        ["̝", "raised"], ["̞", "lowered"], ["̘", "advanced tongue root"],
        ["̙", "retracted tongue root"],
      ]) },
      { label: "Rounding", symbols: sym([["̹", "more rounded"], ["̜", "less rounded"]]) },
      { label: "Secondary", symbols: sym([
        ["ʷ", "labialized"], ["ʲ", "palatalized"], ["ˠ", "velarized"], ["ˤ", "pharyngealized"],
        ["̴", "velarized or pharyngealized"], ["̃", "nasalized"], ["˞", "rhoticity"],
      ]) },
      { label: "Release", symbols: sym([
        ["ⁿ", "nasal release"], ["ˡ", "lateral release"], ["̚", "no audible release"],
      ]) },
      { label: "Syllabicity", symbols: sym([
        ["̩", "syllabic"], ["̍", "syllabic (above)"], ["̯", "non-syllabic"],
      ]) },
    ],
  },
  {
    id: "supra",
    label: "Suprasegmentals & tone",
    rows: [
      { label: "Stress & length", symbols: sym([
        ["ˈ", "primary stress"], ["ˌ", "secondary stress"], ["ː", "long"], ["ˑ", "half-long"],
        ["̆", "extra-short"],
      ]) },
      { label: "Boundaries", symbols: sym([
        [".", "syllable break"], ["|", "minor (foot) group"], ["‖", "major (intonation) group"],
        ["‿", "linking (absence of a break)"],
      ]) },
      { label: "Level tones", symbols: sym([
        ["̋", "extra high"], ["́", "high"], ["̄", "mid"], ["̀", "low"], ["̏", "extra low"],
        ["˥", "extra high (letter)"], ["˦", "high (letter)"], ["˧", "mid (letter)"], ["˨", "low (letter)"],
        ["˩", "extra low (letter)"],
      ]) },
      { label: "Contour tones", symbols: sym([
        ["̌", "rising"], ["̂", "falling"], ["᷄", "high rising"], ["᷅", "low rising"],
        ["᷈", "rising-falling"],
      ]) },
      { label: "Pitch", symbols: sym([
        ["ꜜ", "downstep"], ["ꜛ", "upstep"], ["↗", "global rise"], ["↘", "global fall"],
      ]) },
    ],
  },
];
