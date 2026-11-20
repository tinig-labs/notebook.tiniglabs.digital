"""
Exports panphon's segment features and weights for the on-device IPA engine (src/lib/ipa).
panphon is MIT-licensed (David R. Mortensen et al.). Re-run after upgrading panphon:

    python -m venv .venv-ipa && .venv-ipa/Scripts/pip install panphon==0.22.2
    .venv-ipa/Scripts/python scripts/make-ipa-features.py

Writes src/lib/ipa/features.json and tests/ipa/fixtures.json (reference distances from real panphon).
"""
import csv, json, os, unicodedata
import panphon, panphon.distance

DATA = os.path.join(os.path.dirname(panphon.__file__), "data")
# Use the weights exactly as panphon applies them (it pairs feature_weights.csv with its own feature
# order by position, so e.g. velaric gets 0.25 and tense 0.125), so distances match panphon.
_fm = panphon.distance.Distance().fm
NAMES, WEIGHTS = list(_fm.names), [float(w) for w in _fm.weights]

segments = {}
with open(os.path.join(DATA, "ipa_all.csv"), encoding="utf-8") as f:
    for r in csv.DictReader(f):
        ipa = unicodedata.normalize("NFD", r["ipa"])
        segments[ipa] = "".join(r[n] for n in NAMES)  # one char per feature: + - 0

out = {"source": "panphon 0.22.2 (MIT)", "names": NAMES, "weights": WEIGHTS, "segments": segments}
with open("src/lib/ipa/features.json", "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, separators=(",", ":"))

# Reference values from panphon itself, to test the TypeScript port against.
dst = panphon.distance.Distance()
ft = panphon.FeatureTable()
phones = ["p", "b", "t", "d", "k", "ɡ", "ʔ", "m", "n", "ŋ", "s", "ʃ", "h", "l", "ɾ", "r", "w", "j", "a", "e", "i", "o", "u",
          "f", "v", "z", "t͡ʃ", "d͡ʒ", "ɲ", "θ", "ð", "x", "ç", "ə", "ɛ", "ɔ", "ʊ", "ɪ", "pʰ", "tʰ", "kʰ", "aː"]
pairs = [[a, b, dst.weighted_substitution_cost(ft.word_to_vector_list(a, numeric=True)[0], ft.word_to_vector_list(b, numeric=True)[0])]
         for a in phones for b in phones]
words = [["saɡiŋ", "taɡiŋ"], ["saɡiŋ", "saiŋ"], ["baɡaj", "badaj"], ["kamaj", "kamay"], ["ɾosas", "losas"],
         ["baɡajnabaɡaj", "baɡainabaɡai"], ["tubiɡ", "tubi"], ["isda", "ista"]]
fixtures = {
    "pairs": pairs,
    "segs": {w: ft.ipa_segs(w) for w in ["baɡajnabaɡajpokajumaɡkasama", "t͡ʃokolate", "kʰat", "aːmaŋ", "ɲoɲo"]},
    "words": [[a, b, dst.weighted_feature_edit_distance(a, b)] for a, b in words],
}
with open("tests/ipa/fixtures.json", "w", encoding="utf-8") as f:
    json.dump(fixtures, f, ensure_ascii=False, indent=1)
print(len(segments), "segments,", len(pairs), "pairs, sum(weights) =", sum(WEIGHTS))
