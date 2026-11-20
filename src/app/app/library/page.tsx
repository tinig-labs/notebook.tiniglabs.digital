"use client";

import { Suspense, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BookOpen, Download, Pencil, Plus, Search, Trash2, Upload } from "lucide-react";
import { Button, Card, EmptyState, IconButton, Input, Segmented, Select } from "@/components/ui";
import { Pagination, usePagination } from "@/components/pagination";

// Desktop columns: target, ideal IPA, sets, times used, actions.
const COLS = "md:grid md:grid-cols-[minmax(0,1.3fr)_minmax(0,1.2fr)_minmax(0,1fr)_3.5rem_5.75rem] md:items-center md:gap-4";
import { TargetForm } from "@/components/target-form";
import { LabelsManager } from "@/components/labels-manager";
import { newId, put, remove, useItems } from "@/lib/local/store";
import { download, parseCsv, toCsv } from "@/lib/csv";
import type { Target } from "@/lib/local/types";

const listSplit = (s: string) => s.split(/[;|]/).map((x) => x.trim()).filter(Boolean);

function Targets() {
  const targets = useItems("target");
  const recordings = useItems("recording");
  const [q, setQ] = useState("");
  const [set, setSet] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [preview, setPreview] = useState<Target[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const sets = useMemo(() => [...new Set(targets.flatMap((t) => t.value.sets))].sort(), [targets]);
  const uses = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of recordings) if (r.value.targetId) m.set(r.value.targetId, (m.get(r.value.targetId) ?? 0) + 1);
    return m;
  }, [recordings]);
  const list = useMemo(() => {
    const n = q.trim().toLowerCase();
    return targets
      .filter((t) => (!set || t.value.sets.includes(set)) && (!n || `${t.value.text} ${t.value.ipa.join(" ")}`.toLowerCase().includes(n)))
      .sort((a, b) => a.value.text.localeCompare(b.value.text));
  }, [targets, q, set]);
  const paged = usePagination(list, "targets", `${q}|${set}`);

  function exportCsv() {
    const rows = [["text", "type", "ipa", "also_accept", "sets", "notes"]];
    for (const t of list) rows.push([t.value.text, t.value.type, t.value.ipa[0] ?? "", t.value.ipa.slice(1).join("; "), t.value.sets.join("; "), t.value.notes ?? ""]);
    download(`targets_${new Date().toLocaleDateString("en-CA")}.csv`, new Blob([toCsv(rows)], { type: "text/csv" }));
  }

  async function readCsv(file: File) {
    const rows = parseCsv(await file.text());
    if (!rows.length) return alert("That file is empty.");
    const head = rows[0].map((h) => h.trim().toLowerCase());
    const has = head.includes("text") || head.includes("word");
    const col = (names: string[], fallback: number) => {
      const i = head.findIndex((h) => names.includes(h));
      return has ? i : fallback;
    };
    const ci = { text: col(["text", "word", "target"], 0), ipa: col(["ipa", "ideal_ipa"], 1), alt: col(["also_accept", "variants"], 2), sets: col(["sets", "set"], 3), notes: col(["notes", "note"], 4), type: col(["type"], -1) };
    const body = has ? rows.slice(1) : rows;
    const existing = new Set(targets.map((t) => t.value.text.toLowerCase()));
    const parsed: Target[] = body
      .map((r) => {
        const text = (r[ci.text] ?? "").trim();
        const ipa = (r[ci.ipa] ?? "").trim();
        const type = (r[ci.type] ?? "").trim() as Target["type"];
        return {
          text,
          type: ["word", "phrase", "sentence"].includes(type) ? type : text.includes(" ") ? (text.split(/\s+/).length > 3 ? "sentence" : "phrase") : "word",
          ipa: [ipa, ...listSplit(r[ci.alt] ?? "")].filter(Boolean),
          sets: listSplit(r[ci.sets] ?? ""),
          notes: (r[ci.notes] ?? "").trim() || undefined,
        } as Target;
      })
      .filter((t) => t.text && t.ipa.length && !existing.has(t.text.toLowerCase()));
    setPreview(parsed);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {!adding && (
          <Button onClick={() => setAdding(true)}>
            <Plus size={18} aria-hidden="true" /> New target
          </Button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) void readCsv(f);
          }}
        />
        <Button variant="ghost" onClick={() => fileRef.current?.click()}>
          <Upload size={16} aria-hidden="true" /> Import CSV
        </Button>
        {targets.length > 0 && (
          <Button variant="ghost" onClick={exportCsv}>
            <Download size={16} aria-hidden="true" /> Export CSV
          </Button>
        )}
      </div>

      {preview && (
        <Card className="space-y-3 ring-1 ring-inset ring-border">
          <p className="font-semibold">{preview.length ? `Import ${preview.length} targets?` : "Nothing new to import."}</p>
          <p className="text-sm text-muted">Columns: text, ipa, also_accept, sets, notes. Rows without IPA, or already in your list, are skipped.</p>
          <ul className="max-h-48 space-y-1 overflow-auto text-sm">
            {preview.slice(0, 50).map((t) => (
              <li key={t.text}>
                {t.text} · <span className="ipa text-accent">{t.ipa[0]}</span>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            {preview.length > 0 && (
              <Button
                onClick={async () => {
                  for (const t of preview) await put("target", newId(), t);
                  setPreview(null);
                }}
              >
                Import
              </Button>
            )}
            <Button variant="ghost" onClick={() => setPreview(null)}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {adding && (
        <Card className="ring-1 ring-inset ring-border">
          <TargetForm onDone={() => setAdding(false)} onCancel={() => setAdding(false)} />
        </Card>
      )}

      {targets.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative block flex-1">
            <span className="sr-only">Search targets</span>
            <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search words or IPA" className="pl-11" type="search" />
          </label>
          {sets.length > 0 && (
            <label className="flex items-center gap-2 text-sm text-muted">
              <span className="shrink-0">Set</span>
              <Select value={set ?? ""} onChange={(e) => setSet(e.target.value || null)} className="sm:w-56">
                <option value="">All sets</option>
                {sets.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </label>
          )}
        </div>
      )}

      {targets.length === 0 && !adding ? (
        <EmptyState icon={<BookOpen aria-hidden="true" />} title="Build your word list">
          Add words and sentences with their ideal IPA, or import a CSV. Recordings are compared against them.
        </EmptyState>
      ) : (
        targets.length > 0 && (
          <>
            <div className="overflow-hidden rounded-[28px] bg-card ring-1 ring-inset ring-border">
              <div className={`hidden px-5 py-3 text-xs font-semibold text-muted ${COLS}`} aria-hidden="true">
                <span>Target</span>
                <span>Ideal IPA</span>
                <span>Sets</span>
                <span className="text-right">Used</span>
                <span />
              </div>
              {paged.slice.length === 0 ? (
                <p className="px-5 py-10 text-center text-muted">Nothing matches. Try another search or set.</p>
              ) : (
                <ul className="divide-y divide-border md:border-t md:border-border">
                  {paged.slice.map((t) =>
                    editing === t.id ? (
                      <li key={t.id} className="bg-surface/40 p-5">
                        <TargetForm id={t.id} initial={t.value} onDone={() => setEditing(null)} onCancel={() => setEditing(null)} />
                      </li>
                    ) : (
                      <li key={t.id} className={`flex items-center gap-3 px-5 py-3.5 ${COLS}`}>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold">{t.value.text}</p>
                          <p className="ipa truncate text-accent md:hidden">
                            /{t.value.ipa[0]}/{t.value.ipa.length > 1 && <span className="text-muted"> +{t.value.ipa.length - 1}</span>}
                          </p>
                          <p className="text-xs text-muted">{t.value.type === "word" ? "Word" : t.value.type === "phrase" ? "Phrase" : "Sentence"}</p>
                        </div>
                        <p className="ipa hidden truncate text-lg text-accent md:block">
                          /{t.value.ipa[0]}/
                          {t.value.ipa.length > 1 && (
                            <span className="ml-1 font-sans text-xs font-semibold text-muted" title={t.value.ipa.slice(1).join(", ")}>
                              +{t.value.ipa.length - 1} accepted
                            </span>
                          )}
                        </p>
                        <div className="hidden min-w-0 flex-wrap gap-1 md:flex">
                          {t.value.sets.length ? (
                            t.value.sets.map((s) => (
                              <button
                                key={s}
                                type="button"
                                onClick={() => setSet(s)}
                                className="truncate rounded-full bg-surface px-2.5 py-0.5 text-xs font-semibold text-accent hover:bg-accent hover:text-accent-fg"
                              >
                                {s}
                              </button>
                            ))
                          ) : (
                            <span className="text-sm text-muted">—</span>
                          )}
                        </div>
                        <span className="hidden text-right text-sm tabular-nums text-text/80 md:block">{uses.get(t.id) ?? 0}</span>
                        <div className="flex shrink-0 justify-end">
                          <IconButton label={`Edit ${t.value.text}`} onClick={() => setEditing(t.id)}>
                            <Pencil size={16} />
                          </IconButton>
                          <IconButton
                            label={`Delete ${t.value.text}`}
                            className="text-danger"
                            onClick={async () => {
                              if (confirm(`Delete "${t.value.text}"? Recordings keep their copy of the target.`)) await remove(t.id);
                            }}
                          >
                            <Trash2 size={16} />
                          </IconButton>
                        </div>
                      </li>
                    ),
                  )}
                </ul>
              )}
            </div>
            <Pagination p={paged} noun={["target", "targets"]} />
          </>
        )
      )}
    </div>
  );
}

function LibraryView() {
  const params = useSearchParams();
  const router = useRouter();
  const tab = params.get("tab") === "labels" ? "labels" : "targets";
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[clamp(2rem,8vw,2.5rem)] font-medium leading-[1.1] tracking-[-0.03em]">Library</h1>
          <p className="mt-1 text-sm text-muted">{tab === "targets" ? "Your words and sentences, with the pronunciation you expect." : "Tags for recordings and errors, and sounds you count as the same."}</p>
        </div>
        <Segmented
          label="Library section"
          value={tab}
          onChange={(v) => router.replace(v === "labels" ? "/app/library?tab=labels" : "/app/library")}
          options={[
            { value: "targets", label: "Targets" },
            { value: "labels", label: "Labels" },
          ]}
        />
      </div>
      {tab === "targets" ? (
        <Targets />
      ) : (
        <div className="max-w-2xl">
          <LabelsManager />
        </div>
      )}
    </div>
  );
}

export default function LibraryPage() {
  return (
    <Suspense>
      <LibraryView />
    </Suspense>
  );
}
