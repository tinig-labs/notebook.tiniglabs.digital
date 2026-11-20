"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Clock, LoaderCircle, Pause, Play, Sparkles } from "lucide-react";
import { AudioPlayer } from "./audio-player";
import { audioUrl, useItems } from "@/lib/local/store";
import { fetchAudio } from "@/lib/local/sync";
import { LABEL_STYLES, type Item, type Label } from "@/lib/local/types";

/** Shared pieces of the notebook screens. */

/** Labels of one scope. Labels saved before scopes existed are recording labels. */
export function useLabels(scope: "recording" | "error" | "equiv" = "recording") {
  const labels = useItems("label", (l) => (l.value.scope ?? "recording") === scope, [scope]);
  return [...labels].sort((a, b) => a.value.name.localeCompare(b.value.name));
}

export function LabelPill({ label, size = "sm" }: { label: Item<"label">; size?: "sm" | "xs" }) {
  const s = LABEL_STYLES[label.value.color] ?? LABEL_STYLES.pandan;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${s.chip} ${size === "sm" ? "px-3 py-1 text-xs" : "px-2 py-0.5 text-[0.6875rem]"}`}>
      <span className={`size-1.5 rounded-full ${s.dot}`} aria-hidden="true" />
      {label.value.name}
    </span>
  );
}

export function LabelPicker({ value, onChange, labels }: { value: string[]; onChange: (ids: string[]) => void; labels: Item<"label">[] }) {
  if (!labels.length) return <p className="text-sm text-muted">No labels yet. Add some in Labels.</p>;
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Labels">
      {labels.map((l) => {
        const on = value.includes(l.id);
        const s = LABEL_STYLES[l.value.color as Label["color"]] ?? LABEL_STYLES.pandan;
        return (
          <button
            key={l.id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((v) => v !== l.id) : [...value, l.id])}
            className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition-colors ${
              on ? "bg-accent text-accent-fg" : `${s.chip} hover:brightness-95`
            }`}
          >
            <span className={`size-2 rounded-full ${on ? "bg-white" : s.dot}`} aria-hidden="true" />
            {l.value.name}
          </button>
        );
      })}
    </div>
  );
}

/** Full waveform player. Decrypts locally (or downloads the ciphertext first). */
export function RecordingPlayer({ id, label = "Recording" }: { id: string; label?: string }) {
  const [state, setState] = useState<{ id: string; url: string | null; failed: boolean } | null>(null);
  const [rate, setRate] = useState(1);
  useEffect(() => {
    let live = true;
    audioUrl(id, fetchAudio)
      .then((url) => live && setState({ id, url, failed: !url }))
      .catch(() => live && setState({ id, url: null, failed: true }));
    return () => {
      live = false;
    };
  }, [id]);
  const s = state?.id === id ? state : null;
  if (!s)
    return (
      <div className="flex h-14 items-center gap-2 rounded-[20px] bg-surface px-4 text-sm text-muted">
        <LoaderCircle size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> Loading audio…
      </div>
    );
  if (!s.url)
    return (
      <div className="flex h-14 items-center gap-2 rounded-[20px] bg-surface px-4 text-sm text-muted">
        <AlertCircle size={16} aria-hidden="true" /> Audio not on this device yet. Connect to download it.
      </div>
    );
  return <AudioPlayer src={s.url} label={label} rates={[0.5, 0.75, 1]} rate={rate} onRateChange={setRate} />;
}

/** Compact play/pause for lists: loads audio only when tapped. */
let current: HTMLAudioElement | null = null;
export function PlayButton({ id, label }: { id: string; label: string }) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [st, setSt] = useState<"idle" | "loading" | "playing" | "error">("idle");

  useEffect(() => () => audio.current?.pause(), []);

  async function toggle() {
    if (st === "playing") {
      audio.current?.pause();
      return;
    }
    if (!audio.current) {
      setSt("loading");
      const url = await audioUrl(id, fetchAudio).catch(() => null);
      if (!url) return setSt("error");
      const a = new Audio(url);
      a.onplay = () => setSt("playing");
      a.onpause = a.onended = () => setSt("idle");
      audio.current = a;
    }
    if (current && current !== audio.current) current.pause();
    current = audio.current;
    void audio.current.play();
  }

  const Icon = st === "playing" ? Pause : st === "loading" ? LoaderCircle : st === "error" ? AlertCircle : Play;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void toggle();
      }}
      aria-label={st === "playing" ? `Pause ${label}` : `Play ${label}`}
      title={st === "error" ? "Audio not on this device yet" : undefined}
      className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-fg transition-[background-color,transform] hover:bg-accent-hover active:scale-95"
    >
      <Icon size={18} className={st === "loading" ? "animate-spin motion-reduce:animate-none" : st === "idle" ? "translate-x-px" : ""} aria-hidden="true" />
    </button>
  );
}

export function IpaStatus({ status }: { status?: "none" | "queued" | "done" | "failed" }) {
  if (status === "queued")
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted">
        <Clock size={13} aria-hidden="true" /> IPA queued
      </span>
    );
  if (status === "failed")
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-danger">
        <AlertCircle size={13} aria-hidden="true" /> IPA failed
      </span>
    );
  if (status === "done")
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-accent">
        <Sparkles size={13} aria-hidden="true" /> IPA
      </span>
    );
  return null;
}
