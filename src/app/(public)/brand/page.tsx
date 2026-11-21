/* eslint-disable @next/next/no-img-element -- the logo files are fixed-size SVGs shown as they are */
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Download } from "lucide-react";
import { Brand, LabWordmark, Wordmark } from "@/components/brand";
import { SITE_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Brand",
  description: "The tinig labs logo family, colours and type, and how the notebook uses them.",
  alternates: { canonical: `${SITE_URL}/brand` },
};

// Everything on this page follows BRAND.md at the repository root.
const MARKS = [
  {
    id: "notebook",
    name: "Arch n",
    for: "notebook (notebook.tiniglabs.digital)",
    says: "A lowercase n drawn in one stroke that fades from pandan into tinta.",
    build: "One 16-unit stroke with round ends: a stem from y 38 to 90 and an arch with a 28-unit radius. The gradient runs from pandan at the bottom left to tinta at the top right.",
    min: "20 px",
  },
  {
    id: "tinig-labs",
    name: "Echo t",
    for: "tinig labs, the lab",
    says: "A lowercase t on three rounded squares that fade back like an echo: a voice carrying.",
    build: "Three 70-unit squares with a 24-unit corner radius, each one offset 15 units down and right. Front square tinta at full strength, middle pandan at 75% opacity, back dahon at 45%. The t is an 8-unit stroke with round ends, in gatas.",
    min: "24 px",
  },
  {
    id: "corpus",
    name: "Banig weave",
    for: "speech corpus (collect.tiniglabs.digital)",
    says: "Rounded strands woven over and under like a banig mat: many voices woven into one dataset.",
    build: "Three strands across (tinta) and three down (pandan), 12 units wide and 26 units apart, with round ends. At each crossing they swap which one is on top, in a checker pattern. Where a strand passes under, it breaks with a 3.5-unit gap on each side. The gaps are transparent, so the weave works on any background.",
    min: "24 px",
  },
] as const;

const VERSIONS = [
  { suffix: "", name: "Primary", note: "On gatas, white or mint. Use this by default.", bg: [["gatas", "var(--gatas)"], ["white", "#ffffff"], ["mint", "var(--mint)"]] },
  { suffix: "-reversed", name: "Reversed", note: "On pandan or tinta. Uses gatas and dahon so the mark stays bright.", bg: [["pandan", "var(--pandan)"], ["tinta", "var(--tinta)"]] },
  { suffix: "-mono-ink", name: "Mono ink", note: "Tinta only. For one-colour printing, stamps and fax-style documents.", bg: [["white", "#ffffff"]] },
  { suffix: "-mono-white", name: "Mono white", note: "White only. For photos (if the area behind is calm) and dark one-colour printing.", bg: [["tinta", "var(--tinta)"]] },
] as const;

const PALETTE = [
  { token: "gatas", hex: "#F9FBFA", use: "Page background (gatas = milk)", fg: "var(--tinta)" },
  { token: "tinta", hex: "#13261F", use: "Text and the wordmark (tinta = ink)", fg: "var(--gatas)" },
  { token: "abo", hex: "#5F6F68", use: "Muted text and product names (abo = grey)", fg: "#ffffff" },
  { token: "pandan", hex: "#1F6B4F", use: "Brand green: tiles, the weave, the start of the Arch n", fg: "#ffffff" },
  { token: "mint", hex: "#E2F3EA", use: "Soft tint: pills and highlight bands", fg: "var(--tinta)" },
  { token: "dahon", hex: "#7FC8A4", use: "Leaf green (dahon = leaf), only as an accent on pandan. Never text on gatas.", fg: "var(--tinta)" },
] as const;

const DONTS = [
  "Don't stretch, squash, rotate or tilt a mark.",
  "Don't recolour a mark outside the four versions, or use colours from outside the palette.",
  "Don't add shadows, outlines, glows or extra gradients. The Arch n's gradient is the only one in the family.",
  "Don't change the weave pattern, add strands or straighten the round ends.",
  "Don't put a mark on a busy photo, or on a background where it doesn't have enough contrast.",
  "Don't swap a product mark in for the tinig labs mark, or combine two marks in one lockup.",
  "Don't set the wordmark in any font other than Montserrat 600, and never write \"Tinig Labs\".",
  "Don't use the old mic-and-headphones logo next to the new marks.",
];

