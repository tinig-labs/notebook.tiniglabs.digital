"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, ShieldCheck } from "lucide-react";
import { authCall, authClient } from "@/lib/auth/client";
import { Button, Field, Input } from "@/components/ui";
import { FormError, safeNext } from "@/components/auth/auth-shell";

/** Passwordless: email → 6-digit code. Only approved beta emails receive a code. */
export function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next")) ?? "/app";
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [step, setStep] = useState<"email" | "code">("email");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function sendCode() {
    setPending(true);
    setError(null);
    setInfo(null);
    const { error } = await authCall(authClient.emailOtp.sendVerificationOtp({ email: email.trim(), type: "sign-in" }));
    setPending(false);
    if (error) return setError(error.message);
    setStep("code");
    setInfo(`Code sent to ${email.trim()}.`);
  }

  async function verify(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const otp = String(new FormData(e.currentTarget).get("otp")).replace(/\D/g, "");
    setPending(true);
    setError(null);
    const { error } = await authCall(authClient.signIn.emailOtp({ email: email.trim(), otp }));
    setPending(false);
    if (error) return setError(error.message ?? "That code didn't work. Check it or send a new one.");
    router.replace(next);
  }

  return (
    <div className="space-y-4">
      {params.get("revoked") === "1" && (
        <p role="status" className="rounded-2xl bg-surface px-4 py-3 text-sm">
          This device was signed out and its local data removed.
        </p>
      )}
      {step === "email" ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void sendCode();
          }}
          className="space-y-4"
        >
          <Field label="Email">
            <Input name="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <FormError message={error} />
          <Button type="submit" className="h-12 w-full" disabled={pending}>
            <Mail size={18} aria-hidden="true" />
            {pending ? "Sending…" : "Email me a code"}
          </Button>
        </form>
      ) : (
        <form onSubmit={verify} className="space-y-4">
          {info && (
            <p role="status" className="text-sm text-muted">
              {info}
            </p>
          )}
          <Field label="6-digit code">
            <Input
              name="otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9 ]{6,8}"
              autoFocus
              required
              className="text-center text-2xl tracking-[0.3em]"
            />
          </Field>
          <FormError message={error} />
          <div className="flex gap-2">
            <Button type="submit" className="h-12 flex-1" disabled={pending}>
              {pending ? "Checking…" : "Sign in"}
            </Button>
            <Button type="button" variant="secondary" className="h-12" onClick={sendCode} disabled={pending}>
              Resend
            </Button>
          </div>
          <button type="button" onClick={() => setStep("email")} className="text-sm font-medium text-accent underline-offset-4 hover:underline">
            Use a different email
          </button>
        </form>
      )}
      <p className="flex items-center gap-2 text-xs text-muted">
        <ShieldCheck size={14} aria-hidden="true" className="shrink-0 text-accent" />
        No password. Your notes and recordings are encrypted.
      </p>
    </div>
  );
}
