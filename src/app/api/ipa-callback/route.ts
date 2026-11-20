import { finishTranscription } from "@/lib/transcribe";
import { isModalCaller } from "@/lib/modal";

/** Modal posts each finished transcription here (see modal/notebook_phonemes.py). */
export async function POST(r: Request) {
  if (!(await isModalCaller(r.headers.get("authorization")))) return new Response("Unauthorized", { status: 401 });
  const b = (await r.json().catch(() => null)) as
    | { job_id?: string; model?: string; ipa?: string; segments?: { start: number; end: number; ipa: string }[]; error?: string }
    | null;
  const id = b?.job_id;
  if (!id || !/^[A-Za-z0-9_-]{8,64}$/.test(id)) return Response.json({ error: "bad job_id" }, { status: 400 });
  if (typeof b.error === "string") {
    await finishTranscription(id, { error: b.error });
  } else {
    if (typeof b.ipa !== "string" || !Array.isArray(b.segments) || typeof b.model !== "string") {
      return Response.json({ error: "bad result" }, { status: 400 });
    }
    const segments = b.segments
      .slice(0, 100)
      .map((s) => ({ start: Number(s.start) || 0, end: Number(s.end) || 0, ipa: String(s.ipa ?? "").slice(0, 2000) }));
    await finishTranscription(id, { model: b.model.slice(0, 120), ipa: b.ipa.slice(0, 8000), segments });
  }
  return Response.json({ ok: true });
}
