import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { NOINDEX } from "@/lib/constants";

// Static shell: all data comes from the encrypted local store, so these pages work offline.
export const metadata: Metadata = { title: "Notebook", robots: NOINDEX };

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
