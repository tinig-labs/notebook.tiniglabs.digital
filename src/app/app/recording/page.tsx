"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Check, ListChecks, Download, LoaderCircle, RefreshCw, Trash2, X } from "lucide-react";
import { Button, EmptyState, Field, IconButton, Input, Textarea } from "@/components/ui";
import { IpaStatus, LabelPicker, RecordingPlayer, useLabels } from "@/components/notebook";
import { audioBlob, getItem, put, remove, useItem } from "@/lib/local/store";
import { IpaReview } from "@/components/ipa-review";
import { fetchAudio, requestTranscription, useSyncStatus } from "@/lib/local/sync";
import { fmtDay, fmtDuration, fmtTime, slug } from "@/lib/format";
import type { Recording } from "@/lib/local/types";

const EDITABLE = ["target", "labelIds", "notes"] as const;

function Editor({ id, initial, patientName }: { id: string; initial: Recording; patientName: string }) {
  const labels = useLabels();
  const [v, setV] = useState(initial);
  const [saved, setSaved] = useState(false);
  // Only the fields this form edits; the patient's IPA and marks are saved by the tiles above.
  const pick = (x: Recording) => JSON.stringify(EDITABLE.map((k) => x[k] ?? null));
  const dirty = pick(v) !== pick(initial);

  async function save() {
    // Merge onto the latest stored copy, so marks saved meanwhile aren't overwritten.
    const cur = (getItem(id)?.value as Recording | undefined) ?? initial;
    const next = { ...cur } as Recording;
    for (const k of EDITABLE) (next as Record<string, unknown>)[k] = v[k];
    await put("recording", id, next, cur.patientId);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <>
      <section aria-labelledby="details-title" className="space-y-4 rounded-[28px] bg-card p-5 ring-1 ring-inset ring-border sm:p-6">
        <h2 id="details-title" className="font-semibold">
          Details
        </h2>
        {!v.targetId && (
          <Field label="Target">
            <Input value={v.target ?? ""} onChange={(e) => setV({ ...v, target: e.target.value })} maxLength={120} />
          </Field>
        )}
        <div className="space-y-2">
          <span className="text-sm font-medium text-muted">Labels</span>
          <LabelPicker value={v.labelIds} onChange={(labelIds) => setV({ ...v, labelIds })} labels={labels} />
        </div>
        <Field label="Notes">
          <Textarea value={v.notes ?? ""} onChange={(e) => setV({ ...v, notes: e.target.value })} maxLength={4000} />
        </Field>
        <Button onClick={save} disabled={!dirty} className="h-12">
          <Check size={18} aria-hidden="true" /> {saved ? "Saved" : "Save changes"}
        </Button>
      </section>
      <DownloadWav id={id} name={`${slug(patientName)}_${new Date(v.recordedAt).toLocaleDateString("en-CA")}_${slug(v.target ?? "clip")}.wav`} />
    </>
  );
}

function DownloadWav({ id, name }: { id: string; name: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="ghost"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const b = await audioBlob(id, fetchAudio);
          if (!b) return alert("Audio isn't on this device yet. Connect and try again.");
          const a = document.createElement("a");
          a.href = URL.createObjectURL(b);
          a.download = name;
          a.click();
          setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
        } finally {
          setBusy(false);
        }
      }}
    >
      <Download size={18} aria-hidden="true" /> Download WAV
    </Button>
  );
}

function RecordingView() {
  const id = useSearchParams().get("id");
  const router = useRouter();
  const rec = useItem("recording", id);
  const patient = useItem("patient", rec?.value.patientId);
  const transcript = useItem("transcript", id ? `t_${id}` : null);
  const sync = useSyncStatus();

  if (!rec || !id)
    return (
      <EmptyState icon={<X aria-hidden="true" />} title="Recording not found">
        <Link href="/app" className="font-semibold text-accent">
          Back to patients
        </Link>
      </EmptyState>
    );
  const r = rec.value;
  const progress = rec.ipaStatus === "queued"
    ? sync.state === "offline"
      ? "Queued until you're back online."
      : sync.state === "signed-out"
        ? "Queued. Sign in again to send it."
        : "Transcribing… this can take a minute."
    : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href={`/app/patient?id=${r.patientId}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-text/70 hover:text-text">
        <ArrowLeft size={16} aria-hidden="true" /> {patient?.value.name ?? "Patient"}
      </Link>

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{r.target || "Untitled"}</h1>
          <p className="mt-1 text-sm text-muted">
            {fmtDay(r.recordedAt)} · {fmtTime(r.recordedAt)} · {fmtDuration(r.durationMs)} · {Math.round(r.sampleRate / 100) / 10} kHz
          </p>
        </div>
        <IconButton
          label="Delete recording"
          className="text-danger"
          onClick={async () => {
            if (!confirm("Delete this recording? This can't be undone.")) return;
            await remove(id);
            router.replace(`/app/patient?id=${r.patientId}`);
          }}
        >
          <Trash2 size={18} />
        </IconButton>
      </div>

      <RecordingPlayer id={id} />

      <section aria-labelledby="review-title" className="space-y-4 rounded-[28px] bg-surface p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <h2 id="review-title" className="flex items-center gap-2 font-semibold">
            <ListChecks size={18} className="text-accent" aria-hidden="true" /> Patient&apos;s IPA vs target
          </h2>
          <div className="flex items-center gap-2">
            <IpaStatus status={rec.ipaStatus === "failed" ? "failed" : undefined} />
            {rec.ipaStatus !== "queued" && (
              <Button variant="secondary" className="h-9 px-3" onClick={() => void requestTranscription(id)}>
                <RefreshCw size={14} aria-hidden="true" /> {transcript ? "Transcribe again" : "Transcribe"}
              </Button>
            )}
          </div>
        </div>
        {progress && (
          <p role="status" className="flex items-center gap-2 text-sm text-muted">
            <LoaderCircle size={14} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> {progress}
          </p>
        )}
        <IpaReview id={id} recording={r} modelIpa={transcript?.value.ipa || null} />
      </section>

      <Editor key={id} id={id} initial={r} patientName={patient?.value.name ?? "patient"} />
    </div>
  );
}

export default function RecordingPage() {
  return (
    <Suspense>
      <RecordingView />
    </Suspense>
  );
}