const file = (name: string) => `/brand/${name}`;

function Section({ id, title, lede, children }: { id: string; title: string; lede?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-6 pt-16 sm:pt-24">
      <h2 id={`${id}-title`} className="text-2xl font-semibold tracking-tight">
        {title}
      </h2>
      {lede && <p className="mt-3 max-w-[60ch] leading-relaxed text-muted">{lede}</p>}
      <div className="mt-8">{children}</div>
    </section>
  );
}

function Tile({ bg, children, className = "" }: { bg: string; children: ReactNode; className?: string }) {
  return (
    <div className={`flex items-center justify-center rounded-panel ring-1 ring-inset ring-border ${className}`} style={{ background: bg }}>
      {children}
    </div>
  );
}

function DownloadLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      download
      className="inline-flex min-h-10 items-center gap-2 rounded-full bg-card px-4 text-sm font-semibold text-accent ring-1 ring-inset ring-border transition-colors hover:bg-surface"
    >
      <Download size={16} aria-hidden="true" />
      {children}
    </a>
  );
}

/** A 120-unit grid behind a mark, every 10 units, drawn separately so the mark itself is untouched. */
function GridBehind({ id, children }: { id: string; children: ReactNode }) {
  return (
    <div className="relative aspect-square w-full max-w-60">
      <svg viewBox="0 0 120 120" className="absolute inset-0 size-full" aria-hidden="true">
        <defs>
          <pattern id={`grid-${id}`} width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M10 0H0V10" fill="none" stroke="var(--pandan)" strokeOpacity="0.18" strokeWidth="0.4" />
          </pattern>
        </defs>
        <rect width="120" height="120" fill={`url(#grid-${id})`} />
        <rect x="0.2" y="0.2" width="119.6" height="119.6" fill="none" stroke="var(--pandan)" strokeOpacity="0.35" strokeWidth="0.4" />
        <rect x="30" y="30" width="60" height="60" fill="none" stroke="var(--pandan)" strokeOpacity="0.3" strokeWidth="0.4" strokeDasharray="2 2" />
      </svg>
      <div className="absolute inset-0">{children}</div>
    </div>
  );
}

