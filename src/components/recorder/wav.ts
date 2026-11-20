/** 16-bit PCM mono WAV. Kept at the capture rate (usually 48 kHz): no resampling, nothing lost for analysis. */
export function encodeWav(samples: Float32Array, rate: number) {
  const view = new DataView(new ArrayBuffer(44 + samples.length * 2));
  const str = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
  };
  str(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  str(8, "WAVE");
  str(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  str(36, "data");
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([view], { type: "audio/wav" });
}

export function joinChunks(chunks: Float32Array[]) {
  const out = new Float32Array(chunks.reduce((n, c) => n + c.length, 0));
  let o = 0;
  for (const c of chunks) {
    out.set(c, o);
    o += c.length;
  }
  return out;
}

/** Imported files (m4a, mp3, wav…): decode with the browser, mix to mono, re-encode as WAV. */
export async function fileToWav(file: Blob, maxMs: number) {
  const rate = 48_000;
  const ctx = new OfflineAudioContext(1, 1, rate);
  const buf = await ctx.decodeAudioData(await file.arrayBuffer());
  const len = Math.min(buf.length, Math.floor((maxMs / 1000) * buf.sampleRate));
  const mono = new Float32Array(len);
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) mono[i] += d[i] / buf.numberOfChannels;
  }
  return { blob: encodeWav(mono, buf.sampleRate), durationMs: Math.round((len / buf.sampleRate) * 1000), sampleRate: buf.sampleRate, truncated: len < buf.length };
}
