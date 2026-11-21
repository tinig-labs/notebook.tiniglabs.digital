"use client";

import { useId, useMemo, useState } from "react";
import { BookOpen, Plus, X } from "lucide-react";
import { Card, Input } from "./ui";
import { TargetForm } from "./target-form";
import { getItem, useItems } from "@/lib/local/store";
import type { Target } from "@/lib/local/types";

export type PickedTarget = { id?: string; text: string; ipa?: string[] };

/**
 * Searchable list over the SLP's library (accessible combobox). Free text still works; it just
 * can't be compared with IPA. "Add to library" creates the entry inline.
 */
export function TargetPicker({ value, onChange, disabled }: { value: PickedTarget; onChange: (v: PickedTarget) => void; disabled?: boolean }) {
  const targets = useItems("target");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [adding, setAdding] = useState(false);
  const listId = useId();

  const q = value.text.trim().toLowerCase();
  const matches = useMemo(
    () =>
      targets
        .filter((t) => !q || t.value.text.toLowerCase().includes(q) || t.value.sets.some((s) => s.toLowerCase().includes(q)))
        .sort((a, b) => {
          const as = a.value.text.toLowerCase().startsWith(q) ? 0 : 1;
          const bs = b.value.text.toLowerCase().startsWith(q) ? 0 : 1;
          return as - bs || a.value.text.localeCompare(b.value.text);
        })
        .slice(0, 8),
    [targets, q],
  );
  const exact = targets.find((t) => t.value.text.toLowerCase() === q);

  const pick = (t: { id: string; value: Target }) => {
    onChange({ id: t.id, text: t.value.text, ipa: t.value.ipa });
    setOpen(false);
  };

  return (
    <div className="relative space-y-2">
      <div className="relative">
        <BookOpen size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
        <Input
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-label="Target"
          value={value.text}
          disabled={disabled}
          placeholder="Pick from your library or type"
          className="pl-11 pr-11"
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onChange={(e) => {
            onChange({ text: e.target.value });
            setOpen(true);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (!open) return;
            if (e.key === "ArrowDown") setActive((a) => Math.min(a + 1, matches.length - 1));
            else if (e.key === "ArrowUp") setActive((a) => Math.max(a - 1, 0));
            else if (e.key === "Enter" && matches[active]) pick(matches[active]);
            else if (e.key === "Escape") setOpen(false);
            else return;
            e.preventDefault();
          }}
        />
        {value.text && !disabled && (
          <button
            type="button"
            aria-label="Clear target"
            onClick={() => onChange({ text: "" })}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted hover:bg-surface"
          >
            <X size={16} aria-hidden="true" />
          </button>
        )}
      </div>

      {open && (matches.length > 0 || (q && !exact)) && (
        <ul id={listId} role="listbox" className="absolute inset-x-0 top-[3.25rem] z-20 max-h-72 overflow-auto rounded-panel bg-card p-1.5 shadow-lg ring-1 ring-border">
          {matches.map((t, i) => (
            <li
              key={t.id}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(t);
              }}
              className={`flex cursor-pointer items-baseline justify-between gap-3 rounded-panel px-3 py-2 ${i === active ? "bg-surface" : ""}`}
            >
              <span className="truncate font-medium">{t.value.text}</span>
              <span className="ipa shrink-0 text-sm text-accent">{t.value.ipa[0]}</span>
            </li>
          ))}
          {q && !exact && (
            <li
              role="option"
              aria-selected={false}
              onMouseDown={(e) => {
                e.preventDefault();
                setAdding(true);
                setOpen(false);
              }}
              className="flex cursor-pointer items-center gap-2 rounded-panel px-3 py-2 font-semibold text-accent hover:bg-surface"
            >
              <Plus size={16} aria-hidden="true" /> Add “{value.text.trim()}” to library
            </li>
          )}
        </ul>
      )}

      {value.id && value.ipa?.[0] && (
        // On wide screens the flashcard beside it already shows this.
        <p className="text-sm text-muted lg:hidden">
          Ideal: <span className="ipa text-base text-accent">{value.ipa[0]}</span>
          {value.ipa.length > 1 && ` (+${value.ipa.length - 1} accepted)`}
        </p>
      )}
      {!value.id && value.text.trim() && !adding && <p className="text-xs text-muted">Not in your library, so it won&apos;t be compared with IPA.</p>}

      {adding && (
        <Card className="ring-1 ring-inset ring-border">
          <TargetForm
            compact
            initial={{ text: value.text.trim(), type: value.text.trim().includes(" ") ? "phrase" : "word" }}
            onDone={(id) => {
              setAdding(false);
              const t = getItem(id);
              if (t?.kind === "target") onChange({ id, text: (t.value as Target).text, ipa: (t.value as Target).ipa });
            }}
            onCancel={() => setAdding(false)}
          />
        </Card>
      )}
    </div>
  );
}
