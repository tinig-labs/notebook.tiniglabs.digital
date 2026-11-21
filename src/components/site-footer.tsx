import Link from "next/link";
import { Brand, LabMark, Wordmark } from "./brand";
import { CONTACT_EMAIL, MAIN_SITE_URL } from "@/lib/constants";

// Same structure as the footers on tiniglabs.digital and collect.tiniglabs.digital.
const FOOTER_LINKS = [
  { label: "tiniglabs.digital", href: MAIN_SITE_URL },
  { label: "Speech corpus", href: "https://collect.tiniglabs.digital" },
  { label: "Contact", href: `mailto:${CONTACT_EMAIL}` },
  { label: "Terms of Service", href: "/terms", short: "Terms" },
  { label: "Privacy notice", href: "/privacy", short: "Privacy" },
  { label: "Brand", href: "/brand" },
];

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--pandan)]";

/** `full`: always the long label (the desktop footer). Otherwise phones get the short one. */
function FooterLink({ l, className, full }: { l: (typeof FOOTER_LINKS)[number]; className: string; full?: boolean }) {
  const label = (
    <>
      {!full && "short" in l && l.short ? (
        <>
          <span className="sm:hidden">{l.short}</span>
          <span className="hidden sm:inline">{l.label}</span>
        </>
      ) : (
        l.label
      )}
    </>
  );
  return l.href.startsWith("/") ? (
    <Link href={l.href} className={className}>
      {label}
    </Link>
  ) : (
    <a href={l.href} className={className}>
      {label}
    </a>
  );
}

/**
 * `app`: inside the notebook. On phones it's a quiet colophon (the header already carries the
 * wordmark, and the tab bar sits right below), from sm up the full tiniglabs.digital footer.
 */
export function SiteFooter({ variant = "site" }: { variant?: "site" | "app" }) {
  const app = variant === "app";
  return (
    <footer className={`mx-auto w-full max-w-6xl px-5 sm:px-10 sm:pb-12 sm:pt-16 ${app ? "pb-8 pt-10" : "pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-14"}`}>
      {app && (
        // Phone colophon
        <div className="border-t border-border pt-6 text-center sm:hidden">
          <nav aria-label="Footer">
            <ul className="flex flex-wrap justify-center gap-x-5 gap-y-1 text-sm font-medium">
              {FOOTER_LINKS.map((l) => (
                <li key={l.label}>
                  <FooterLink l={l} className={`inline-flex min-h-10 items-center rounded-sm text-text/75 underline-offset-4 hover:text-accent hover:underline ${focusRing}`} />
                </li>
              ))}
            </ul>
          </nav>
          <a href={MAIN_SITE_URL} className={`mt-4 inline-flex items-center gap-2 rounded-sm text-xs leading-relaxed text-muted hover:text-text ${focusRing}`}>
            <LabMark size={24} />
            <span>
              <Brand>tinig</Brand> is Filipino for voice. © 2026 <Brand />
            </span>
          </a>
        </div>
      )}

      <div className={app ? "hidden sm:block" : ""}>
        <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
          <Link href="/" aria-label="Notebook home" className={`self-start rounded-sm ${focusRing}`}>
            <Wordmark />
          </Link>
          <nav aria-label="Footer">
            <ul className="grid grid-cols-2 gap-x-6 text-[0.9375rem] font-medium sm:flex sm:flex-wrap sm:gap-x-7 sm:gap-y-3 sm:text-sm">
              {FOOTER_LINKS.map((l) => (
                <li key={l.label}>
                  <FooterLink
                    l={l}
                    full
                    className={`block rounded-sm py-2.5 text-text/80 underline-offset-4 transition-colors hover:text-accent hover:underline sm:py-0 ${focusRing}`}
                  />
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className="mt-8 flex flex-col gap-1.5 border-t border-border pt-6 text-sm leading-relaxed text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            <Brand>tinig</Brand> is Filipino for voice.
          </p>
          <a href={MAIN_SITE_URL} className={`inline-flex items-center gap-2 self-start rounded-sm hover:text-text ${focusRing}`}>
            <LabMark size={24} />
            <span>
              © 2026 <Brand />, an independent lab
            </span>
          </a>
        </div>
      </div>
    </footer>
  );
}
