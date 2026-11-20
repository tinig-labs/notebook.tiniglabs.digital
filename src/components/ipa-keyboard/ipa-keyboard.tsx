"use client";

import { useState, type RefObject } from "react";
import { IPA_TABS, type IpaSymbol } from "./ipa-data";

type Props = {
  value: string;
  onChange: (v: string) => void;
  targetRef: RefObject<HTMLTextAreaElement | HTMLInputElement | null>;
};

/** On-screen IPA keyboard. Inserts at the caret of `targetRef`; never steals focus. */
export function IpaKeyboard({ value, onChange, targetRef }: Props) {
  const [tab, setTab] = useState(IPA_TABS[0].id);
  const [hover, setHover] = useState<IpaSymbol | null>(null);
  const active = IPA_TABS.find((t) => t.id === tab)!;

  function edit(fn: (before: string, after: string) => [string, string]) {
    const el = targetRef.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const [b, a] = fn(value.slice(0, start), value.slice(end));
    onChange(b + a);
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      el.setSelectionRange(b.length, b.length);
    });
  }

  const insert = (s: string) => edit((b, a) => [b + s, a]);
  const backspace = () =>
    edit((b, a) => {
      // Delete a whole grapheme (base + combining marks) at once.
      const seg = [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(b)];
      const last = seg.at(-1);
      return [last ? b.slice(0, last.index) : b, a];
    });

  return (
    <div className="overflow-hidden rounded-2xl bg-[var(--gatas)] ring-1 ring-inset ring-border" onMouseDown={(e) => e.preventDefault()}>
      <div role="tablist" aria-label="IPA symbol groups" className="flex gap-1 overflow-x-auto border-b border-border p-2">
        {IPA_TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={t.id === tab}
            onClick={() => setTab(t.id)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
              t.id === tab ? "bg-surface text-text" : "text-text/60 hover:bg-surface hover:text-text"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="max-h-[min(20rem,45svh)] space-y-3 overflow-y-auto overscroll-contain p-3" role="tabpanel">
        {active.rows.map((row) => (
          <div key={row.label} className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:gap-3">
            <div className="shrink-0 text-xs text-muted sm:w-36 sm:pt-2">{row.label}</div>
            <div className="flex flex-wrap gap-1">
              {row.symbols.map((sy) => (
                <button
                  key={row.label + sy.s}
                  type="button"
                  title={sy.name}
                  aria-label={sy.name}
                  onClick={() => {
                    insert(sy.s);
                    setHover(sy); // touch has no hover: show the name of what was just tapped
                  }}
                  onMouseEnter={() => setHover(sy)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(sy)}
                  className="ipa h-11 min-w-11 rounded-xl bg-card px-2 text-lg leading-none ring-1 ring-inset ring-border transition-colors hover:bg-surface hover:ring-accent/40 active:translate-y-px"
                >
                  {sy.combining ? `◌${sy.s}` : sy.s}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 border-t border-border p-2">
        <span className="min-w-0 flex-1 truncate px-1 text-xs text-muted" aria-live="polite">
          {hover ? (
            <>
              <span className="ipa mr-1.5 text-sm text-text">{hover.combining ? `◌${hover.s}` : hover.s}</span>
              {hover.name} · U+{[...hover.s].map((c) => c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")).join(" U+")}
            </>
          ) : (
            "Diacritics attach to the preceding symbol."
          )}
        </span>
        <button type="button" onClick={() => insert(" ")} className="h-10 w-24 rounded-xl bg-card text-xs font-medium text-muted ring-1 ring-inset ring-border hover:bg-surface">
          space
        </button>
        <button type="button" onClick={backspace} aria-label="Backspace" className="h-10 w-12 rounded-xl bg-card ring-1 ring-inset ring-border hover:bg-surface">
          ⌫
        </button>
      </div>
    </div>
  );
}
