// Brand pieces mirrored from tiniglabs.digital: masked logo mark + Montserrat wordmark.

export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    // logo.svg has unfilled (black) paths; masking lets it take the ink colour
    <span
      aria-hidden="true"
      className={`${className} block shrink-0 bg-[var(--tinta)]`}
      style={{
        maskImage: "url(/logo.svg)",
        WebkitMaskImage: "url(/logo.svg)",
        maskSize: "contain",
        WebkitMaskSize: "contain",
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskPosition: "center",
        WebkitMaskPosition: "center",
      }}
    />
  );
}

export function Brand({ children = "tinig labs" }: { children?: string }) {
  return <span className="font-brand text-[0.94em] font-semibold tracking-[-0.01em]">{children}</span>;
}

export function Wordmark({ size = "md" }: { size?: "md" | "sm" }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark className={size === "md" ? "h-8 w-8" : "h-7 w-7"} />
      <span className={`whitespace-nowrap font-brand ${size === "md" ? "text-lg" : "text-base"} font-semibold tracking-[-0.02em]`}>
        tinig labs
      </span>
      {/* Dropped on very narrow screens so the header actions keep their room. */}
      <span className={`${size === "md" ? "text-sm" : "text-xs"} hidden font-medium text-muted min-[360px]:inline`}>
        notebook
      </span>
    </span>
  );
}
