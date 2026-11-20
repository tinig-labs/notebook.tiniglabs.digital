"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const SIZES = [10, 25, 50, 100] as const;

function readSize(key: string, fallback: number) {
  try {
    const v = Number(localStorage.getItem(`notebook.pageSize.${key}`));
    return SIZES.includes(v as (typeof SIZES)[number]) ? v : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Client-side paging for a list. The page size is remembered per list on this device (it's a
 * display preference, not data, so it isn't synced). The page resets when the list's filter changes.
 */
export function usePagination<T>(items: T[], key: string, resetOn: unknown = null, fallback = 25) {
  // Lists only render after the notebook opens on the client, so reading storage here is safe.
  const [size, setSizeState] = useState(() => (typeof window === "undefined" ? fallback : readSize(key, fallback)));
  const [page, setPage] = useState(0);
  const [prevReset, setPrevReset] = useState(resetOn);
  // New search or filter: back to the first page (adjusting state during render, React's pattern).
  if (prevReset !== resetOn) {
    setPrevReset(resetOn);
    setPage(0);
  }

  const pages = Math.max(1, Math.ceil(items.length / size));
  const current = Math.min(page, pages - 1);
  const slice = useMemo(() => items.slice(current * size, current * size + size), [items, current, size]);

  const setSize = (n: number) => {
    try {
      localStorage.setItem(`notebook.pageSize.${key}`, String(n));
    } catch {}
    // Keep the first visible item on screen when the size changes.
    setPage(Math.floor((current * size) / n));
    setSizeState(n);
  };

  return { slice, page: current, pages, size, setPage, setSize, total: items.length, from: items.length ? current * size + 1 : 0, to: Math.min(items.length, (current + 1) * size) };
}

/** Compact page list: 1 … 4 5 6 … 12 */
function pageList(page: number, pages: number): (number | "gap")[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i);
  const out: (number | "gap")[] = [0];
  const lo = Math.max(1, page - 1);
  const hi = Math.min(pages - 2, page + 1);
  if (lo > 1) out.push("gap");
  for (let i = lo; i <= hi; i++) out.push(i);
  if (hi < pages - 2) out.push("gap");
  out.push(pages - 1);
  return out;
}

export function Pagination({
  p,
  noun,
}: {
  p: ReturnType<typeof usePagination<unknown>>;
  noun: [string, string]; // singular, plural
}) {
  if (p.total <= SIZES[0]) return null;
  const btn = "flex h-9 min-w-9 items-center justify-center rounded-full px-2 text-sm font-semibold transition-colors disabled:opacity-35";
  return (
    <nav aria-label={`${noun[1]} pages`} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 pt-2">
      <p className="text-sm text-muted tabular-nums" aria-live="polite">
        {p.from}–{p.to} of {p.total} {p.total === 1 ? noun[0] : noun[1]}
      </p>
      <div className="flex items-center gap-1">
        <button type="button" className={`${btn} text-text/70 hover:bg-surface`} onClick={() => p.setPage(p.page - 1)} disabled={p.page === 0} aria-label="Previous page">
          <ChevronLeft size={18} aria-hidden="true" />
        </button>
        {pageList(p.page, p.pages).map((n, i) =>
          n === "gap" ? (
            <span key={`g${i}`} className="w-6 text-center text-muted" aria-hidden="true">
              …
            </span>
          ) : (
            <button
              key={n}
              type="button"
              onClick={() => p.setPage(n)}
              aria-current={n === p.page ? "page" : undefined}
              aria-label={`Page ${n + 1}`}
              className={`${btn} tabular-nums ${n === p.page ? "bg-accent text-accent-fg" : "text-text/70 hover:bg-surface"}`}
            >
              {n + 1}
            </button>
          ),
        )}
        <button type="button" className={`${btn} text-text/70 hover:bg-surface`} onClick={() => p.setPage(p.page + 1)} disabled={p.page >= p.pages - 1} aria-label="Next page">
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      </div>
      <label className="flex items-center gap-2 text-sm text-muted">
        Show
        <select
          value={p.size}
          onChange={(e) => p.setSize(Number(e.target.value))}
          className="h-9 rounded-full bg-card px-3 font-semibold text-text ring-1 ring-inset ring-border focus:outline-none focus:ring-2 focus:ring-accent"
        >
          {SIZES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        per page
      </label>
    </nav>
  );
}
