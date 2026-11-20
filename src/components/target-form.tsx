"use client";

import { useRef, useState } from "react";
import { Keyboard, Sparkles } from "lucide-react";
import { Button, Field, IconButton, Input, Segmented, Textarea } from "./ui";
import { FormError } from "./auth/auth-shell";
import { IpaKeyboard } from "./ipa-keyboard/ipa-keyboard";
import { newId, put, useItems } from "@/lib/local/store";
import { suggestTagalogIpa } from "@/lib/ipa/g2p-tl";
import type { Target } from "@/lib/local/types";

const split = (s: string) =>
  s
    .split(/[,;\n]/)
    .map((x) => x.trim())
    .filter(Boolean);

/** All set names in use, for suggestions. */
export function useTargetSets() {
  const targets = useItems("target");
  return [...new Set(targets.flatMap((t) => t.value.sets))].sort((a, b) => a.localeCompare(b));
}

export function TargetForm({
  id,
  initial,
  onDone,
  onCancel,
  compact,
}: {
  id?: string;
  initial?: Partial<Target>;
  onDone: (id: string) => void;
  onCancel?: () => void;
  compact?: boolean;
}) {
  const sets = useTargetSets();
  const [text, setText] = useState(initial?.text ?? "");
  const [type, setType] = useState<Target["type"]>(initial?.type ?? "word");
  const [ipa, setIpa] = useState(initial?.ipa?.[0] ?? "");
  const [suggested, setSuggested] = useState(false);
  const [variants, setVariants] = useState((initial?.ipa ?? []).slice(1).join(", "));
  const [setsText, setSetsText] = useState((initial?.sets ?? []).join(", "));
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [kb, setKb] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ipaRef = useRef<HTMLInputElement>(null);

  function suggest() {
    const s = suggestTagalogIpa(text);
    if (s) {
      setIpa(s);
      setSuggested(true);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return setError("Enter the word or sentence.");
    if (!ipa.trim()) return setError("Add the ideal IPA (tap Suggest for a Tagalog draft).");
    const value: Target = {
      text: text.trim(),
      type,
      ipa: [ipa.trim(), ...split(variants)],
      sets: split(setsText),
      notes: notes.trim() || undefined,
    };
    const tid = id ?? newId();
    await put("target", tid, value);
    onDone(tid);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <Field label="Word or sentence">
          <Input
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (suggested || !ipa) {
                // Keep the draft in step with the spelling until the SLP edits it.
                const s = suggestTagalogIpa(e.target.value);
                setIpa(s);
                setSuggested(!!s);
              }
            }}
            maxLength={300}
            autoFocus={!id}
            placeholder="e.g. saging"
          />
        </Field>
        <div className="space-y-2">
          <span className="text-sm font-medium text-muted">Type</span>
          <Segmented
            label="Type"
            value={type}
            onChange={setType}
            options={[
              { value: "word", label: "Word" },
              { value: "phrase", label: "Phrase" },
              { value: "sentence", label: "Sentence" },
            ]}
          />
        </div>
      </div>

      <Field label="Ideal IPA" hint={suggested ? "Suggested from Tagalog spelling. Check stress and glottal stops." : "Spaces between words are optional."}>
        <div className="flex gap-2">
          <Input
            ref={ipaRef}
            value={ipa}
            onChange={(e) => {
              setIpa(e.target.value);
              setSuggested(false);
            }}
            className={`ipa text-lg ${suggested ? "italic text-accent" : ""}`}
            spellCheck={false}
            maxLength={400}
          />
          <IconButton label="Suggest from spelling" variant="secondary" type="button" onClick={suggest} disabled={!text.trim()}>
            <Sparkles size={18} />
          </IconButton>
          <IconButton label="IPA keyboard" variant={kb ? "primary" : "secondary"} type="button" onClick={() => setKb((k) => !k)}>
            <Keyboard size={18} />
          </IconButton>
        </div>
      </Field>
      {kb && (
        <IpaKeyboard
          value={ipa}
          onChange={(v) => {
            setIpa(v);
            setSuggested(false);
          }}
          targetRef={ipaRef}
        />
      )}

      {!compact && (
        <>
          <Field label="Also accept (optional)" hint="Other correct pronunciations, separated by commas.">
            <Input value={variants} onChange={(e) => setVariants(e.target.value)} className="ipa" spellCheck={false} />
          </Field>
          <Field label="Sets (optional)" hint="Group targets, e.g. /s/ initial, Week 1. Separate with commas.">
            <Input value={setsText} onChange={(e) => setSetsText(e.target.value)} list="target-sets" />
            <datalist id="target-sets">
              {sets.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </Field>
          <Field label="Notes (optional)">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} className="min-h-16" />
          </Field>
        </>
      )}

      <FormError message={error} />
      <div className="flex gap-2">
        <Button type="submit" className="h-12">
          {id ? "Save" : "Add target"}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" className="h-12" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
