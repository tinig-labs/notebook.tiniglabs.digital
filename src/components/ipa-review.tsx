"use client";

import { Fragment, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, CircleCheck, Equal, Keyboard, Link2Off, MessageSquareText, Plus, RotateCcw, Sparkles, X } from "lucide-react";
import { Button, Chip, IconButton, Input, Segmented, Textarea } from "./ui";
import { LabelPill, useLabels } from "./notebook";
import { ReviewGuide } from "./review-guide";
import { IpaKeyboard } from "./ipa-keyboard/ipa-keyboard";
import { getItem, newId, put, useItem } from "@/lib/local/store";
import { applyMarks, compare, pct, PROCESSES, type ErrorType, type Mark, type Process, type ReviewedOp } from "@/lib/ipa/compare";
import { editProduced, remapMarks, type ProducedEdit } from "@/lib/ipa/edit";
import type { Recording, Review, Target } from "@/lib/local/types";

/**
 * SODA review: the target IPA over what the patient produced, aligned phone by phone. The bottom row
 * IS the patient's IPA: it starts as the model's draft and the SLP corrects it right here, sound by
 * sound: tap a tile to change it, or a + gap to insert one. Errors are tiles with a colour AND a
 * letter, never colour alone. Notes, process tags and error labels are layered on as marks.
 */

export const TYPE_INFO: Record<ErrorType, { label: string; tile: string; badge: string }> = {
  C: { label: "Correct", tile: "bg-card ring-border", badge: "" },
  S: { label: "Substitution", tile: "bg-[var(--soda-s-tint)] ring-[var(--soda-s)]/40", badge: "bg-[var(--soda-s)] text-white" },
  O: { label: "Omission", tile: "bg-[var(--soda-o-tint)] ring-0 outline-dashed outline-2 -outline-offset-2 outline-[var(--soda-o)]/60", badge: "bg-[var(--soda-o)] text-white" },
  D: { label: "Distortion", tile: "bg-[var(--soda-d-tint)] ring-[var(--soda-d)]/40", badge: "bg-[var(--soda-d)] text-white" },
  A: { label: "Addition", tile: "bg-[var(--soda-a-tint)] ring-[var(--soda-a)]/40", badge: "bg-[var(--soda-a)] text-white" },
};

const isProcess = (t: string): t is Process => t in PROCESSES;

function Metric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="min-w-0 rounded-panel bg-card px-4 py-3" title={hint}>
      <p className="text-xs font-semibold text-muted">{label}</p>
      <p className="text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function Tile({ op, selected, onSelect }: { op: ReviewedOp; selected: boolean; onSelect: () => void }) {
  const info = TYPE_INFO[op.finalType];
  const err = op.finalType !== "C";
  const label = `${op.t?.text ?? "nothing"} to ${op.p?.text ?? "nothing"}: ${info.label}${op.mark?.note ? ", has a note" : ""}. Edit`;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={label}
      className={`relative flex min-w-9 flex-col items-stretch rounded-tag text-center ring-1 ring-inset transition-shadow ${info.tile} ${selected ? "shadow-[0_0_0_2px_var(--pandan)]" : ""}`}
    >
      <span className={`ipa block px-1.5 pt-1 text-lg leading-7 ${op.t ? "text-text/70" : "text-transparent"}`}>{op.t?.text ?? "·"}</span>
      <span className={`ipa block border-t border-dashed border-text/10 px-1.5 pb-1 text-lg font-semibold leading-7 ${err ? "text-text" : "text-accent"}`}>
        {op.p?.text ?? "–"}
      </span>
      {err && (
        <span className={`absolute -right-1.5 -top-1.5 flex size-[18px] items-center justify-center rounded-full text-[0.625rem] font-bold ${info.badge}`} aria-hidden="true">
          {op.finalType}
        </span>
      )}
      {op.mark?.note && (
        <span className="absolute -bottom-1.5 -right-1.5 flex size-[18px] items-center justify-center rounded-full bg-text text-bg" aria-hidden="true">
          <MessageSquareText size={10} />
        </span>
      )}
    </button>
  );
}

