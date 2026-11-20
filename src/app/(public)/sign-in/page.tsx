import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { NOINDEX } from "@/lib/constants";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Sign in", robots: NOINDEX };

export default function SignInPage() {
  return (
    <AuthShell
      title="Sign in"
      footer={
        <>
          No access yet?{" "}
          <Link href="/#request" className="font-semibold text-accent underline-offset-4 hover:underline">
            Request beta access
          </Link>
        </>
      }
    >
      <Suspense>
        <SignInForm />
      </Suspense>
    </AuthShell>
  );
}
