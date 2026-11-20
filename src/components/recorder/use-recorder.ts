"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MAX_RECORDING_MS } from "@/lib/constants";
import { encodeWav, joinChunks } from "./wav";

export type RecorderState = "idle" | "starting" | "recording" | "processing" | "recorded";
export type Take = { blob: Blob; url: string; durationMs: number; sampleRate: number };

/**
 * AudioWorklet capture (from collect.tiniglabs.digital). Echo cancellation, noise suppression and
 * auto gain are off so the clip is what the patient actually produced.
 */
export function useRecorder() {
  const [state, setState] = useState<RecorderState>("idle");
  const [level, setLevel] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [take, setTake] = useState<Take | null>(null);

  const stream = useRef<MediaStream | null>(null);
  const ctx = useRef<AudioContext | null>(null);
  const chunks = useRef<Float32Array[]>([]);
  const startedAt = useRef(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const ensureStream = useCallback(async () => {
    if (stream.current?.active) return stream.current;
    stream.current = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
    return stream.current;
  }, []);

  const setResult = useCallback((t: Take | null) => {
    setTake((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return t;
    });
  }, []);

  const stop = useCallback(async () => {
    if (!ctx.current) return;
    if (timer.current) clearInterval(timer.current);
    setState("processing");
    const rate = ctx.current.sampleRate;
    await ctx.current.close();
    ctx.current = null;
    setLevel(0);
    const samples = joinChunks(chunks.current);
    chunks.current = [];
    const blob = encodeWav(samples, rate);
    setResult({ blob, url: URL.createObjectURL(blob), durationMs: Math.round((samples.length / rate) * 1000), sampleRate: rate });
    setState("recorded");
  }, [setResult]);

  const start = useCallback(async () => {
    setError(null);
    setState("starting");
    try {
      const s = await ensureStream();
      const ac = new AudioContext();
      await ac.audioWorklet.addModule("/worklets/pcm-capture.js");
      const node = new AudioWorkletNode(ac, "pcm-capture");
      node.port.onmessage = (e: MessageEvent<{ pcm: Float32Array; rms: number }>) => {
        chunks.current.push(e.data.pcm);
        setLevel(Math.min(1, e.data.rms * 4));
      };
      ac.createMediaStreamSource(s).connect(node);
      ctx.current = ac;
      chunks.current = [];
      startedAt.current = performance.now();
      setElapsed(0);
      timer.current = setInterval(() => {
        const ms = performance.now() - startedAt.current;
        setElapsed(ms);
        if (ms >= MAX_RECORDING_MS) void stop();
      }, 100);
      setState("recording");
    } catch (e) {
      setState("idle");
      setError(
        e instanceof DOMException && e.name === "NotAllowedError"
          ? "Microphone blocked. Allow it in your browser settings."
          : "Couldn't start the microphone.",
      );
    }
  }, [ensureStream, stop]);

  const reset = useCallback(() => {
    setResult(null);
    setElapsed(0);
    setState("idle");
  }, [setResult]);

  /** Use an imported file as the take. */
  const setFromFile = useCallback(
    (t: Omit<Take, "url">) => {
      setResult({ ...t, url: URL.createObjectURL(t.blob) });
      setState("recorded");
    },
    [setResult],
  );

  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
      void ctx.current?.close();
      stream.current?.getTracks().forEach((t) => t.stop());
    },
    [],
  );

  return { state, level, elapsed, error, take, start, stop, reset, setFromFile };
}