/** Thin insertion point between tiles; wider hit area than it looks. */
function Gap({ onInsert, active }: { onInsert: () => void; active: boolean }) {
  return (
    <button
      type="button"
      onClick={onInsert}
      aria-label="Insert a sound here"
      className={`group relative -mx-1 flex w-3 items-end justify-center self-stretch pb-2 ${active ? "w-6" : ""}`}
    >
      <span
        className={`flex size-4 items-center justify-center rounded-full transition-opacity ${
          active ? "bg-accent text-accent-fg opacity-100" : "bg-surface text-accent opacity-40 group-hover:opacity-100 group-focus-visible:opacity-100"
        }`}
      >
        <Plus size={10} strokeWidth={3} aria-hidden="true" />
      </span>
    </button>
  );
}

/** Small IPA field with the on-screen keyboard. Enter submits. */
function IpaField({
  value,
  onChange,
  onSubmit,
  label,
  autoFocus,
  wide,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  label: string;
  autoFocus?: boolean;
  wide?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [kb, setKb] = useState(false);
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onSubmit();
            }
          }}
          aria-label={label}
          autoFocus={autoFocus}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          className={`ipa text-xl ${wide ? "" : "max-w-40 text-center"}`}
        />
        <IconButton label="IPA keyboard" variant={kb ? "primary" : "secondary"} type="button" onClick={() => setKb((k) => !k)}>
          <Keyboard size={18} />
        </IconButton>
      </div>
      {kb && <IpaKeyboard value={value} onChange={onChange} targetRef={ref} />}
    </div>
  );
}

