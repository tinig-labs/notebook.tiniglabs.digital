"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Mic, Plus, Search, ShieldAlert, Users } from "lucide-react";
import { Button, Card, EmptyState, Input, Segmented } from "@/components/ui";
import { PatientForm } from "@/components/patient-form";
import { Pagination, usePagination } from "@/components/pagination";
import { useItems } from "@/lib/local/store";
import { age, fmtDate } from "@/lib/format";
import { pct } from "@/lib/ipa/compare";
import { equivalencesOf, reviewRecording } from "@/lib/ipa/review";

type Row = { count: number; last: number; toReview: number; pcc: number | null };

// Desktop columns: patient, focus, recordings, last recorded, latest PCC, record shortcut.
const COLS = "md:grid md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_7rem_7.5rem_4.5rem_2.75rem] md:items-center md:gap-4";

export default function PatientsPage() {
  const router = useRouter();
  const patients = useItems("patient");
  const recordings = useItems("recording");
  const transcripts = useItems("transcript");
  const targets = useItems("target");
  const labels = useItems("label");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"recent" | "name">("recent");
  const [adding, setAdding] = useState(false);

  const stats = useMemo(() => {
    const tx = new Map(transcripts.map((t) => [t.parentId, t.value]));
    const tg = new Map(targets.map((t) => [t.id, t.value]));
    const eq = equivalencesOf(labels);
    const m = new Map<string, Row & { lastPccAt: number }>();
    for (const r of recordings) {
      const s = m.get(r.value.patientId) ?? { count: 0, last: 0, toReview: 0, pcc: null, lastPccAt: 0 };
      s.count++;
      s.last = Math.max(s.last, r.value.recordedAt);
      const t = tx.get(r.id);
      if (t && !r.value.ipaEdited) s.toReview++;
      if (r.value.recordedAt > s.lastPccAt) {
        const rv = reviewRecording(r.value, { transcript: t, target: r.value.targetId ? tg.get(r.value.targetId) : null, equivalences: eq });
        if (rv?.metrics.pcc != null) {
          s.pcc = rv.metrics.pcc;
          s.lastPccAt = r.value.recordedAt;
        }
      }
      m.set(r.value.patientId, s);
    }
    return m;
  }, [recordings, transcripts, targets, labels]);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return patients
      .filter((p) => !p.value.archived && (!needle || `${p.value.name} ${p.value.diagnosis ?? ""}`.toLowerCase().includes(needle)))
      .sort((a, b) =>
        sort === "name" ? a.value.name.localeCompare(b.value.name) : (stats.get(b.id)?.last ?? b.updatedAt) - (stats.get(a.id)?.last ?? a.updatedAt),
      );
  }, [patients, q, stats, sort]);
  const paged = usePagination(list, "patients", `${q}|${sort}`);
  const toReview = [...stats.values()].reduce((n, s) => n + s.toReview, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[clamp(2rem,8vw,2.5rem)] font-medium leading-[1.1] tracking-[-0.03em]">Patients</h1>
          {patients.length > 0 && (
            <p className="mt-1 text-sm text-muted">
              {list.length} active{toReview > 0 && <> · <span className="font-semibold text-text">{toReview} recordings to review</span></>}
            </p>
          )}
        </div>
        {!adding && (
          <Button onClick={() => setAdding(true)} className="h-12">
            <Plus size={18} aria-hidden="true" /> New patient
          </Button>
        )}
      </div>

      {adding && (
        <Card className="ring-1 ring-inset ring-border">
          <PatientForm onDone={(id) => router.push(`/app/patient?id=${id}`)} onCancel={() => setAdding(false)} />
        </Card>
      )}

      {patients.length === 0 && !adding ? (
        <EmptyState icon={<Users aria-hidden="true" />} title="No patients yet">
          Add a patient, record consent, then start recording.
          <Button onClick={() => setAdding(true)} className="mx-auto mt-4">
            <Plus size={18} aria-hidden="true" /> New patient
          </Button>
        </EmptyState>
      ) : (
        patients.length > 0 && (
          <section aria-label="Patient list" className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className="relative block flex-1">
                <span className="sr-only">Search patients</span>
                <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or focus" className="pl-11" type="search" />
              </label>
              <Segmented
                label="Sort patients"
                value={sort}
                onChange={setSort}
                options={[
                  { value: "recent", label: "Recent" },
                  { value: "name", label: "A–Z" },
                ]}
              />
            </div>

            <div className="overflow-hidden rounded-[28px] bg-card ring-1 ring-inset ring-border">
              <div className={`hidden px-5 py-3 text-xs font-semibold text-muted ${COLS}`} aria-hidden="true">
                <span>Patient</span>
                <span>Focus</span>
                <span>Recordings</span>
                <span>Last recorded</span>
                <span className="text-right">PCC</span>
                <span />
              </div>
              {paged.slice.length === 0 ? (
                <p className="px-5 py-10 text-center text-muted">No patients match “{q}”.</p>
              ) : (
                <ul className="divide-y divide-border md:border-t md:border-border">
                  {paged.slice.map((p) => {
                    const s = stats.get(p.id);
                    const consent = !!p.value.consent?.given;
                    return (
                      <li key={p.id} className={`group relative flex items-center gap-4 px-5 py-4 transition-colors hover:bg-surface/60 ${COLS}`}>
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-surface text-base font-semibold text-accent" aria-hidden="true">
                            {p.value.name.replace(/[^\p{L}\p{N}]/gu, "").slice(0, 2).toUpperCase() || "?"}
                          </span>
                          <div className="min-w-0">
                            {/* The whole row is the link; the record button sits above it. */}
                            <Link href={`/app/patient?id=${p.id}`} className="block truncate font-semibold after:absolute after:inset-0 after:content-['']">
                              {p.value.name}
                            </Link>
                            <p className="flex items-center gap-1.5 truncate text-sm text-muted">
                              {age(p.value.birthYear) ?? "Age not set"}
                              {!consent && (
                                <span className="inline-flex items-center gap-1 font-semibold text-danger">
                                  <ShieldAlert size={14} aria-hidden="true" /> No consent
                                </span>
                              )}
                            </p>
                            <p className="truncate text-sm text-muted md:hidden">
                              {[p.value.diagnosis, s ? `${s.count} rec · ${fmtDate(s.last)}` : "No recordings", s?.pcc != null ? `PCC ${pct(s.pcc)}` : null]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          </div>
                        </div>
                        <span className="hidden truncate text-sm text-text/80 md:block">{p.value.diagnosis ?? <span className="text-muted">—</span>}</span>
                        <span className="hidden text-sm md:block">
                          <span className="tabular-nums">{s?.count ?? 0}</span>
                          {s?.toReview ? <span className="ml-2 rounded-full bg-[#fbf1df] px-2 py-0.5 text-xs font-semibold text-[#8a5a12]">{s.toReview} to review</span> : null}
                        </span>
                        <span className="hidden text-sm tabular-nums text-text/80 md:block">{s ? fmtDate(s.last) : <span className="text-muted">—</span>}</span>
                        <span className="hidden text-right text-sm font-semibold tabular-nums md:block">{s?.pcc != null ? pct(s.pcc) : <span className="font-normal text-muted">—</span>}</span>
                        {consent ? (
                          <Link
                            href={`/app/record?patient=${p.id}`}
                            aria-label={`Record ${p.value.name}`}
                            className="relative z-10 flex size-11 shrink-0 items-center justify-center rounded-full bg-surface text-accent transition-colors hover:bg-accent hover:text-accent-fg"
                          >
                            <Mic size={18} aria-hidden="true" />
                          </Link>
                        ) : (
                          <span className="size-11 shrink-0" aria-hidden="true" />
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <Pagination p={paged} noun={["patient", "patients"]} />
          </section>
        )
      )}
    </div>
  );
}
