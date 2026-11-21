// The tinig labs logo family (see BRAND.md). The files in public/brand are the approved marks:
// never redraw or recolour them here, only pick the right file for the size and background.

type Surface = "light" | "dark";

/**
 * Arch n, the notebook's mark. Under 32 px the gradient turns muddy, so the mono version is used;
 * the guide's minimum for the Arch n is 20 px.
 */
export function NotebookMark({ size = 32, on = "light", className = "" }: { size?: number; on?: Surface; className?: string }) {
  const file = size < 32 ? (on === "dark" ? "notebook-mark-mono-white" : "notebook-mark-mono-ink") : on === "dark" ? "notebook-mark-reversed" : "notebook-mark";
  // eslint-disable-next-line @next/next/no-img-element -- a fixed-size SVG; next/image adds nothing here
  return <img src={`/brand/${file}.svg`} width={size} height={size} alt="" aria-hidden="true" className={`block shrink-0 ${className}`} />;
}

/** Echo t, the mark of tinig labs itself: used where the notebook points to the parent lab. Minimum 24 px. */
export function LabMark({ size = 24, on = "light", className = "" }: { size?: number; on?: Surface; className?: string }) {
  const file = on === "dark" ? "tinig-labs-mark-reversed" : "tinig-labs-mark";
  // eslint-disable-next-line @next/next/no-img-element -- a fixed-size SVG; next/image adds nothing here
  return <img src={`/brand/${file}.svg`} width={Math.max(24, size)} height={Math.max(24, size)} alt="" aria-hidden="true" className={`block shrink-0 ${className}`} />;
}

/** "tinig labs" in running text: Montserrat 600, always lowercase. */
export function Brand({ children = "tinig labs" }: { children?: string }) {
  return <span className="font-brand text-[0.94em] font-semibold tracking-[-0.02em]">{children}</span>;
}

/**
 * The notebook lockup: Arch n, "tinig labs" (Montserrat 600, tinta) and "notebook" (Figtree 500,
 * abo, ~0.75x). Proportions from the guide: mark 1.75x the wordmark size, gap 0.55x (32 / 18 / 10 px).
 */
export function Wordmark({ on = "light" }: { on?: Surface }) {
  const dark = on === "dark";
  return (
    <span className="flex items-center gap-2.5">
      <NotebookMark size={32} on={on} />
      <span className={`whitespace-nowrap font-brand text-lg/6 font-semibold tracking-[-0.02em] ${dark ? "text-[var(--gatas)]" : "text-text"}`}>tinig labs</span>
      {/* Dropped on very narrow screens so the header actions keep their room. */}
      <span className={`hidden text-sm font-medium min-[360px]:inline ${dark ? "text-[var(--mint)]" : "text-muted"}`}>notebook</span>
    </span>
  );
}

/** The tinig labs lockup (Echo t + wordmark), for links to the parent lab. */
export function LabWordmark({ size = "sm" }: { size?: "sm" | "md" }) {
  return (
    <span className={`flex items-center ${size === "md" ? "gap-2.5" : "gap-2"}`}>
      <LabMark size={size === "md" ? 32 : 24} />
      <span className={`whitespace-nowrap font-brand font-semibold tracking-[-0.02em] text-text ${size === "md" ? "text-lg/6" : "text-sm"}`}>tinig labs</span>
    </span>
  );
}
