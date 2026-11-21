"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, FileAudio, Mic, RotateCcw, ShieldAlert, Square, Users } from "lucide-react";
import { Button, EmptyState, Field, Select } from "@/components/ui";
import { AudioPlayer } from "@/components/audio-player";
import { LabelPicker, useLabels } from "@/components/notebook";
import { TargetPicker, type PickedTarget } from "@/components/target-picker";
import { FormError } from "@/components/auth/auth-shell";
import { useRecorder } from "@/components/recorder/use-recorder";
import { fileToWav } from "@/components/recorder/wav";
import { newId, put, saveAudio, useItems } from "@/lib/local/store";
import { requestTranscription } from "@/lib/local/sync";
import { getMeta, setMeta } from "@/lib/local/db";
import { MAX_RECORDING_MS, MIN_RECORDING_MS } from "@/lib/constants";
import { fmtDuration } from "@/lib/format";

/**
 * Recording station. Left: who and what (patient, target, labels). Right: a flashcard showing the
 * target large enough for the patient to read across the table, with the record button on it.
 */
function RecordView() {
  const params = useSearchParams();
  const router = useRouter();
  const patients = useItems("patient", (p) => !p.value.archived);
  const labels = useLabels();
  const [patientId, setPatientId] = useState(params.get("patient") ?? "");
  const [labelIds, setLabelIds] = useState<string[]>([]);
  // Kept after saving: SLPs usually record several trials of the same target.
  const [target, setTarget] = useState<PickedTarget>({ text: "" });
  const [autoIpa, setAutoIpa] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(0);
  // Trials saved per patient + target during this visit, for drill runs.
  const [trials, setTrials] = useState<Record<string, number>>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const rec = useRecorder();

  // Remember the last labels used, so a run of drills keeps its tags.
  useEffect(() => {
    void getMeta<string[]>("lastLabels").then((l) => l && setLabelIds(l));
    void getMeta<boolean>("autoIpa").then((v) => v !== undefined && setAutoIpa(v));
  }, []);

  const patient = patients.find((p) => p.id === patientId);
  const sorted = [...patients].sort((a, b) => a.value.name.localeCompare(b.value.name));
  const trialKey = `${patientId}|${target.id ?? target.text.trim()}`;

  if (!patients.length)
    return (
      <EmptyState icon={<Users aria-hidden="true" />} title="Add a patient first">
        <Link href="/app" className="font-semibold text-accent">
          Go to patients
        </Link>
      </EmptyState>
    );

  async function save() {
    if (!rec.take || !patient) return;
    if (rec.take.durationMs < MIN_RECORDING_MS) return setError("Too short. Record again.");
    setSaving(true);
    setError(null);
    try {
      const id = newId();
      await saveAudio(id, rec.take.blob);
      await put(
        "recording",
        id,
        {
          patientId: patient.id,
          recordedAt: Date.now(),
          durationMs: rec.take.durationMs,
          sampleRate: rec.take.sampleRate,
          labelIds: labelIds.filter((l) => labels.some((x) => x.id === l)),
          target: target.text.trim() || undefined,
          targetId: target.id,
          targetIpa: target.id ? target.ipa : undefined,
        },
        patient.id,
      );
      await setMeta("lastLabels", labelIds);
      if (autoIpa) await requestTranscription(id);
      rec.reset();
      setSaved((n) => n + 1);
      setTrials((t) => ({ ...t, [trialKey]: (t[trialKey] ?? 0) + 1 }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save.");
    } finally {
      setSaving(false);
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setError(null);
    try {
      const w = await fileToWav(f, MAX_RECORDING_MS);
      rec.setFromFile({ blob: w.blob, durationMs: w.durationMs, sampleRate: w.sampleRate });
      if (w.truncated) setError(`Only the first ${MAX_RECORDING_MS / 60000} minutes were kept.`);
    } catch {
      setError("Couldn't read that file. Try WAV, M4A or MP3.");
    }
  }

  const recording = rec.state === "recording";
  const remaining = Math.max(0, MAX_RECORDING_MS - rec.elapsed);
  const blocked = !!patient && !patient.value.consent?.given;
  const trialsHere = trials[trialKey] ?? 0;
  const word = target.text.trim();
  // Long phrases step down so they still fit the card.
  const wordSize = word.length > 40 ? "text-[clamp(1.5rem,5vw,2.25rem)]" : word.length > 14 ? "text-[clamp(2rem,7vw,3.25rem)]" : "text-[clamp(3rem,13vw,5.5rem)]";

  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:items-start">
      <section aria-labelledby="setup-title" className="space-y-5 rounded-card bg-card p-5 ring-1 ring-inset ring-border sm:p-6 lg:sticky lg:top-6">
        <h1 id="setup-title" className="text-2xl font-semibold tracking-tight">
          Record
        </h1>
        <Field label="Patient">
          <Select value={patientId} onChange={(e) => setPatientId(e.target.value)} disabled={recording}>
            <option value="">Choose…</option>
            {sorted.map((p) => (
              <option key={p.id} value={p.id}>
                {p.value.name}
              </option>
            ))}
          </Select>
        </Field>
        <div className="space-y-2">
          <span className="text-sm font-medium text-muted">Target</span>
          <TargetPicker value={target} onChange={setTarget} disabled={recording} />
        </div>
        <div className="space-y-2">
          <span className="text-sm font-medium text-muted">Labels</span>
          <LabelPicker value={labelIds} onChange={setLabelIds} labels={labels} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={autoIpa}
            onChange={(e) => {
              setAutoIpa(e.target.checked);
              void setMeta("autoIpa", e.target.checked);
            }}
            className="size-4 accent-[var(--pandan)]"
          />
          Transcribe to IPA when online
        </label>
      </section>

      <section aria-label="Recorder" className="space-y-3">
        <div
          className={`relative flex min-h-[22rem] flex-col items-center justify-between gap-6 overflow-hidden rounded-card p-6 text-center transition-colors sm:min-h-[26rem] sm:p-10 ${
            recording ? "bg-[var(--soda-o-tint)]" : "bg-surface"
          }`}
        >
          <div className="flex w-full items-center justify-between gap-3 text-sm">
            <span className="truncate font-semibold text-text/70">{patient ? patient.value.name : "No patient chosen"}</span>
            {trialsHere > 0 && (
              <span className="flex shrink-0 items-center gap-1.5 font-semibold text-accent">
                <span className="flex items-center gap-1" aria-hidden="true">
                  {Array.from({ length: Math.min(trialsHere, 8) }, (_, i) => (
                    <span key={i} className="size-2 rounded-full bg-accent" />
                  ))}
                </span>
                {trialsHere} trial{trialsHere === 1 ? "" : "s"}
              </span>
            )}
          </div>

          <div className="flex min-w-0 max-w-full flex-1 flex-col items-center justify-center gap-3">
            {word ? (
              <>
                <p className={`${wordSize} max-w-full break-words font-medium leading-[1.05] tracking-[-0.03em]`}>{word}</p>
                {target.ipa?.[0] ? (
                  <p className="ipa text-xl text-accent sm:text-2xl">/{target.ipa[0]}/</p>
                ) : (
                  <p className="text-sm text-muted">Not in your library, so it won&apos;t be compared with IPA.</p>
                )}
              </>
            ) : (
              <p className="max-w-[24ch] text-lg text-muted">Pick a target to show it here, or record without one.</p>
            )}
          </div>

          {blocked ? (
            <div className="flex items-start gap-3 rounded-panel bg-card p-4 text-left text-sm text-danger">
              <ShieldAlert size={20} className="shrink-0" aria-hidden="true" />
              <span>
                Record consent before recording.{" "}
                <Link href={`/app/patient?id=${patient!.id}`} className="font-semibold underline underline-offset-4">
                  Open patient
                </Link>
              </span>
            </div>
          ) : rec.state === "recorded" && rec.take ? (
            <div className="w-full max-w-md space-y-3">
              <AudioPlayer src={rec.take.url} label="Take" />
              <div className="flex gap-2">
                <Button onClick={save} disabled={saving || !patient} className="h-14 flex-1 text-base">
                  <Check size={20} aria-hidden="true" /> {saving ? "Saving…" : "Save take"}
                </Button>
                <Button variant="secondary" onClick={rec.reset} className="h-14">
                  <RotateCcw size={18} aria-hidden="true" /> Retake
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={recording ? rec.stop : rec.start}
                disabled={!patient || rec.state === "starting" || rec.state === "processing"}
                aria-label={recording ? "Stop recording" : "Start recording"}
                className={`relative flex size-24 items-center justify-center rounded-full text-white transition-[background-color,transform] active:scale-95 disabled:opacity-40 ${
                  recording ? "bg-danger" : "bg-accent hover:bg-accent-hover"
                }`}
              >
                {recording && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 rounded-full bg-danger/25 motion-reduce:hidden"
                    style={{ transform: `scale(${1 + rec.level * 0.4})`, transition: "transform 80ms linear" }}
                  />
                )}
                {recording ? <Square size={30} fill="currentColor" className="relative" /> : <Mic size={36} />}
              </button>
              <p className="text-sm font-semibold tabular-nums text-muted" aria-live="polite">
                {recording ? `${fmtDuration(rec.elapsed)} · ${fmtDuration(remaining)} left` : patient ? "Tap to record" : "Choose a patient first"}
              </p>
            </div>
          )}
          {recording && (
            <div className="absolute inset-x-0 bottom-0 h-1.5 bg-card/70" aria-hidden="true">
              <div className="h-full bg-danger transition-[width] duration-75" style={{ width: `${Math.round(rec.level * 100)}%` }} />
            </div>
          )}
        </div>

        {(rec.error || error) && (
          <div className="px-2">
            {rec.error && <FormError message={rec.error} />}
            <FormError message={error} />
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 px-1">
          {!recording && rec.state !== "recorded" && !blocked ? (
            <>
              <input ref={fileRef} type="file" accept="audio/*" className="hidden" onChange={onFile} />
              <Button variant="ghost" onClick={() => fileRef.current?.click()} disabled={!patient}>
                <FileAudio size={18} aria-hidden="true" /> Import audio file
              </Button>
            </>
          ) : (
            <span />
          )}
          {saved > 0 && patient && (
            <p role="status" className="flex items-center gap-2 text-sm">
              <Check size={16} className="text-accent" aria-hidden="true" /> {saved} saved this session
              <button type="button" onClick={() => router.push(`/app/patient?id=${patient.id}`)} className="font-semibold text-accent underline-offset-4 hover:underline">
                View
              </button>
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

export default function RecordPage() {
  return (
    <Suspense>
      <RecordView />
    </Suspense>
  );
}
