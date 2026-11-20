/** Decrypted shapes. On disk (IndexedDB) and on the server these are AES-GCM ciphertext. */
import type { Mark } from "@/lib/ipa/compare";

export type Kind = "patient" | "recording" | "label" | "transcript" | "target";

export type Patient = {
  name: string; // name or initials, as the SLP prefers
  birthYear?: number;
  notes?: string;
  diagnosis?: string;
  consent: { given: boolean; by: string; relation: "patient" | "parent" | "guardian" | "other"; at: number } | null;
  archived?: boolean;
};

export type Recording = {
  patientId: string;
  recordedAt: number;
  durationMs: number;
  sampleRate: number;
  labelIds: string[];
  target?: string; // target text: from the library (snapshot) or typed freely
  targetId?: string; // library entry it was recorded against
  targetIpa?: string[]; // ideal IPA at recording time ([0] primary, rest accepted variants)
  notes?: string;
  ipaEdited?: string; // the patient's IPA as reviewed by the SLP (bottom row of the tiles)
  ipaModelSeen?: string; // the model IPA when the SLP last reviewed, to spot a newer one
  review?: Review;
};

/** The SLP's corrections and notes on the automatic comparison. The comparison itself is recomputed. */
export type Review = { basis?: "model" | "slp" /* no longer used */; marks: Mark[]; updatedAt: number };

/** A word, phrase or sentence from the SLP's own list, with its ideal pronunciation(s). */
export type Target = {
  text: string;
  type: "word" | "phrase" | "sentence";
  ipa: string[]; // [0] primary; others are accepted variants
  sets: string[]; // e.g. "/s/ initial", "Week 1 drill"
  notes?: string;
};

/** scope: recording labels (default), error labels for marks, or "a=b" sound equivalences. */
export type Label = { name: string; color: LabelColor; scope?: "recording" | "error" | "equiv" };
export const LABEL_COLORS = ["pandan", "sky", "amber", "rose", "violet", "slate"] as const;
export type LabelColor = (typeof LABEL_COLORS)[number];

export type Transcript = {
  recordingId: string;
  model: string;
  ipa: string;
  segments: { start: number; end: number; ipa: string }[];
  createdAt: number;
};

export type Payload = { patient: Patient; recording: Recording; label: Label; transcript: Transcript; target: Target };

/** Row as stored locally: structural fields plain, `data` = base64(iv||ct). */
export type LocalRow = {
  id: string;
  kind: Kind;
  parentId: string | null;
  updatedAt: number;
  deleted: boolean;
  data: string;
  rev: number; // server rev last seen (0 = never synced)
  dirty: 0 | 1;
  audioUploaded?: boolean;
  ipaStatus?: "none" | "queued" | "done" | "failed";
};

export type Item<K extends Kind = Kind> = {
  id: string;
  kind: K;
  parentId: string | null;
  updatedAt: number;
  value: Payload[K];
  dirty: boolean;
  audioUploaded?: boolean;
  ipaStatus?: "none" | "queued" | "done" | "failed";
};

export const LABEL_STYLES: Record<LabelColor, { dot: string; chip: string }> = {
  pandan: { dot: "bg-[#1f6b4f]", chip: "bg-[#e2f3ea] text-[#1f6b4f]" },
  sky: { dot: "bg-[#2a6f97]", chip: "bg-[#e3f0f7] text-[#1f5675]" },
  amber: { dot: "bg-[#b7791f]", chip: "bg-[#fbf1df] text-[#8a5a12]" },
  rose: { dot: "bg-[#b4234a]", chip: "bg-[#fbeef1] text-[#b4234a]" },
  violet: { dot: "bg-[#6b4fa0]", chip: "bg-[#efeaf7] text-[#553d82]" },
  slate: { dot: "bg-[#5f6f68]", chip: "bg-[#eef1ef] text-[#3f4b46]" },
};
