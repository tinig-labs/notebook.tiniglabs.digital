import type { Metadata } from "next";
import { AudioLines, Download, Mic, RefreshCw, ShieldCheck, Tags, WifiOff } from "lucide-react";
import { RequestAccessForm } from "./request-access-form";
import { HeroActions } from "@/components/session-links";
import { SITE_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: { absolute: "Notebook · tinig labs" },
  alternates: { canonical: SITE_URL },
};

const FEATURES = [
  { icon: Mic, title: "Record in a tap", text: "Clean, unprocessed audio for every drill." },
  { icon: Tags, title: "Label and compare", text: "Tag targets and sessions. Hear progress side by side." },
  { icon: AudioLines, title: "IPA transcription", text: "Phonetic transcription you can review and correct." },
  { icon: WifiOff, title: "Works offline", text: "Record anywhere. It syncs when you're back online." },
  { icon: RefreshCw, title: "Every device", text: "Android, iPhone, iPad and computer, always in sync." },
  { icon: ShieldCheck, title: "Encrypted", text: "Encrypted on your device. No passphrase to remember." },
  { icon: Download, title: "Yours to keep", text: "Export audio and notes any time." },
];

export default function Home() {
  return (
    <>
      <section className="grid gap-12 pb-20 sm:pb-28 lg:grid-cols-[1.1fr_1fr] lg:items-center">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-surface px-3.5 py-1.5 text-sm font-semibold text-accent">
            <span className="size-2 rounded-full bg-accent" aria-hidden="true" />
            Closed beta for SLPs
          </p>
          <h1 className="mt-6 max-w-[14ch] text-[clamp(2.5rem,11vw,3rem)] font-medium leading-[1.05] tracking-[-0.035em] sm:text-[4.5rem]">
            Your patients&apos; voices, organised.
          </h1>
          <p className="mt-6 max-w-[44ch] text-lg leading-relaxed text-muted">
            A recording notebook for speech-language pathologists. Record, label, transcribe and track progress.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <HeroActions />
          </div>
        </div>
        <div className="rounded-[28px] bg-surface p-3" aria-hidden="true">
          <div className="rounded-[20px] bg-card p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-full bg-accent text-white">
                <Mic size={20} />
              </span>
              <div>
                <p className="font-semibold">J. D. · /s/ initial</p>
                <p className="text-sm text-muted">Week 6 · 0:08</p>
              </div>
            </div>
            <p className="ipa mt-6 text-[2.5rem] leading-tight tracking-wide text-accent sm:text-[3.25rem]">saˈgiŋ</p>
            <div className="mt-6 flex flex-wrap gap-2 text-sm font-semibold">
              {["Baseline", "Week 3", "Week 6"].map((t, i) => (
                <span key={t} className={`rounded-full px-3.5 py-1.5 ${i === 2 ? "bg-accent text-white" : "bg-surface text-accent"}`}>
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="features" className="pb-20 sm:pb-28">
        <h2 id="features" className="sr-only">
          Features
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <li key={title} className="rounded-[28px] bg-surface p-6">
              <span className="flex size-11 items-center justify-center rounded-full bg-card text-accent">
                <Icon size={20} aria-hidden="true" />
              </span>
              <p className="mt-4 font-semibold">{title}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted">{text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section id="request" aria-labelledby="request-title" className="scroll-mt-6 rounded-[28px] bg-surface p-3 sm:p-4">
        <div className="grid gap-8 rounded-[20px] bg-card p-6 sm:p-10 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <h2 id="request-title" className="text-[1.75rem] font-medium leading-[1.2] tracking-[-0.02em] sm:text-[2.75rem]">
              Join the beta
            </h2>
            <p className="mt-4 max-w-[36ch] text-lg leading-relaxed text-muted">For practising SLPs. We&apos;ll email you when your access is ready.</p>
          </div>
          <RequestAccessForm />
        </div>
      </section>
    </>
  );
}