function MarkEditor({
  op,
  onSave,
  onEdit,
  onClose,
  onEquivalent,
}: {
  op: ReviewedOp;
  onSave: (m: Mark | null) => void;
  onEdit: (e: ProducedEdit, mark: Mark | null) => void;
  onClose: () => void;
  onEquivalent: (a: string, b: string) => void;
}) {
  const errorLabels = useLabels("error");
  const [sound, setSound] = useState(op.p?.text ?? "");
  const [type, setType] = useState<ErrorType>(op.finalType);
  // New marks start with the suggested processes ticked; the SLP unticks what's wrong.
  const [tags, setTags] = useState<string[]>(op.mark ? op.mark.tags : op.suggested);
  const [note, setNote] = useState(op.mark?.note ?? "");
  const [more, setMore] = useState(false);
  const toggle = (t: string) => setTags((x) => (x.includes(t) ? x.filter((y) => y !== t) : [...x, t]));
  const processes = (more ? (Object.keys(PROCESSES) as Process[]) : [...new Set([...op.suggested, ...tags.filter(isProcess)])]) as Process[];
  const soundChanged = sound.trim() !== (op.p?.text ?? "");

  // Notes and tags travel with the sound; the new sound gets classified afresh.
  const mark = (): Mark | null => {
    const hasContent = note.trim() || (type !== "C" && tags.length) || (!soundChanged && type !== op.type);
    if (!hasContent) return null;
    return {
      key: op.key,
      tPhone: op.t?.text,
      pPhone: soundChanged ? sound.trim() || undefined : op.p?.text,
      type: soundChanged || type === op.type ? undefined : type,
      tags: type === "C" && !soundChanged ? [] : tags,
      note: note.trim() || undefined,
    };
  };

  function save() {
    if (soundChanged) {
      const edit: ProducedEdit = op.t ? { kind: "replace", key: op.key, text: sound } : sound.trim() ? { kind: "replace", key: op.key, text: sound } : { kind: "removeAdded", key: op.key };
      onEdit(edit, mark());
    } else onSave(mark());
  }

  return (
    <div className="space-y-4 rounded-panel bg-card p-4 ring-1 ring-inset ring-border">
      <div className="flex items-center justify-between gap-2">
        <p className="ipa flex items-center gap-2 text-2xl">
          <span className="text-text/70">{op.t?.text ?? "∅"}</span>
          <ArrowRight size={18} className="text-muted" aria-hidden="true" />
          <span className="font-semibold">{sound.trim() || "∅"}</span>
        </p>
        <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-2 text-muted hover:bg-surface">
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-muted">{op.t ? "Patient produced" : "Added sound"}</p>
        <div className="flex flex-wrap items-start gap-2">
          <IpaField value={sound} onChange={setSound} onSubmit={save} label="Produced sound" autoFocus />
          {op.t && op.p && (
            <Button variant="secondary" className="h-12" onClick={() => setSound("")}>
              – Omitted
            </Button>
          )}
          {op.t && !op.p && !sound && (
            <Button variant="secondary" className="h-12" onClick={() => setSound(op.t!.text)}>
              <Check size={16} aria-hidden="true" /> Was said
            </Button>
          )}
          {!op.t && (
            <Button variant="secondary" className="h-12" onClick={() => setSound("")}>
              <X size={16} aria-hidden="true" /> Remove
            </Button>
          )}
        </div>
      </div>

      {!soundChanged && (
        <>
          <div className="overflow-x-auto">
            <Segmented
              label="Error type"
              value={type}
              onChange={setType}
              options={(["C", "S", "O", "D", "A"] as ErrorType[]).map((t) => ({ value: t, label: TYPE_INFO[t].label }))}
            />
          </div>
          {type !== op.type && <p className="text-xs text-muted">Automatic: {TYPE_INFO[op.type].label}</p>}
        </>
      )}

      {(type !== "C" || soundChanged) && (
        <>
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted">Process{op.suggested.length > 0 && !soundChanged && " (suggested ticked)"}</p>
            <div className="flex flex-wrap gap-2">
              {processes.map((p) => (
                <Chip key={p} on={tags.includes(p)} onClick={() => toggle(p)}>
                  {PROCESSES[p]}
                </Chip>
              ))}
              <Chip onClick={() => setMore((m) => !m)}>{more ? "Fewer" : "More…"}</Chip>
            </div>
          </div>
          {errorLabels.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted">Error labels</p>
              <div className="flex flex-wrap gap-2">
                {errorLabels.map((l) => (
                  <Chip key={l.id} on={tags.includes(l.id)} onClick={() => toggle(l.id)}>
                    {l.value.name}
                  </Chip>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" maxLength={1000} className="min-h-16" aria-label="Note" />

      <div className="flex flex-wrap gap-2">
        <Button onClick={save}>Save</Button>
        {op.mark && !soundChanged && (
          <Button variant="ghost" onClick={() => onSave(null)}>
            Clear note and tags
          </Button>
        )}
        {op.t && op.p && op.type !== "C" && !soundChanged && (() => {
          // Diacritic-only difference: accept the exact sounds; otherwise the base letters.
          const [a, b] = op.t.base === op.p.base ? [op.t.text, op.p.text] : [op.t.base, op.p.base];
          return (
            <Button variant="ghost" onClick={() => onEquivalent(a, b)} title="Count this pair as correct in every comparison">
              <Equal size={16} aria-hidden="true" /> Always accept <span className="ipa">{a}={b}</span>
            </Button>
          );
        })()}
      </div>
    </div>
  );
}

function InsertEditor({ onAdd, onClose }: { onAdd: (text: string) => void; onClose: () => void }) {
  const [v, setV] = useState("");
  return (
    <div className="space-y-3 rounded-panel bg-card p-4 ring-1 ring-inset ring-border">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted">Insert a sound the patient added</p>
        <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-2 text-muted hover:bg-surface">
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      <div className="flex flex-wrap items-start gap-2">
        <IpaField value={v} onChange={setV} onSubmit={() => v.trim() && onAdd(v)} label="Added sound" autoFocus />
        <Button className="h-12" disabled={!v.trim()} onClick={() => onAdd(v)}>
          <Plus size={16} aria-hidden="true" /> Insert
        </Button>
      </div>
    </div>
  );
}

function RowEditor({ initial, onSave, onClose, label = "Patient's IPA" }: { initial: string; onSave: (v: string) => void; onClose?: () => void; label?: string }) {
  const [v, setV] = useState(initial);
  return (
    <div className="space-y-3 rounded-panel bg-card p-4 ring-1 ring-inset ring-border">
      <p className="text-sm font-medium text-muted">{label}</p>
      <IpaField value={v} onChange={setV} onSubmit={() => onSave(v)} label={label} autoFocus wide />
      <div className="flex gap-2">
        <Button onClick={() => onSave(v)} disabled={v.trim() === initial.trim()}>
          Save
        </Button>
        {onClose && (
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}

type Panel = { kind: "tile"; key: string } | { kind: "insert"; at: number } | null;

export function IpaReview({ id, recording, modelIpa }: { id: string; recording: Recording; modelIpa: string | null }) {
  const equivLabels = useLabels("equiv");
  const errorLabels = useLabels("error");
  const libTarget = useItem("target", recording.targetId);
  const [panel, setPanel] = useState<Panel>(null);

  const slpIpa = recording.ipaEdited?.trim() || null;
  const produced = slpIpa ?? modelIpa;
  const targetIpa = recording.targetIpa?.length ? recording.targetIpa : libTarget?.value.ipa;
  const newerModel = !!(slpIpa && modelIpa && recording.ipaModelSeen !== undefined && recording.ipaModelSeen !== modelIpa);

  const equivalences = useMemo(() => equivLabels.map((l) => l.value.name), [equivLabels]);
  const analysis = useMemo(() => (targetIpa && produced ? compare(targetIpa, produced, equivalences) : null), [targetIpa, produced, equivalences]);
  const reviewed = useMemo(() => (analysis ? applyMarks(analysis, recording.review?.marks) : null), [analysis, recording.review?.marks]);
  const labelName = (t: string) => (isProcess(t) ? PROCESSES[t] : errorLabels.find((l) => l.id === t)?.value.name);

  // Always write onto the latest stored copy so other edits on the page aren't overwritten.
  async function update(fn: (cur: Recording, review: Review) => Partial<Recording>) {
    const cur = getItem(id)?.value as Recording | undefined;
    if (!cur) return;
    const review: Review = cur.review ?? { marks: [], updatedAt: 0 };
    const patch = fn(cur, review);
    await put("recording", id, { ...cur, ...patch, review: { ...(patch.review ?? review), updatedAt: Date.now() } }, cur.patientId);
  }
  const setIpa = (ipa: string, marks?: Mark[]) =>
    update((_, r) => ({ ipaEdited: ipa.trim() || undefined, ipaModelSeen: modelIpa ?? undefined, review: marks ? { ...r, marks } : r }));
  const close = () => setPanel(null);

  const status = (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
      {slpIpa ? (
        <span className="inline-flex items-center gap-1.5 font-semibold text-accent">
          <CircleCheck size={16} aria-hidden="true" /> Reviewed by you
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 font-semibold text-muted">
          <Sparkles size={16} aria-hidden="true" /> Model draft
        </span>
      )}
      {!slpIpa && modelIpa && (
        <Button variant="secondary" className="h-9 px-3" onClick={() => void setIpa(modelIpa)}>
          <Check size={14} aria-hidden="true" /> Confirm as is
        </Button>
      )}
      {slpIpa && modelIpa && slpIpa !== modelIpa && (
        <button type="button" className="inline-flex items-center gap-1 font-semibold text-muted hover:text-text" onClick={() => void setIpa("")}>
          <RotateCcw size={14} aria-hidden="true" /> Reset to model
        </button>
      )}
    </div>
  );

  // Free-text target, or no target IPA: still let the SLP write the patient's IPA.
  if (!targetIpa?.length) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted">Pick a target from your library to compare sound by sound.</p>
        {produced && status}
        <RowEditor key={produced ?? ""} initial={produced ?? ""} onSave={(v) => void setIpa(v)} />
      </div>
    );
  }
  if (!produced) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted">Waiting for the model&apos;s IPA. You can also type the patient&apos;s IPA now.</p>
        <RowEditor key="empty" initial="" onSave={(v) => void setIpa(v)} />
      </div>
    );
  }
  if (!analysis || !reviewed) return null;

  const ops = reviewed.ops;
  const errors = ops.filter((o) => o.finalType !== "C");
  const sel = panel?.kind === "tile" ? (ops.find((o) => o.key === panel.key) ?? null) : null;
  const m = reviewed.metrics;
  const libIpaChanged = libTarget && recording.targetIpa && JSON.stringify(libTarget.value.ipa) !== JSON.stringify(recording.targetIpa);
  const applyEdit = (edit: ProducedEdit, mark: Mark | null, key?: string) => {
    const marks = remapMarks(recording.review?.marks ?? [], edit).filter((x) => x.key !== key);
    void setIpa(editProduced(ops, edit), mark ? [...marks, mark] : marks);
    close();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Target <span className="ipa text-base text-accent">{analysis.target}</span>
        </p>
      </div>

      {libIpaChanged && (
        <p className="flex flex-wrap items-center gap-2 rounded-panel bg-card px-4 py-2 text-sm">
          The library IPA for this target changed.
          <button type="button" className="font-semibold text-accent" onClick={() => void update(() => ({ targetIpa: (libTarget!.value as Target).ipa }))}>
            Use current
          </button>
        </p>
      )}
      {newerModel && (
        <p className="flex flex-wrap items-center gap-2 rounded-panel bg-card px-4 py-2 text-sm">
          <Sparkles size={14} className="text-accent" aria-hidden="true" /> The model has a new transcription.
          <button type="button" className="font-semibold text-accent" onClick={() => void setIpa(modelIpa!)}>
            Use it
          </button>
          <button type="button" className="font-semibold text-muted" onClick={() => void update(() => ({ ipaModelSeen: modelIpa! }))}>
            Keep mine
          </button>
        </p>
      )}

      <div className="grid grid-cols-3 gap-2">
        <Metric label="PCC" value={pct(m.pcc)} hint="Percent consonants correct" />
        <Metric label="PER" value={pct(m.per)} hint="Phone error rate: substitutions, omissions and additions per target phone" />
        <Metric label="FER" value={pct(m.fer)} hint="Feature error rate: how far off, in phonological features, per target phone" />
      </div>

      <div>
        <div role="group" aria-label="Aligned phones: target over patient" className="flex min-w-0 flex-wrap gap-y-3 pt-1.5">
          {ops.map((o, i) => (
            <Fragment key={o.key}>
              {i > 0 && o.t?.wordStart && <span className="w-2" aria-hidden="true" />}
              <Gap active={panel?.kind === "insert" && panel.at === i} onInsert={() => setPanel({ kind: "insert", at: i })} />
              <Tile op={o} selected={sel?.key === o.key} onSelect={() => setPanel(sel?.key === o.key ? null : { kind: "tile", key: o.key })} />
            </Fragment>
          ))}
          <Gap active={panel?.kind === "insert" && panel.at === ops.length} onInsert={() => setPanel({ kind: "insert", at: ops.length })} />
        </div>
      </div>

      {status}

      {sel && (
        <MarkEditor
          key={sel.key}
          op={sel}
          onClose={close}
          onSave={(mark) => {
            void update((_, r) => ({ review: { ...r, marks: [...r.marks.filter((x) => x.key !== sel.key), ...(mark ? [mark] : [])] } }));
            close();
          }}
          onEdit={(edit, mark) => applyEdit(edit, mark, sel.key)}
          onEquivalent={(a, b) => {
            void put("label", newId(), { name: `${a}=${b}`, color: "slate", scope: "equiv" });
            close();
          }}
        />
      )}
      {panel?.kind === "insert" && <InsertEditor key={panel.at} onClose={close} onAdd={(text) => applyEdit({ kind: "insert", at: panel.at, text }, null)} />}

      {errors.length > 0 ? (
        <ul className="space-y-1.5" aria-label="Errors">
          {errors.map((o) => (
            <li key={o.key}>
              <button
                type="button"
                onClick={() => setPanel({ kind: "tile", key: o.key })}
                className="flex w-full flex-wrap items-center gap-2 rounded-panel px-2 py-1.5 text-left text-sm hover:bg-card"
              >
                <span className={`flex size-[18px] shrink-0 items-center justify-center rounded-full text-[0.625rem] font-bold ${TYPE_INFO[o.finalType].badge}`} aria-hidden="true">
                  {o.finalType}
                </span>
                <span className="sr-only">{TYPE_INFO[o.finalType].label}</span>
                <span className="ipa">
                  {o.t?.text ?? "∅"} → {o.p?.text ?? "∅"}
                </span>
                {(o.mark ? o.tags : o.suggested).map((t) => {
                  const lbl = errorLabels.find((l) => l.id === t);
                  return lbl ? (
                    <LabelPill key={t} label={lbl} size="xs" />
                  ) : (
                    <span
                      key={t}
                      className={`rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold ${o.mark ? "bg-surface text-accent" : "border border-dashed border-border text-muted"}`}
                    >
                      {labelName(t)}
                      {!o.mark && "?"}
                    </span>
                  );
                })}
                {o.mark?.note && <span className="w-full pl-7 text-muted">{o.mark.note}</span>}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm font-semibold text-accent">No errors: matches the target.</p>
      )}

      {reviewed.detached.length > 0 && (
        <div className="space-y-2 rounded-panel bg-card p-4 text-sm">
          <p className="flex items-center gap-2 font-semibold">
            <Link2Off size={16} aria-hidden="true" /> Notes from an earlier version of the IPA
          </p>
          <ul className="space-y-1 text-muted">
            {reviewed.detached.map((d) => (
              <li key={d.key}>
                <span className="ipa">
                  {d.tPhone ?? "∅"} → {d.pPhone ?? "∅"}
                </span>
                {d.note && `: ${d.note}`}
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="font-semibold text-accent"
            onClick={() => void update((_, r) => ({ review: { ...r, marks: r.marks.filter((x) => !reviewed.detached.some((d) => d.key === x.key)) } }))}
          >
            Discard these
          </button>
        </div>
      )}

      <ReviewGuide />
    </div>
  );
}
