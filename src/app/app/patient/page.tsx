"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, TrendingUp, Columns2, Download, Mic, Pencil, ShieldAlert, ShieldCheck, Trash2, X } from "lucide-react";
import { ButtonLink, Card, Chip, EmptyState, IconButton } from "@/components/ui";
import { PatientForm } from "@/components/patient-form";
import { IpaStatus, LabelPill, PlayButton, RecordingPlayer, useLabels } from "@/components/notebook";
import { getItem, remove, useItem, useItems } from "@/lib/local/store";
import { age, dayKey, fmtDate, fmtDay, fmtDuration, fmtTime } from "@/lib/format";
import { exportZip } from "@/lib/local/export";
import { Pagination, usePagination } from "@/components/pagination";
import { IpaReview } from "@/components/ipa-review";
import { equivalencesOf, reviewRecording } from "@/lib/ipa/review";
import { pct } from "@/lib/ipa/compare";
import type { Transcript } from "@/lib/local/types";

function ipaOf(recId: string, edited?: string) {
  if (edited) return edited;
  const t = getItem(`t_${recId}`);
  return t?.kind === "transcript" ? (t.value as { ipa: string }).ipa : "";
}

/** PCC over time for one target: a tiny line, newest on the right. */
function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const w = 96;
  const h = 28;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - 2 - v * (h - 4)}`).join(" ");
  const last = values[values.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden="true" className="shrink-0 overflow-visible">
      <line x1="0" x2={w} y1={h - 2} y2={h - 2} stroke="currentColor" className="text-border" />
      <polyline points={pts} fill="none" stroke="var(--pandan)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={w} cy={h - 2 - last * (h - 4)} r="3" fill="var(--pandan)" />
    </svg>
  );
}

function PatientView() {
  const id = useSearchParams().get("id");
  const router = useRouter();
  const patient = useItem("patient", id);
  const labels = useLabels();
  const labelMap = useMemo(() => new Map(labels.map((l) => [l.id, l])), [labels]);
  const recordings = useItems("recording", (r) => r.value.patientId === id, [id]);
  const transcripts = useItems("transcript");
  const targets = useItems("target");
  const allLabels = useItems("label");
  const [editing, setEditing] = useState(false);
  const [filter, setFilter] = useState<string[]>([]);
  const [targetFilter, setTargetFilter] = useState<string | null>(null);

  // Comparison with the ideal IPA, per recording (same rules as the recording screen).
  const reviews = useMemo(() => {
    const tx = new Map(transcripts.map((t) => [t.parentId, t.value]));
    const tg = new Map(targets.map((t) => [t.id, t.value]));
    const eq = equivalencesOf(allLabels);
    return new Map(
      recordings.map((r) => [r.id, reviewRecording(r.value, { transcript: tx.get(r.id), target: r.value.targetId ? tg.get(r.value.targetId) : null, equivalences: eq })]),
    );
  }, [recordings, transcripts, targets, allLabels]);

  // Progress per library target: PCC of each recording, oldest first.
  const progress = useMemo(() => {
    const m = new Map<string, { id: string; text: string; pcc: number[]; n: number; errors: number }>();
    for (const r of [...recordings].sort((a, b) => a.value.recordedAt - b.value.recordedAt)) {
      const tid = r.value.targetId;
      if (!tid) continue;
      const e = m.get(tid) ?? { id: tid, text: r.value.target ?? "", pcc: [], n: 0, errors: 0 };
      e.n++;
      const rv = reviews.get(r.id);
      if (rv?.metrics.pcc != null) e.pcc.push(rv.metrics.pcc);
      if (rv) e.errors = rv.ops.filter((o) => o.finalType !== "C").length;
      m.set(tid, e);
    }
    return [...m.values()].sort((a, b) => b.n - a.n);
  }, [recordings, reviews]);
  const [compare, setCompare] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);

  const shown = useMemo(
    () =>
      recordings
        .filter((r) => filter.every((f) => r.value.labelIds.includes(f)) && (!targetFilter || r.value.targetId === targetFilter))
        .sort((a, b) => b.value.recordedAt - a.value.recordedAt),
    [recordings, filter, targetFilter],
  );
  // Page through recordings, then group the page by day.
  const paged = usePagination(shown, "timeline", `${filter.join(",")}|${targetFilter}`, 25);
  const byDay = useMemo(() => {
    const m = new Map<string, typeof shown>();
    for (const r of paged.slice) {
      const k = dayKey(r.value.recordedAt);
      m.set(k, [...(m.get(k) ?? []), r]);
    }
    return [...m.entries()];
  }, [paged.slice]);
  const usedLabels = labels.filter((l) => recordings.some((r) => r.value.labelIds.includes(l.id)));

  if (!patient)
    return (
      <EmptyState icon={<X aria-hidden="true" />} title="Patient not found">
        <Link href="/app" className="font-semibold text-accent">
          Back to patients
        </Link>
      </EmptyState>
    );

  const p = patient.value;
  const toggleCompare = (rid: string) =>
    setCompare((c) => (c ? (c.includes(rid) ? c.filter((x) => x !== rid) : [...c, rid].slice(-2)) : c));

  return (
    <div className="space-y-6">
      <Link href="/app" className="inline-flex items-center gap-1.5 text-sm font-semibold text-text/70 hover:text-text">
        <ArrowLeft size={16} aria-hidden="true" /> Patients
      </Link>

      {editing ? (
        <Card>
          <PatientForm id={patient.id} initial={p} onDone={() => setEditing(false)} onCancel={() => setEditing(false)} />
        </Card>
      ) : (
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-[clamp(2rem,8vw,2.75rem)] font-medium leading-[1.1] tracking-[-0.03em]">{p.name}</h1>
            <p className="mt-2 text-muted">{[age(p.birthYear), p.diagnosis].filter(Boolean).join(" · ")}</p>
            <p className={`mt-2 inline-flex items-center gap-1.5 text-sm font-semibold ${p.consent?.given ? "text-accent" : "text-danger"}`}>
              {p.consent?.given ? <ShieldCheck size={16} aria-hidden="true" /> : <ShieldAlert size={16} aria-hidden="true" />}
              {p.consent?.given ? `Consent: ${p.consent.by} (${p.consent.relation}), ${fmtDate(p.consent.at)}` : "Consent not recorded"}
            </p>
            {p.notes && <p className="mt-3 max-w-[60ch] whitespace-pre-wrap text-sm text-text/80">{p.notes}</p>}
          </div>
          <div className="flex items-center gap-1">
            <IconButton label="Edit patient" onClick={() => setEditing(true)}>
              <Pencil size={18} />
            </IconButton>
            <IconButton
              label="Export this patient"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await exportZip([patient.id]);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Download size={18} />
            </IconButton>
            <IconButton
              label="Delete patient"
              variant="ghost"
              className="text-danger"
              onClick={async () => {
                if (!confirm(`Delete ${p.name} and all ${recordings.length} recordings? This can't be undone.`)) return;
                await remove(patient.id);
                router.replace("/app");
              }}
            >
              <Trash2 size={18} />
            </IconButton>
            <ButtonLink href={`/app/record?patient=${patient.id}`} className="ml-2 h-12">
              <Mic size={18} aria-hidden="true" /> Record
            </ButtonLink>
          </div>
        </div>
      )}

      {progress.length > 0 && (
        <section aria-labelledby="progress-title" className="space-y-2">
          <h2 id="progress-title" className="flex items-center gap-2 text-sm font-semibold text-muted">
            <TrendingUp size={16} aria-hidden="true" /> Progress by target (PCC)
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {progress.map((t) => {
              const last = t.pcc.at(-1);
              const first = t.pcc[0];
              const on = targetFilter === t.id;
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => setTargetFilter(on ? null : t.id)}
                    className={`flex w-full items-center gap-3 rounded-panel bg-card p-3 text-left ring-1 ring-inset ${on ? "ring-2 ring-accent" : "ring-border"}`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{t.text}</span>
                      <span className="block text-xs text-muted">
                        {t.n} recording{t.n === 1 ? "" : "s"}
                        {last != null && first != null && t.pcc.length > 1 && ` · ${last >= first ? "+" : ""}${Math.round((last - first) * 100)} pts`}
                      </span>
                    </span>
                    <Sparkline values={t.pcc} />
                    <span className="w-12 shrink-0 text-right text-lg font-semibold tabular-nums">{pct(last ?? null)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {recordings.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {usedLabels.map((l) => (
            <Chip key={l.id} on={filter.includes(l.id)} onClick={() => setFilter((f) => (f.includes(l.id) ? f.filter((x) => x !== l.id) : [...f, l.id]))}>
              {l.value.name}
            </Chip>
          ))}
          <Chip on={compare !== null} onClick={() => setCompare((c) => (c ? null : []))} className="ml-auto">
            <Columns2 size={16} aria-hidden="true" /> Compare
          </Chip>
        </div>
      )}

      {compare && (
        <section aria-label="Compare recordings" className="rounded-card bg-surface p-3">
          {compare.length < 2 ? (
            <p className="px-3 py-4 text-sm text-muted">Pick two recordings below to compare.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {compare.map((rid) => {
                const r = recordings.find((x) => x.id === rid);
                if (!r) return null;
                return (
                  <div key={rid} className="space-y-3 rounded-panel bg-card p-4">
                    <p className="text-sm font-semibold">
                      {fmtDate(r.value.recordedAt)} · {r.value.target || "Untitled"}
                    </p>
                    <RecordingPlayer id={rid} />
                    {reviews.get(rid) ? (
                      <IpaReview id={rid} recording={r.value} modelIpa={(getItem(`t_${rid}`)?.value as Transcript | undefined)?.ipa || null} />
                    ) : (
                      <p className="ipa text-2xl text-accent">{ipaOf(rid, r.value.ipaEdited) || "—"}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {recordings.length === 0 ? (
        <EmptyState icon={<Mic aria-hidden="true" />} title="No recordings yet">
          {p.consent?.given ? "Tap Record to make the first one." : "Record consent first, then tap Record."}
        </EmptyState>
      ) : (
        <ol className="space-y-6">
          {byDay.map(([day, recs]) => (
            <li key={day}>
              <h2 className="mb-2 text-sm font-semibold text-muted">{fmtDay(recs[0].value.recordedAt)}</h2>
              <ul className="space-y-2">
                {recs.map((r) => {
                  const ipa = ipaOf(r.id, r.value.ipaEdited);
                  const rv = reviews.get(r.id);
                  const nErr = rv ? rv.ops.filter((o) => o.finalType !== "C").length : 0;
                  const picked = compare?.includes(r.id);
                  return (
                    <li key={r.id} className={`flex items-center gap-3 rounded-panel bg-card p-3 ring-1 ring-inset ${picked ? "ring-2 ring-accent" : "ring-border"}`}>
                      {compare ? (
                        <input
                          type="checkbox"
                          checked={!!picked}
                          onChange={() => toggleCompare(r.id)}
                          aria-label="Select to compare"
                          className="ml-2 size-5 accent-[var(--pandan)]"
                        />
                      ) : (
                        <PlayButton id={r.id} label={r.value.target || "recording"} />
                      )}
                      <Link href={`/app/recording?id=${r.id}`} className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate font-semibold">{r.value.target || "Untitled"}</span>
                          <span className="shrink-0 text-xs text-muted tabular-nums">
                            {fmtTime(r.value.recordedAt)} · {fmtDuration(r.value.durationMs)}
                          </span>
                        </span>
                        {ipa && <span className="ipa block truncate text-accent">{ipa}</span>}
                        <span className="mt-1 flex flex-wrap items-center gap-1.5">
                          {r.value.labelIds.map((lid) => {
                            const l = labelMap.get(lid);
                            return l ? <LabelPill key={lid} label={l} size="xs" /> : null;
                          })}
                          {!r.value.ipaEdited && <IpaStatus status={r.ipaStatus} />}
                          {rv && (
                            <span className={`text-xs font-semibold ${nErr ? "text-[var(--soda-s-ink)]" : "text-accent"}`}>
                              PCC {pct(rv.metrics.pcc)} · {nErr ? `${nErr} error${nErr === 1 ? "" : "s"}` : "no errors"}
                            </span>
                          )}
                          {rv && !r.value.ipaEdited && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2 py-0.5 text-[0.6875rem] font-semibold text-muted" title="Model draft, not reviewed yet">
                              draft
                            </span>
                          )}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ol>
      )}
      {recordings.length > 0 && <Pagination p={paged} noun={["recording", "recordings"]} />}
    </div>
  );
}

export default function PatientPage() {
  return (
    <Suspense>
      <PatientView />
    </Suspense>
  );
}
