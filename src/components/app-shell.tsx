"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { BookOpen, CloudAlert, CloudCheck, LoaderCircle, LogIn, Mic, RefreshCw, Settings, Users, WifiOff } from "lucide-react";
import { Wordmark } from "./brand";
import { useBoot } from "@/lib/local/boot";
import { syncNow, useSyncStatus } from "@/lib/local/sync";
import { ButtonLink, EmptyState } from "./ui";
import { SiteFooter } from "./site-footer";
import { FOOTER_LINKS } from "@/lib/constants";

const TABS = [
  { href: "/app", label: "Patients", icon: Users, exact: true },
  { href: "/app/record", label: "Record", icon: Mic },
  { href: "/app/library", label: "Library", icon: BookOpen },
  { href: "/app/settings", label: "Settings", icon: Settings },
];

function SyncBadge() {
  const s = useSyncStatus();
  const map = {
    idle: { icon: CloudCheck, text: s.pending ? `${s.pending} to sync` : "Synced", cls: "text-accent" },
    syncing: { icon: RefreshCw, text: "Syncing", cls: "text-accent [&_svg]:animate-spin motion-reduce:[&_svg]:animate-none" },
    offline: { icon: WifiOff, text: s.pending ? `Offline · ${s.pending} waiting` : "Offline", cls: "text-muted" },
    error: { icon: CloudAlert, text: "Sync failed", cls: "text-danger" },
    "signed-out": { icon: LogIn, text: "Sign in to sync", cls: "text-danger" },
  }[s.state];
  const Icon = map.icon;
  if (s.state === "signed-out")
    return (
      <Link href="/sign-in?next=/app" className={`flex h-9 items-center gap-1.5 rounded-full bg-surface px-3 text-xs font-semibold ${map.cls}`}>
        <Icon size={16} aria-hidden="true" /> {map.text}
      </Link>
    );
  return (
    <button
      type="button"
      onClick={() => void syncNow()}
      title={s.lastSync ? `Last synced ${new Date(s.lastSync).toLocaleTimeString()}` : "Sync now"}
      className={`flex h-9 items-center gap-1.5 rounded-full bg-surface px-3 text-xs font-semibold ${map.cls}`}
    >
      <Icon size={16} aria-hidden="true" />
      <span aria-live="polite">{map.text}</span>
    </button>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const boot = useBoot();
  const path = usePathname();
  const active = (t: (typeof TABS)[number]) => (t.exact ? path === t.href || path === "/app/patient" || path === "/app/recording" : path === t.href || path.startsWith(`${t.href}/`));

  useEffect(() => {
    if (boot.phase === "needs-sign-in") location.replace(`/sign-in?next=${encodeURIComponent(location.pathname + location.search)}`);
  }, [boot.phase]);

  let body: ReactNode = children;
  if (boot.phase === "loading" || boot.phase === "needs-sign-in")
    body = (
      <div className="flex justify-center py-24 text-muted" role="status" aria-label="Opening notebook">
        <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
      </div>
    );
  else if (boot.phase === "needs-network")
    body = (
      <EmptyState icon={<WifiOff aria-hidden="true" />} title="Connect once to set up">
        This device needs internet the first time. After that it works offline.
      </EmptyState>
    );
  else if (boot.phase === "error")
    body = (
      <EmptyState icon={<CloudAlert aria-hidden="true" />} title="Couldn't open the notebook">
        <p>{boot.message}</p>
        <ButtonLink href="/app" className="mt-4">
          Try again
        </ButtonLink>
      </EmptyState>
    );

  return (
    <div className="flex min-h-dvh flex-1 flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] sm:pb-0">
      <header className="sticky top-0 z-20 w-full bg-bg/90 backdrop-blur-md sm:static sm:bg-transparent sm:backdrop-blur-none">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2 px-5 py-3 sm:px-10 sm:py-6">
          <Link href="/" aria-label="Notebook home" className="rounded-sm">
            <Wordmark />
          </Link>
          <div className="flex items-center gap-1">
            <nav aria-label="Main" className="mr-2 hidden items-center gap-1 sm:flex">
              {TABS.map((t) => (
                <Link
                  key={t.href}
                  href={t.href}
                  aria-current={active(t) ? "page" : undefined}
                  className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                    active(t) ? "bg-surface text-text" : "text-text/70 hover:bg-surface hover:text-text"
                  }`}
                >
                  <t.icon size={16} aria-hidden="true" />
                  {t.label}
                </Link>
              ))}
            </nav>
            {boot.phase === "ready" && <SyncBadge />}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-5 pb-4 pt-2 sm:px-10 sm:pb-8 sm:pt-2">{body}</main>
      <SiteFooter current="notebook" links={FOOTER_LINKS} compact />

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
      >
        <ul className="mx-auto grid h-16 max-w-md grid-cols-4">
          {TABS.map((t) => {
            const on = active(t);
            return (
              <li key={t.href}>
                <Link
                  href={t.href}
                  aria-current={on ? "page" : undefined}
                  className={`flex h-full flex-col items-center justify-center gap-1 text-[0.6875rem] font-semibold transition-colors ${
                    on ? "text-accent" : "text-text/55 active:text-text"
                  }`}
                >
                  <span className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${on ? "bg-surface" : ""}`}>
                    <t.icon size={21} strokeWidth={1.9} aria-hidden="true" />
                  </span>
                  {t.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
