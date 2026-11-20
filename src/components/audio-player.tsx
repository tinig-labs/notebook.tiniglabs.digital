"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

const BARS = 56;

/** Peak amplitude per bar, normalised to 0..1. Null while loading or if the audio can't be read. */
function usePeaks(src: string, enabled: boolean) {
  const [peaks, setPeaks] = useState<{ src: string; values: number[] } | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    const ctl = new AbortController();
    (async () => {
      try {
        const buf = await fetch(src, { signal: ctl.signal }).then((r) => {
          if (!r.ok) throw new Error();
          return r.arrayBuffer();
        });
        const ctx = new OfflineAudioContext(1, 1, 16000);
        const data = (await ctx.decodeAudioData(buf)).getChannelData(0);
        const step = Math.max(1, Math.floor(data.length / BARS));
        const out = Array.from({ length: BARS }, (_, i) => {
          let m = 0;
          for (let j = i * step; j < Math.min(data.length, (i + 1) * step); j++) m = Math.max(m, Math.abs(data[j]));
          return m;
        });
        const max = Math.max(...out, 1e-3);
        if (live) setPeaks({ src, values: out.map((v) => Math.max(0.08, v / max)) });
      } catch {
        // Fall back to a flat waveform; playback itself doesn't depend on this.
      }
    })();
    return () => {
      live = false;
      ctl.abort();
    };
  }, [src, enabled]);
  return peaks?.src === src ? peaks.values : null;
}

const fmt = (s: number) => {
  if (!Number.isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
};

export function AudioPlayer({
  src,
  rates,
  rate = 1,
  onRateChange,
  audioRef,
  label = "Recording",
  lazy = false,
}: {
  src: string;
  rates?: number[];
  rate?: number;
  onRateChange?: (r: number) => void;
  audioRef?: RefObject<HTMLAudioElement | null>;
  label?: string;
  /** For lists: fetch nothing until the first play. */
  lazy?: boolean;
}) {
  const own = useRef<HTMLAudioElement | null>(null);
  const el = audioRef ?? own;
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [started, setStarted] = useState(!lazy);
  const peaks = usePeaks(src, started);

  useEffect(() => {
    if (el.current) el.current.playbackRate = rate;
  }, [el, rate, src]);

  const toggle = () => {
    const a = el.current;
    if (!a) return;
    if (a.paused) void a.play();
    else a.pause();
  };

  const seek = (frac: number) => {
    const a = el.current;
    if (!a || !duration) return;
    a.currentTime = Math.min(duration, Math.max(0, frac * duration));
    setTime(a.currentTime);
  };

  const progress = duration ? time / duration : 0;

  return (
    <div className="flex w-full items-center gap-3 rounded-[20px] bg-surface p-2 pr-4">
      <audio
        ref={el}
        src={src}
        preload={lazy ? "none" : "auto"}
        onPlay={() => {
          setPlaying(true);
          setStarted(true);
        }}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onDurationChange={(e) => setDuration(e.currentTarget.duration)}
      />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? `Pause ${label.toLowerCase()}` : `Play ${label.toLowerCase()}`}
        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-fg transition-[background-color,transform] hover:bg-accent-hover active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {playing ? (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
            <rect x="6" y="5" width="4" height="14" rx="1.2" />
            <rect x="14" y="5" width="4" height="14" rx="1.2" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true" className="translate-x-px">
            <path d="M7 5.2v13.6a1 1 0 0 0 1.5.86l11-6.8a1 1 0 0 0 0-1.72l-11-6.8A1 1 0 0 0 7 5.2Z" />
          </svg>
        )}
      </button>

      <div
        role="slider"
        tabIndex={0}
        aria-label={`${label} position`}
        aria-valuemin={0}
        aria-valuemax={Math.round(duration * 10) / 10}
        aria-valuenow={Math.round(time * 10) / 10}
        aria-valuetext={`${fmt(time)} of ${fmt(duration)}`}
        onPointerDown={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          seek((e.clientX - r.left) / r.width);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") seek((time + 1) / duration);
          else if (e.key === "ArrowLeft") seek((time - 1) / duration);
          else return;
          e.preventDefault();
        }}
        className="flex h-10 min-w-0 flex-1 cursor-pointer items-center gap-[2px] rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
      >
        {Array.from({ length: BARS }, (_, i) => {
          const h = peaks ? peaks[i] : 0.18;
          const on = (i + 0.5) / BARS <= progress;
          return (
            <span
              key={i}
              aria-hidden="true"
              className={`min-w-px flex-1 rounded-full transition-colors duration-150 ${on ? "bg-accent" : "bg-text/20"}`}
              style={{ height: `${Math.round(h * 100)}%` }}
            />
          );
        })}
      </div>

      <span className="hidden w-[4.5rem] shrink-0 text-right text-xs font-medium text-muted tabular-nums min-[420px]:inline">
        {fmt(time)} / {fmt(duration)}
      </span>

      {rates && onRateChange && (
        <div className="inline-flex shrink-0 gap-0.5 rounded-full bg-card p-0.5 text-xs" role="group" aria-label="Playback speed">
          {rates.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onRateChange(r)}
              aria-pressed={rate === r}
              className={`rounded-full px-2.5 py-1 font-semibold transition-colors ${rate === r ? "bg-accent text-accent-fg" : "text-text/60 hover:text-text"}`}
            >
              {r}×
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
