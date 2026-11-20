"use client";

import { useState } from "react";
import { CircleCheck } from "lucide-react";
import { Button, Field, Input } from "@/components/ui";
import { FormError } from "@/components/auth/auth-shell";
import { Turnstile, resetTurnstile, turnstileToken } from "@/components/turnstile";

export function RequestAccessForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/access-request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: f.get("email"),
          name: f.get("name"),
          clinic: f.get("clinic"),
          prcLicense: f.get("prc"),
          consent: f.get("consent") === "on",
          turnstile: turnstileToken(form),
        }),
      });
      if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Something went wrong.");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error. Try again.");
      resetTurnstile(form);
    } finally {
      setPending(false);
    }
  }

  if (done)
    return (
      <div role="status" className="flex flex-col items-start gap-3">
        <CircleCheck size={40} className="text-accent" aria-hidden="true" />
        <p className="text-xl font-semibold">Request sent</p>
        <p className="text-muted">Check your inbox for a confirmation.</p>
      </div>
    );

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name">
          <Input name="name" autoComplete="name" required maxLength={120} />
        </Field>
        <Field label="Email">
          <Input name="email" type="email" autoComplete="email" required maxLength={254} />
        </Field>
        <Field label="Clinic or school (optional)">
          <Input name="clinic" autoComplete="organization" maxLength={160} />
        </Field>
        <Field label="PRC license no. (optional)">
          <Input name="prc" inputMode="numeric" maxLength={40} />
        </Field>
      </div>
      <label className="flex items-start gap-3 text-sm text-muted">
        <input type="checkbox" name="consent" required className="mt-0.5 size-4 accent-[var(--pandan)]" />
        <span>
          I agree to the{" "}
          <a href="/privacy" className="font-semibold text-accent underline-offset-4 hover:underline">
            privacy notice
          </a>
          .
        </span>
      </label>
      <Turnstile />
      <FormError message={error} />
      <Button type="submit" disabled={pending} className="h-14 w-full text-base sm:w-auto">
        {pending ? "Sending…" : "Request access"}
      </Button>
    </form>
  );
}
