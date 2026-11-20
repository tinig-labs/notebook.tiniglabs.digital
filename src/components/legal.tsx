import Link from "next/link";
import type { ReactNode } from "react";

// Same shell as the terms and privacy pages on tiniglabs.digital.
export const LEGAL_CONTACT = "hello@tiniglabs.digital";
export const LEGAL_UPDATED = "November 20, 2026";

export function LegalPage({
  title,
  lede,
  summary,
  children,
}: {
  title: string;
  lede: ReactNode;
  summary?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="pt-2 sm:pt-6">
      <h1 className="text-[clamp(2.25rem,10vw,2.5rem)] font-medium leading-[1.1] tracking-[-0.03em] sm:text-[3.25rem]">{title}</h1>
      <p className="mt-4 text-sm text-muted">Last updated {LEGAL_UPDATED}</p>
      <p className="mt-6 max-w-[52ch] text-lg leading-relaxed text-muted">{lede}</p>
      {summary && <div className="mt-14">{summary}</div>}
      <article className="mt-14 max-w-[68ch] border-t border-border pt-4 leading-relaxed text-text/85 sm:mt-20">{children}</article>
    </div>
  );
}

export function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 sm:scroll-mt-6">
      <h2 className="mt-14 text-2xl font-semibold tracking-tight text-text">{title}</h2>
      {children}
    </section>
  );
}

export const P = ({ children }: { children: ReactNode }) => <p className="mt-4">{children}</p>;

export const List = ({ children }: { children: ReactNode }) => (
  <ul className="mt-4 list-disc space-y-2 pl-6 marker:text-accent">{children}</ul>
);

const linkClass =
  "rounded-sm font-medium text-accent underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent";

export function A({ href, children }: { href: string; children: ReactNode }) {
  return href.startsWith("/") ? (
    <Link href={href} className={linkClass}>
      {children}
    </Link>
  ) : (
    <a href={href} className={linkClass}>
      {children}
    </a>
  );
}

export const Mail = ({ to = LEGAL_CONTACT }: { to?: string }) => <A href={`mailto:${to}`}>{to}</A>;

type Row = { what: string; when: string; why: string; kept: string };
const COLS = [
  { key: "when", label: "When" },
  { key: "why", label: "Why" },
  { key: "kept", label: "How long" },
] as const;

/** The mint-framed summary table used on tiniglabs.digital/privacy. */
export function DataTable({ rows, note }: { rows: Row[]; note: ReactNode }) {
  return (
    <div className="rounded-[28px] bg-surface p-3">
      <div className="rounded-[20px] bg-card px-6 py-2 sm:px-8">
        <table className="w-full text-left">
          <caption className="sr-only">Data the notebook holds</caption>
          <thead className="hidden md:table-header-group">
            <tr className="text-sm text-muted">
              <th scope="col" className="py-4 pr-6 font-medium">What we collect</th>
              {COLS.map((c) => (
                <th key={c.key} scope="col" className="py-4 pr-6 font-medium last:pr-0">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.what} className="block border-t border-border py-5 first:border-t-0 md:table-row md:py-0 md:first:border-t">
                <th scope="row" className="block pb-2 align-top text-lg font-semibold leading-snug md:table-cell md:w-[28%] md:py-5 md:pr-6 md:text-base">
                  {row.what}
                </th>
                {COLS.map((c) => (
                  <td key={c.key} className="block py-1 align-top leading-relaxed text-text/80 md:table-cell md:py-5 md:pr-6 md:last:pr-0">
                    <span className="mr-2 text-sm text-muted md:hidden">{c.label}:</span>
                    {row[c.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="px-6 pb-3 pt-5 font-medium text-accent sm:px-8">{note}</p>
    </div>
  );
}
