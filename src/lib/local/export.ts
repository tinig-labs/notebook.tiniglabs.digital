"use client";
import { zip, type Zippable } from "fflate";
import { allItems, audioBlob } from "./store";
import { api, fetchAudio } from "./sync";
import type { Item, Label, Patient, Recording, Target, Transcript } from "./types";
import { equivalencesOf, errorSummary, reviewRecording } from "@/lib/ipa/review";
import { pct } from "@/lib/ipa/compare";
import { slug } from "@/lib/format";

/**
 * Builds a ZIP on this device: decrypted WAVs, a CSV and full JSON. Works offline for audio already
 * on the device; anything missing is downloaded first (or listed in MISSING.txt).
 */
export async function exportZip(patientIds?: string[], onProgress?: (done: number, total: number) => void) {
  const items = allItems();
  const patients = items.filter((i): i is Item<"patient"> => i.kind === "patient" && (!patientIds || patientIds.includes(i.id)));
  const pset = new Set(patients.map((p) => p.id));
  const recordings = items.filter((i): i is Item<"recording"> => i.kind === "recording" && pset.has((i.value as Recording).patientId));
  const labelItems = items.filter((i): i is Item<"label"> => i.kind === "label");
  const labels = new Map(labelItems.map((l) => [l.id, (l.value as Label).name]));
  const targets = new Map(items.filter((i): i is Item<"target"> => i.kind === "target").map((t) => [t.id, t.value as Target]));
  const equivalences = equivalencesOf(labelItems);
  const transcripts = new Map(
    items.filter((i): i is Item<"transcript"> => i.kind === "transcript").map((t) => [(t.value as Transcript).recordingId, t.value as Transcript]),
  );

  const files: Zippable = {};
  const missing: string[] = [];
  const rows = [
    ["patient", "recorded_at", "target", "ideal_ipa", "labels", "duration_s", "sample_rate", "ipa_slp", "ipa_reviewed", "ipa_model", "model", "compared_ipa", "pcc", "per", "fer", "errors", "notes", "file"],
  ];
  const folders = new Map<string, string>();
  const folder = (p: Item<"patient">) => {
    let f = folders.get(p.id);
    if (!f) {
      f = slug((p.value as Patient).name);
      while ([...folders.values()].includes(f)) f += "-2";
      folders.set(p.id, f);
    }
    return f;
  };

  let done = 0;
  for (const r of recordings.sort((a, b) => a.value.recordedAt - b.value.recordedAt)) {
    const p = patients.find((x) => x.id === r.value.patientId)!;
    const v = r.value;
    const stamp = new Date(v.recordedAt).toISOString().replace(/[:T]/g, "-").slice(0, 19);
    const path = `${folder(p)}/${stamp}_${slug(v.target ?? "clip")}_${r.id.slice(0, 6)}.wav`;
    const wav = await audioBlob(r.id, fetchAudio).catch(() => null);
    if (wav) files[path] = [new Uint8Array(await wav.arrayBuffer()), { level: 0 }];
    else missing.push(path);
    const t = transcripts.get(r.id);
    const rv = reviewRecording(v, { transcript: t, target: v.targetId ? targets.get(v.targetId) : null, equivalences });
    rows.push([
      p.value.name,
      new Date(v.recordedAt).toISOString(),
      v.target ?? "",
      rv?.target ?? v.targetIpa?.[0] ?? "",
      v.labelIds.map((l) => labels.get(l) ?? "").filter(Boolean).join("; "),
      (v.durationMs / 1000).toFixed(2),
      String(v.sampleRate),
      v.ipaEdited ?? "",
      v.ipaEdited ? "yes" : "no",
      t?.ipa ?? "",
      t?.model ?? "",
      rv?.produced ?? "",
      rv ? pct(rv.metrics.pcc) : "",
      rv ? pct(rv.metrics.per) : "",
      rv ? pct(rv.metrics.fer) : "",
      rv ? errorSummary(rv.ops, (id) => labels.get(id)) : "",
      v.notes ?? "",
      wav ? path : "",
    ]);
    onProgress?.(++done, recordings.length);
  }

  const enc = new TextEncoder();
  // Formula-injection safe CSV (Excel, Sheets).
  const cell = (s: string) => `"${(/^[=+\-@\t\r]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
  files["recordings.csv"] = enc.encode("﻿" + rows.map((r) => r.map(cell).join(",")).join("\r\n"));
  files["data.json"] = enc.encode(
    JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        app: "tinig labs notebook",
        patients: patients.map((p) => ({ id: p.id, ...p.value })),
        labels: labelItems.map((l) => ({ id: l.id, ...l.value })),
        targets: [...targets].map(([id, t]) => ({ id, ...t })),
        recordings: recordings.map((r) => ({ id: r.id, ...r.value, transcript: transcripts.get(r.id) ?? null })),
      },
      null,
      2,
    ),
  );
  if (missing.length) files["MISSING.txt"] = enc.encode(`Audio not on this device (connect and export again):\n${missing.join("\n")}\n`);
  files["README.txt"] = enc.encode(
    "Exported from tinig labs notebook.\nThis file contains patient health information. Store it encrypted and share it only as the Data Privacy Act allows.\n",
  );

  const bytes = await new Promise<Uint8Array>((res, rej) => zip(files, (err, out) => (err ? rej(err) : res(out))));
  const name = `notebook-export_${patientIds?.length === 1 ? `${folder(patients[0])}_` : ""}${new Date().toLocaleDateString("en-CA")}.zip`;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "application/zip" }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 30_000);

  void api("/api/audit", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "export", detail: `${patients.length} patients, ${recordings.length} recordings` }),
  }).catch(() => {});
  return { recordings: recordings.length, missing: missing.length };
}
