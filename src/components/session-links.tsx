"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookOpen } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import { loadMe } from "@/lib/local/keys";

/**
 * Signed in? Asks the server (session cookie) and, when offline, falls back to a notebook already
 * set up on this device. `null` while unknown, so nothing flashes the wrong button.
 */
export function useSignedIn(): boolean | null {
  const { data, isPending, error } = authClient.useSession();
  const [local, setLocal] = useState<boolean | null>(null);
  useEffect(() => {
    void loadMe()
      .then((m) => setLocal(!!m))
      .catch(() => setLocal(false));
  }, []);
  if (data?.user) return true;
  if (isPending) return null;
  if (error || (typeof navigator !== "undefined" && !navigator.onLine)) return local;
  return false;
}

const pill = "block whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors";

export function HeaderActions() {
  const signedIn = useSignedIn();
  if (signedIn === null) return <span className="h-9 w-24" aria-hidden="true" />;
  if (signedIn)
    return (
      <Link href="/app" className={`${pill} flex items-center gap-2 bg-accent text-accent-fg hover:bg-accent-hover`}>
        <BookOpen size={16} aria-hidden="true" /> Open notebook
      </Link>
    );
  return (
    <>
      <Link href="/sign-in" className={`${pill} text-text/70 hover:bg-surface hover:text-text`}>
        Sign in
      </Link>
      <Link href="/#request" className={`${pill} hidden text-accent hover:bg-surface sm:block`}>
        Request access
      </Link>
    </>
  );
}

const big = "inline-flex h-14 items-center gap-2 rounded-full px-7 text-base font-semibold";

export function HeroActions() {
  const signedIn = useSignedIn();
  if (signedIn === null) return <div className="h-14" aria-hidden="true" />;
  if (signedIn)
    return (
      <Link href="/app" className={`${big} bg-accent text-white hover:bg-accent-hover active:translate-y-px`}>
        <BookOpen size={20} aria-hidden="true" /> Open your notebook
      </Link>
    );
  return (
    <>
      <a href="#request" className={`${big} bg-accent text-white hover:bg-accent-hover active:translate-y-px`}>
        Request access
      </a>
      <Link href="/sign-in" className={`${big} text-accent hover:bg-surface`}>
        Sign in
      </Link>
    </>
  );
}