export default function BrandPage() {
  return (
    <div className="pt-2 sm:pt-6">
      <p className="inline-flex items-center rounded-full bg-surface px-3.5 py-1.5 text-sm font-semibold text-accent">Brand guide</p>
      <h1 className="mt-6 max-w-[20ch] text-[clamp(2.25rem,10vw,2.5rem)] font-medium leading-[1.1] tracking-[-0.03em] sm:text-[3.25rem]">
        The notebook mark and its family
      </h1>
      <p className="mt-6 max-w-[60ch] text-lg leading-relaxed text-muted">
        <Brand /> is an independent lab in the Philippines building open Filipino speech AI, starting with the speech mainstream models miss. This guide
        covers the logo family and how to use it, plus the colours and type that go with it. It matches tiniglabs.digital.
      </p>
      <p className="mt-4 max-w-[60ch] leading-relaxed text-muted">
        The name is always written in lowercase: <Brand />, never &quot;Tinig Labs&quot; or &quot;TINIG LABS&quot;. Product names are lowercase too:{" "}
        <strong className="font-semibold text-text">notebook</strong>, <strong className="font-semibold text-text">speech corpus</strong>.
      </p>

      {/* The notebook first: its mark and lockup */}
      <div className="mt-12 grid gap-3 lg:grid-cols-[1fr_1.4fr]">
        <div className="flex items-center justify-center rounded-card bg-card p-10 ring-1 ring-inset ring-border">
          <img src={file("notebook-mark.svg")} width={192} height={192} alt="The Arch n, the notebook's mark" />
        </div>
        <div className="flex flex-col justify-between gap-8 rounded-card bg-surface p-6 sm:p-8">
          <div>
            <p className="text-sm font-semibold text-accent">This app</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight">Arch n</p>
            <p className="mt-2 max-w-[44ch] leading-relaxed text-muted">{MARKS[0].says}</p>
          </div>
          <div className="flex flex-wrap items-center gap-6 rounded-panel bg-card p-6 ring-1 ring-inset ring-border">
            <Wordmark />
          </div>
          <div className="flex flex-wrap gap-2">
            <DownloadLink href={file("notebook-mark.svg")}>Mark (SVG)</DownloadLink>
            <DownloadLink href={file("notebook-app-icon-512.png")}>App icon (512 px)</DownloadLink>
          </div>
        </div>
      </div>

      <Section
        id="family"
        title="The logo family"
        lede="There are three marks, one for each part of tinig labs. They are drawn on the same 120-unit grid with rounded ends and corners, so they look like siblings."
      >
        <ul className="grid gap-3 md:grid-cols-3">
          {MARKS.map((m) => (
            <li key={m.id} className="flex flex-col gap-5 rounded-card bg-card p-6 ring-1 ring-inset ring-border sm:p-8">
              <img src={file(`${m.id}-mark.svg`)} width={88} height={88} alt="" />
              <div>
                <p className="text-lg font-semibold">{m.name}</p>
                <p className="mt-1 text-sm font-medium text-accent">For {m.for}</p>
                <p className="mt-3 text-sm leading-relaxed text-muted">{m.says}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-6 max-w-[60ch] leading-relaxed text-muted">
          Use the Echo t whenever you&apos;re talking about <Brand /> as a whole: the website header, social profiles, slides, emails. Use a product mark
          only inside, or about, that product. In the notebook, that means the Arch n in the header and the Echo t where the footer points to the lab.
        </p>
      </Section>

      <Section id="construction" title="Construction" lede="All three are drawn on a 120 × 120 grid. The dashed square marks the centre half of the grid. Never redraw the marks: use the files below.">
        <ul className="grid gap-3 md:grid-cols-3">
          {MARKS.map((m) => (
            <li key={m.id} className="rounded-card bg-card p-6 ring-1 ring-inset ring-border sm:p-8">
              <div className="flex justify-center">
                <GridBehind id={m.id}>
                  <img src={file(`${m.id}-mark.svg`)} alt="" className="size-full" />
                </GridBehind>
              </div>
              <p className="mt-6 font-semibold">{m.name}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted">{m.build}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="lockups" title="Lockups" lede="A lockup is the mark next to the wordmark.">
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="flex min-h-40 items-center justify-center rounded-card bg-card p-8 ring-1 ring-inset ring-border">
            <Wordmark />
          </div>
          <div className="flex min-h-40 items-center justify-center rounded-card bg-card p-8 ring-1 ring-inset ring-border">
            <LabWordmark size="md" />
          </div>
        </div>
        <ul className="mt-6 max-w-[68ch] list-disc space-y-2 pl-6 leading-relaxed text-text/85 marker:text-accent">
          <li>
            <strong className="font-semibold">Wordmark:</strong> &quot;tinig labs&quot; in Montserrat SemiBold (600), letter-spacing −0.02em, in tinta.
          </li>
          <li>
            <strong className="font-semibold">Product lockups:</strong> the product&apos;s mark, then &quot;tinig labs&quot; in Montserrat 600, then the product
            name in Figtree Medium (500) in abo, a little smaller (about 0.75× the wordmark size). For example, <Brand /> notebook.
          </li>
          <li>
            <strong className="font-semibold">Proportions:</strong> make the mark about 1.75× the wordmark&apos;s font size, with a gap of about 0.55× the font
            size. On the website that&apos;s a 32 px mark, an 18 px wordmark and a 10 px gap.
          </li>
          <li>Always put the mark on the left. Don&apos;t stack the wordmark under the mark unless you have no room for the horizontal version.</li>
        </ul>
      </Section>

      <Section id="clear-space" title="Clear space and minimum size">
        <div className="grid gap-3 lg:grid-cols-[1fr_1.4fr]">
          <div className="flex flex-col items-center gap-6 rounded-card bg-card p-6 ring-1 ring-inset ring-border sm:p-8">
            <div className="rounded-tag p-[30px] outline-2 -outline-offset-2 outline-dashed outline-[var(--pandan)]/50" style={{ background: "var(--mint)" }}>
              <div className="bg-card">
                <img src={file("notebook-mark.svg")} width={120} height={120} alt="The Arch n with its clear space" />
              </div>
            </div>
            <p className="text-sm leading-relaxed text-muted">
              Keep at least a quarter of the mark&apos;s width empty on every side (30 units on the 120 grid). Nothing else goes inside that space: text, edges or
              other logos.
            </p>
          </div>
          <div className="rounded-card bg-card p-6 ring-1 ring-inset ring-border sm:p-8">
            <p className="font-semibold">Minimum size</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              24 px for the Echo t and the Banig weave, 20 px for the Arch n. Below that, use the app icon PNGs (32 px) or the mono version. Under 32 px, use a
              mono Arch n instead of the gradient one. The gradient turns muddy when it&apos;s that small.
            </p>
            <ul className="mt-6 flex flex-wrap items-end gap-6">
              {[20, 24, 32, 48, 64].map((s) => (
                <li key={s} className="flex flex-col items-center gap-2">
                  <img src={file(s < 32 ? "notebook-mark-mono-ink.svg" : "notebook-mark.svg")} width={s} height={s} alt="" />
                  <span className="text-xs font-medium text-muted">
                    {s} px{s < 32 ? " · mono" : ""}
                  </span>
                </li>
              ))}
            </ul>
            <ul className="mt-6 flex flex-wrap items-end gap-6 border-t border-border pt-6">
              {MARKS.map((m) => (
                <li key={m.id} className="flex items-center gap-2 text-sm text-muted">
                  <img src={file(`${m.id}-mark${m.id === "notebook" ? "-mono-ink" : ""}.svg`)} width={m.id === "notebook" ? 20 : 24} height={m.id === "notebook" ? 20 : 24} alt="" />
                  {m.name}: {m.min}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section
        id="colour-versions"
        title="Colour versions"
        lede="Every mark comes in four versions. Pick the version by the background. Never put the primary version on pandan or tinta, and never put the reversed version on gatas."
      >
        <div className="space-y-3">
          {VERSIONS.map((v) => (
            <div key={v.name} className="grid gap-4 rounded-card bg-card p-6 ring-1 ring-inset ring-border sm:p-8 lg:grid-cols-[14rem_1fr] lg:items-center">
              <div>
                <p className="font-semibold">{v.name}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{v.note}</p>
              </div>
              <ul className="grid gap-3 sm:grid-cols-3">
                {v.bg.map(([bgName, bg]) => (
                  <li key={bgName}>
                    <Tile bg={bg} className="gap-4 px-4 py-6">
                      {MARKS.map((m) => (
                        <img key={m.id} src={file(`${m.id}-mark${v.suffix}.svg`)} width={48} height={48} alt={`${m.name}, ${v.name.toLowerCase()}, on ${bgName}`} />
                      ))}
                    </Tile>
                    <p className="mt-2 text-xs font-medium text-muted">On {bgName}</p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      <Section
        id="app-icons"
        title="App icons"
        lede="App icons are the reversed mark at 70% size on a pandan rounded square (27-unit corner on the 120 grid). Use the 512 px for app stores and social profile pictures and the 32 px for favicons. The phone or app store adds its own rounding on top, so don't add extra corners or shadows."
      >
        <ul className="grid gap-3 md:grid-cols-3">
          {MARKS.map((m) => (
            <li key={m.id} className="flex flex-col gap-5 rounded-card bg-card p-6 ring-1 ring-inset ring-border sm:p-8">
              <div className="flex items-end gap-4">
                <img src={file(`${m.id}-app-icon-512.png`)} width={96} height={96} alt={`${m.name} app icon`} />
                <img src={file(`${m.id}-app-icon-32.png`)} width={32} height={32} alt={`${m.name} app icon, 32 px`} />
              </div>
              <div className="flex flex-wrap gap-2">
                <DownloadLink href={file(`${m.id}-app-icon.svg`)}>SVG</DownloadLink>
                <DownloadLink href={file(`${m.id}-app-icon-512.png`)}>512 px</DownloadLink>
                <DownloadLink href={file(`${m.id}-app-icon-180.png`)}>180 px</DownloadLink>
                <DownloadLink href={file(`${m.id}-app-icon-32.png`)}>32 px</DownloadLink>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="colour" title="Colour" lede="dahon was added with the logo family and isn't on the website yet. Don't use it for text on gatas: the contrast is too low.">
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PALETTE.map((c) => (
            <li key={c.token} className="overflow-hidden rounded-card bg-card ring-1 ring-inset ring-border">
              <div className="flex h-28 items-end p-5 ring-1 ring-inset ring-border" style={{ background: c.hex, color: c.fg }}>
                <span className="font-semibold">{c.token}</span>
              </div>
              <div className="p-5">
                <p className="font-mono text-sm font-semibold">{c.hex}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{c.use}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-6 max-w-[68ch] text-sm leading-relaxed text-muted">
          In the notebook, the substitution, omission, distortion and addition colours (amber, rose, blue and violet) stay outside the brand palette on purpose:
          they carry clinical meaning and must never be confused with the brand greens.
        </p>
      </Section>

      <Section id="type" title="Type">
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-card bg-card p-6 ring-1 ring-inset ring-border sm:p-8">
            <p className="text-sm font-medium text-muted">Montserrat SemiBold (600)</p>
            <p className="mt-4 font-brand text-5xl/[52px] font-semibold tracking-[-0.02em]">tinig labs</p>
            <p className="mt-4 text-sm leading-relaxed text-muted">Only for the brand name: the wordmark and every mention of tinig labs in headings.</p>
          </div>
          <div className="rounded-card bg-card p-6 ring-1 ring-inset ring-border sm:p-8">
            <p className="text-sm font-medium text-muted">Figtree (400, 500 and 600)</p>
            <p className="mt-4 text-2xl/8 font-semibold">Your patients&apos; voices, organised.</p>
            <p className="mt-2 leading-6">Record, label, transcribe and track progress.</p>
            <p className="mt-2 text-sm/5 font-medium text-muted">notebook</p>
            <p className="mt-4 text-sm leading-relaxed text-muted">For everything else: headings, body, buttons and product names.</p>
          </div>
        </div>
      </Section>

      <Section id="donts" title="Don'ts">
        <ul className="grid gap-3 sm:grid-cols-2">
          {DONTS.map((d) => (
            <li key={d} className="rounded-panel bg-surface px-5 py-4 text-sm leading-relaxed">
              {d}
            </li>
          ))}
        </ul>
      </Section>

      <Section id="files" title="Files" lede="Each mark as SVG in its primary, reversed, mono ink and mono white versions, and the app icons as SVG and PNG.">
        <ul className="space-y-3">
          {MARKS.map((m) => (
            <li key={m.id} className="flex flex-col gap-4 rounded-card bg-card p-6 ring-1 ring-inset ring-border sm:flex-row sm:items-center sm:justify-between">
              <span className="flex items-center gap-3 font-semibold">
                <img src={file(`${m.id}-mark.svg`)} width={32} height={32} alt="" />
                {m.name}
              </span>
              <div className="flex flex-wrap gap-2">
                {VERSIONS.map((v) => (
                  <DownloadLink key={v.name} href={file(`${m.id}-mark${v.suffix}.svg`)}>
                    {v.name}
                  </DownloadLink>
                ))}
                <DownloadLink href={file(`${m.id}-app-icon-512.png`)}>App icon</DownloadLink>
              </div>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
