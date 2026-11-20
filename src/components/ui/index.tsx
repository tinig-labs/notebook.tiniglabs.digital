import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

// Controls follow tiniglabs.digital: pandan primary, mint hovers, white cards with 28px radius.
type Variant = "primary" | "secondary" | "ghost" | "danger";
const variants: Record<Variant, string> = {
  primary: "bg-accent text-accent-fg hover:bg-accent-hover active:translate-y-px",
  secondary: "bg-card text-text ring-1 ring-inset ring-border hover:bg-surface",
  ghost: "text-text/70 hover:bg-surface hover:text-text",
  danger: "bg-card text-danger ring-1 ring-inset ring-border hover:bg-[#fbeef1]",
};
const base =
  "inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-semibold transition-[background-color,transform] duration-150 disabled:pointer-events-none disabled:opacity-50";

export function Button({ variant = "primary", className = "", ...p }: ComponentProps<"button"> & { variant?: Variant }) {
  return <button className={`${base} ${variants[variant]} ${className}`} {...p} />;
}

export function ButtonLink({ variant = "primary", className = "", ...p }: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={`${base} ${variants[variant]} ${className}`} {...p} />;
}

const field =
  "h-12 w-full rounded-xl bg-card px-4 text-base sm:text-[0.9375rem] ring-1 ring-inset ring-[var(--tinta)]/15 placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent";

export function Input({ className = "", ...p }: ComponentProps<"input">) {
  return <input className={`${field} ${className}`} {...p} />;
}

export function Select({ className = "", ...p }: ComponentProps<"select">) {
  return <select className={`${field} ${className}`} {...p} />;
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-muted">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function Card({ className = "", ...p }: ComponentProps<"div">) {
  return <div className={`rounded-[28px] bg-card p-6 sm:p-8 ${className}`} {...p} />;
}

export function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-surface px-3 py-1 text-xs font-medium text-accent">
      {children}
    </span>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded-md bg-card px-1.5 py-0.5 font-sans text-xs text-muted ring-1 ring-border">{children}</kbd>;
}

export function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {children}
    </div>
  );
}

/** Pill segmented control (same as the tiniglabs.digital waitlist role picker). */
export function Segmented<T extends string | number>({
  value, options, onChange, label,
}: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="inline-flex gap-1 rounded-full bg-surface p-1">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
            o.value === value ? "bg-card text-text shadow-sm" : "text-text/60 hover:text-text"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Textarea({ className = "", ...p }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={`min-h-24 w-full rounded-xl bg-card px-4 py-3 text-base ring-1 ring-inset ring-[var(--tinta)]/15 placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent sm:text-[0.9375rem] ${className}`}
      {...p}
    />
  );
}

/** Round icon-only button; always pass a label for screen readers. */
export function IconButton({ label, className = "", variant = "ghost", ...p }: ComponentProps<"button"> & { label: string; variant?: Variant }) {
  return (
    <button
      aria-label={label}
      title={label}
      className={`inline-flex size-11 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-50 ${variants[variant]} ${className}`}
      {...p}
    />
  );
}

/** Toggle chip (labels, filters). */
export function Chip({ on, className = "", ...p }: ComponentProps<"button"> & { on?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition-colors ${
        on ? "bg-accent text-accent-fg" : "bg-card text-text/75 ring-1 ring-inset ring-border hover:bg-surface"
      } ${className}`}
      {...p}
    />
  );
}

export function EmptyState({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[28px] bg-surface px-6 py-12 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-card text-accent">{icon}</span>
      <p className="text-lg font-semibold">{title}</p>
      {children && <div className="max-w-[40ch] text-sm text-muted">{children}</div>}
    </div>
  );
}
