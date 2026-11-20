import Link from "next/link";
import { Wordmark } from "./brand";
import { HeaderActions } from "./session-links";

/** Header for public pages. The app has its own shell with sync status and tabs. */
export function PublicHeader() {
  return (
    <header className="w-full">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2 px-5 py-3.5 sm:px-10 sm:py-6">
        <Link href="/" aria-label="Notebook home" className="rounded-sm">
          <Wordmark />
        </Link>
        <nav aria-label="Main" className="flex items-center gap-1">
          <HeaderActions />
        </nav>
      </div>
    </header>
  );
}

export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PublicHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 pb-20 pt-6 sm:px-10 sm:pb-28 sm:pt-10">{children}</main>
    </>
  );
}
