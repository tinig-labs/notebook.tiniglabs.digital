"use client";

import { useState } from "react";
import { Check, Equal, Pencil, Plus, Tags, Trash2, TriangleAlert } from "lucide-react";
import { Button, EmptyState, IconButton, Input, Segmented } from "@/components/ui";
import { LabelPill, useLabels } from "@/components/notebook";
import { newId, put, remove, useItems } from "@/lib/local/store";
import { LABEL_COLORS, LABEL_STYLES, type LabelColor } from "@/lib/local/types";
import { DEFAULT_EQUIVALENCES } from "@/lib/ipa/compare";

const SUGGESTED = {
  recording: ["Baseline", "Word", "Sentence", "Spontaneous", "Home practice"],
  error: ["Inconsistent", "Stimulable", "Nasal emission", "Weak pressure"],
};

export function ColorPicker({ value, onChange }: { value: LabelColor; onChange: (c: LabelColor) => void }) {
  return (
    <div className="flex gap-1.5" role="radiogroup" aria-label="Colour">
      {LABEL_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={value === c}
          aria-label={c}
          onClick={() => onChange(c)}
          className={`size-8 rounded-full ${LABEL_STYLES[c].dot} ring-offset-2 ${value === c ? "ring-2 ring-text" : ""}`}
        />
      ))}
    </div>
  );
}

function LabelList({ scope }: { scope: "recording" | "error" }) {
  const labels = useLabels(scope);
  const recordings = useItems("recording");
  const [name, setName] = useState("");
  const [color, setColor] = useState<LabelColor>(scope === "error" ? "rose" : "pandan");
  const [edit, setEdit] = useState<{ id: string; name: string; color: LabelColor } | null>(null);

  const count = (id: string) =>
    scope === "recording"
      ? recordings.filter((r) => r.value.labelIds.includes(id)).length
      : recordings.reduce((n, r) => n + (r.value.review?.marks.filter((m) => m.tags.includes(id)).length ?? 0), 0);
  const exists = (n: string) => labels.some((l) => l.value.name.toLowerCase() === n.trim().toLowerCase());

  async function add(n = name, c = color) {
    if (!n.trim() || exists(n)) return;
    await put("label", newId(), { name: n.trim().slice(0, 40), color: c, scope });
    setName("");
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void add();
        }}
        className="space-y-3 rounded-[28px] bg-card p-6 ring-1 ring-inset ring-border"
      >
        <div className="flex gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={scope === "error" ? "e.g. Nasal emission" : "e.g. /s/ initial, Week 3"}
            maxLength={40}
            aria-label="New label"
          />
          <Button type="submit" disabled={!name.trim() || exists(name)} className="h-12">
            <Plus size={18} aria-hidden="true" /> Add
          </Button>
        </div>
        <ColorPicker value={color} onChange={setColor} />
      </form>

      {labels.length === 0 ? (
        <EmptyState icon={scope === "error" ? <TriangleAlert aria-hidden="true" /> : <Tags aria-hidden="true" />} title="No labels yet">
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            {SUGGESTED[scope].map((s, i) => (
              <Button key={s} variant="secondary" onClick={() => void add(s, LABEL_COLORS[(i + (scope === "error" ? 3 : 0)) % LABEL_COLORS.length])}>
                <Plus size={14} aria-hidden="true" /> {s}
              </Button>
            ))}
          </div>
        </EmptyState>
      ) : (
        <ul className="divide-y divide-border rounded-[28px] bg-card ring-1 ring-inset ring-border">
          {labels.map((l) =>
            edit?.id === l.id ? (
              <li key={l.id} className="space-y-3 p-4">
                <Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} maxLength={40} aria-label="Label name" autoFocus />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <ColorPicker value={edit.color} onChange={(c) => setEdit({ ...edit, color: c })} />
                  <Button
                    onClick={async () => {
                      if (edit.name.trim()) await put("label", l.id, { name: edit.name.trim(), color: edit.color, scope });
                      setEdit(null);
                    }}
                  >
                    <Check size={16} aria-hidden="true" /> Done
                  </Button>
                </div>
              </li>
            ) : (
              <li key={l.id} className="flex items-center gap-3 px-4 py-3">
                <LabelPill label={l} />
                <span className="flex-1 text-sm text-muted">
                  {count(l.id)} {scope === "error" ? "errors" : "recordings"}
                </span>
                <IconButton label={`Edit ${l.value.name}`} onClick={() => setEdit({ id: l.id, name: l.value.name, color: l.value.color })}>
                  <Pencil size={16} />
                </IconButton>
                <IconButton
                  label={`Delete ${l.value.name}`}
                  className="text-danger"
                  onClick={async () => {
                    if (confirm(`Delete label "${l.value.name}"?`)) await remove(l.id);
                  }}
                >
                  <Trash2 size={16} />
                </IconButton>
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  );
}

/** Sound pairs counted as correct when comparing IPA (e.g. a regional r). */
function Equivalences() {
  const custom = useLabels("equiv");
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  return (
    <div className="space-y-3 rounded-[28px] bg-card p-6 ring-1 ring-inset ring-border">
      <p className="text-sm text-muted">Counted as correct when comparing IPA.</p>
      <ul className="flex flex-wrap gap-2">
        {DEFAULT_EQUIVALENCES.map(([x, y]) => (
          <li key={x + y} className="ipa inline-flex items-center gap-1 rounded-full bg-surface px-3 py-1 text-sm text-accent" title="Built in">
            {x} <Equal size={12} aria-hidden="true" /> {y}
          </li>
        ))}
        {custom.map((e) => (
          <li key={e.id} className="ipa inline-flex items-center gap-1 rounded-full bg-surface py-1 pl-3 pr-1 text-sm text-accent">
            {e.value.name.replace("=", " = ")}
            <button type="button" onClick={() => void remove(e.id)} aria-label={`Remove ${e.value.name}`} className="rounded-full p-1 hover:bg-card">
              <Trash2 size={12} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
      <form
        className="flex items-center gap-2"
        onSubmit={async (ev) => {
          ev.preventDefault();
          if (!a.trim() || !b.trim()) return;
          await put("label", newId(), { name: `${a.trim()}=${b.trim()}`, color: "slate", scope: "equiv" });
          setA("");
          setB("");
        }}
      >
        <Input value={a} onChange={(e) => setA(e.target.value)} className="ipa w-20 text-center" aria-label="Sound" maxLength={6} />
        <Equal size={16} className="shrink-0 text-muted" aria-hidden="true" />
        <Input value={b} onChange={(e) => setB(e.target.value)} className="ipa w-20 text-center" aria-label="Same as" maxLength={6} />
        <Button type="submit" variant="secondary" disabled={!a.trim() || !b.trim()}>
          <Plus size={16} aria-hidden="true" /> Add
        </Button>
      </form>
    </div>
  );
}

export function LabelsManager() {
  const [scope, setScope] = useState<"recording" | "error" | "equiv">("recording");
  return (
    <div className="space-y-4">
      <Segmented
        label="Label type"
        value={scope}
        onChange={setScope}
        options={[
          { value: "recording", label: "Recordings" },
          { value: "error", label: "Errors" },
          { value: "equiv", label: "Same sounds" },
        ]}
      />
      {scope === "equiv" ? <Equivalences /> : <LabelList key={scope} scope={scope} />}
    </div>
  );
}
