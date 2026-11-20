"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Button, Field, Input, Select, Textarea } from "./ui";
import { FormError } from "./auth/auth-shell";
import { newId, put } from "@/lib/local/store";
import type { Patient } from "@/lib/local/types";

/**
 * Create or edit a patient. Consent (from the patient, or a parent/guardian for minors) is
 * required before the first recording, so it is part of the form.
 */
export function PatientForm({
  id,
  initial,
  onDone,
  onCancel,
}: {
  id?: string;
  initial?: Patient;
  onDone: (id: string) => void;
  onCancel?: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [consent, setConsent] = useState(!!initial?.consent?.given);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const name = String(f.get("name")).trim();
    if (!name) return setError("Enter a name or initials.");
    const by = String(f.get("consentBy") ?? "").trim();
    if (consent && !by) return setError("Who gave consent?");
    const year = Number(f.get("birthYear")) || undefined;
    const value: Patient = {
      ...initial,
      name,
      birthYear: year,
      diagnosis: String(f.get("diagnosis") ?? "").trim() || undefined,
      notes: String(f.get("notes") ?? "").trim() || undefined,
      consent: consent
        ? {
            given: true,
            by,
            relation: String(f.get("relation")) as NonNullable<Patient["consent"]>["relation"],
            at: initial?.consent?.given ? initial.consent.at : Date.now(),
          }
        : null,
    };
    setPending(true);
    try {
      const pid = id ?? newId();
      await put("patient", pid, value);
      onDone(pid);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save.");
    } finally {
      setPending(false);
    }
  }

  const thisYear = new Date().getFullYear();
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name or initials" hint="Initials are enough. Use what your clinic allows.">
          <Input name="name" defaultValue={initial?.name} required maxLength={80} autoFocus={!id} />
        </Field>
        <Field label="Birth year (optional)">
          <Input name="birthYear" type="number" inputMode="numeric" min={thisYear - 110} max={thisYear} defaultValue={initial?.birthYear} />
        </Field>
      </div>
      <Field label="Diagnosis or focus (optional)">
        <Input name="diagnosis" defaultValue={initial?.diagnosis} maxLength={120} placeholder="e.g. cleft palate, /s/ lisp" />
      </Field>
      <Field label="Notes (optional)">
        <Textarea name="notes" defaultValue={initial?.notes} maxLength={4000} />
      </Field>

      <fieldset className="space-y-3 rounded-[20px] bg-surface p-4">
        <legend className="sr-only">Consent</legend>
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5 size-4 accent-[var(--pandan)]"
          />
          <span>
            <span className="flex items-center gap-1.5 font-semibold">
              <ShieldCheck size={16} className="text-accent" aria-hidden="true" /> Informed consent given
            </span>
            <span className="text-muted">Required before recording. For minors, from a parent or guardian.</span>
          </span>
        </label>
        {consent && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Given by">
              <Input name="consentBy" defaultValue={initial?.consent?.by} maxLength={80} required />
            </Field>
            <Field label="Relation">
              <Select name="relation" defaultValue={initial?.consent?.relation ?? "parent"}>
                <option value="patient">Patient</option>
                <option value="parent">Parent</option>
                <option value="guardian">Guardian</option>
                <option value="other">Other representative</option>
              </Select>
            </Field>
          </div>
        )}
      </fieldset>

      <FormError message={error} />
      <div className="flex gap-2">
        <Button type="submit" disabled={pending} className="h-12">
          {pending ? "Saving…" : id ? "Save" : "Add patient"}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" className="h-12" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
