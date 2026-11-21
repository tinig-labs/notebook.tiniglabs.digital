"use client";

import { useState } from "react";
import { Check, ChevronDown, Info, Plus, RotateCcw } from "lucide-react";
import type { ErrorType } from "@/lib/ipa/compare";

const STYLE: Record<ErrorType, { tile: string; badge: string }> = {
  C: { tile: "bg-card ring-1 ring-inset ring-border", badge: "" },
  S: { tile: "bg-[var(--soda-s-tint)] ring-1 ring-inset ring-[var(--soda-s)]/40", badge: "bg-[var(--soda-s)] text-white" },
  O: { tile: "bg-[var(--soda-o-tint)] outline-dashed outline-2 -outline-offset-2 outline-[var(--soda-o)]/60", badge: "bg-[var(--soda-o)] text-white" },
  D: { tile: "bg-[var(--soda-d-tint)] ring-1 ring-inset ring-[var(--soda-d)]/40", badge: "bg-[var(--soda-d)] text-white" },
  A: { tile: "bg-[var(--soda-a-tint)] ring-1 ring-inset ring-[var(--soda-a)]/40", badge: "bg-[var(--soda-a)] text-white" },
};

/** A static copy of a review tile, for the guide. */
function MiniTile({ t, p, type }: { t: string | null; p: string | null; type: ErrorType }) {
  return (
    <span className={`relative inline-flex w-10 shrink-0 flex-col rounded-tag text-center ${STYLE[type].tile}`} aria-hidden="true">
      <span className={`ipa block pt-1 text-base leading-6 ${t ? "text-text/70" : "text-transparent"}`}>{t ?? "·"}</span>
      <span className={`ipa block border-t border-dashed border-text/10 pb-1 text-base font-semibold leading-6 ${type === "C" ? "text-accent" : "text-text"}`}>
        {p ?? "–"}
      </span>
      {type !== "C" && (
        <span className={`absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full text-[0.5625rem] font-bold ${STYLE[type].badge}`}>{type}</span>
      )}
    </span>
  );
}

// Worked examples on "saging".
const TYPES: { type: ErrorType; t: string | null; p: string | null; name: string; text: string }[] = [
  { type: "S", t: "s", p: "t", name: "Substitution", text: "A different sound: /s/ said as [t]." },
  { type: "O", t: "ŋ", p: null, name: "Omission", text: "Left out: /ŋ/ not said." },
  { type: "D", t: "ɡ", p: "ɡ̤", name: "Distortion", text: "The right sound, produced differently: a breathy [ɡ̤]." },
  { type: "A", t: null, p: "h", name: "Addition", text: "An extra sound the patient added." },
];

const KEY = "notebook.reviewGuideSeen";
const seen = () => {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return true;
  }
};

/** How to read and edit the SODA tiles. Opens by itself the first time, then stays folded. */
export function ReviewGuide() {
  const [open, setOpen] = useState(() => typeof window !== "undefined" && !seen());
  const toggle = () => {
    if (open)
      try {
        localStorage.setItem(KEY, "1");
      } catch {}
    setOpen(!open);
  };

  return (
    <div className="rounded-panel bg-card ring-1 ring-inset ring-border">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 rounded-panel px-4 py-3 text-left text-sm font-semibold"
      >
        <span className="flex items-center gap-2">
          <Info size={16} className="text-accent" aria-hidden="true" /> How to read and edit
        </span>
        <ChevronDown size={16} className={`text-muted transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {open && (
        <div className="grid gap-6 border-t border-border px-4 pb-5 pt-4 text-sm md:grid-cols-2">
          <section aria-labelledby="guide-read" className="space-y-3">
            <h3 id="guide-read" className="font-semibold">
              Reading the tiles
            </h3>
            <div className="flex items-center gap-3">
              <MiniTile t="s" p="s" type="C" />
              <p className="text-muted">Top: the target. Bottom: what the patient said. A plain tile matched.</p>
            </div>
            <ul className="space-y-2.5">
              {TYPES.map((x) => (
                <li key={x.type} className="flex items-center gap-3">
                  <MiniTile t={x.t} p={x.p} type={x.type} />
                  <p className="text-muted">
                    <span className="font-semibold text-text">{x.name}.</span> {x.text}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="guide-edit" className="space-y-3">
            <h3 id="guide-edit" className="font-semibold">
              Correcting the patient&apos;s row
            </h3>
            <p className="text-muted">It starts as the model&apos;s draft. Make it match what you heard.</p>
            <ul className="space-y-3 text-muted">
              <li className="flex gap-3">
                <span className="ipa flex size-8 shrink-0 items-center justify-center rounded-tag bg-surface text-base font-semibold text-accent" aria-hidden="true">
                  t
                </span>
                <span>
                  <span className="font-semibold text-text">Tap a sound</span> to change it or mark it omitted. Add a process, label or note there too.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface text-accent" aria-hidden="true">
                  <Plus size={14} strokeWidth={3} />
                </span>
                <span>
                  <span className="font-semibold text-text">Tap + between sounds</span> to insert one the patient added.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface text-accent" aria-hidden="true">
                  <Check size={14} />
                </span>
                <span>
                  <span className="font-semibold text-text">Confirm as is</span> when the draft is already right.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface text-accent" aria-hidden="true">
                  <RotateCcw size={14} />
                </span>
                <span>
                  <span className="font-semibold text-text">Reset to model</span> undoes your edits.
                </span>
              </li>
            </ul>
            <p className="text-muted">Suggested processes show with a question mark until you confirm them.</p>
          </section>

          <section aria-labelledby="guide-scores" className="space-y-2 md:col-span-2">
            <h3 id="guide-scores" className="font-semibold">
              Scores
            </h3>
            <dl className="grid gap-2 sm:grid-cols-3">
              <div className="rounded-panel bg-surface/60 p-3">
                <dt className="font-semibold">PCC</dt>
                <dd className="text-muted">Consonants said correctly, out of all target consonants. Higher is better.</dd>
              </div>
              <div className="rounded-panel bg-surface/60 p-3">
                <dt className="font-semibold">PER</dt>
                <dd className="text-muted">Substitutions, omissions and additions per target sound. Lower is better.</dd>
              </div>
              <div className="rounded-panel bg-surface/60 p-3">
                <dt className="font-semibold">FER</dt>
                <dd className="text-muted">How far off the sounds were, by speech features, so near misses count less. Lower is better.</dd>
              </div>
            </dl>
          </section>
        </div>
      )}
    </div>
  );
}
