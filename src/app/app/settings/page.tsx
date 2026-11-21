"use client";

import { useEffect, useState } from "react";
import { Download, HardDrive, LogOut, MonitorSmartphone, ShieldCheck, Smartphone, Trash2, UserRound } from "lucide-react";
import { Button, Card, Field, Input } from "@/components/ui";
import { FormError } from "@/components/auth/auth-shell";
import { authClient } from "@/lib/auth/client";
import { loadMe, type Me } from "@/lib/local/keys";
import { signOutEverywhereLocal } from "@/lib/local/boot";
import { exportZip } from "@/lib/local/export";
import { api, useSyncStatus } from "@/lib/local/sync";
import { useItems } from "@/lib/local/store";
import { fmtDate } from "@/lib/format";

type Device = { id: string; name: string; lastSeenAt: number; current: boolean };

const mb = (b: number) => `${(b / 1024 / 1024).toFixed(b > 100 * 1024 * 1024 ? 0 : 1)} MB`;

function Section({ icon: Icon, title, children }: { icon: typeof Download; title: string; children: React.ReactNode }) {
  return (
    <Card className="space-y-4 ring-1 ring-inset ring-border">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <Icon size={20} className="text-accent" aria-hidden="true" /> {title}
      </h2>
      {children}
    </Card>
  );
}

export default function SettingsPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [devices, setDevices] = useState<Device[] | null>(null);
  const [storage, setStorage] = useState<{ usage: number; quota: number; persisted: boolean } | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const sync = useSyncStatus();
  const patients = useItems("patient");
  const recordings = useItems("recording");

  useEffect(() => {
    void loadMe().then((m) => setMe(m ?? null));
    void navigator.storage
      ?.estimate?.()
      .then(async (e) => setStorage({ usage: e.usage ?? 0, quota: e.quota ?? 0, persisted: (await navigator.storage.persisted?.()) ?? false }));
  }, []);

  useEffect(() => {
    if (sync.state === "offline") return;
    api("/api/devices")
      .then((r) => r.json() as Promise<{ devices: Device[] }>)
      .then((j) => setDevices(j.devices))
      .catch(() => setDevices(null));
  }, [sync.state]);

  async function doExport() {
    setProgress("Preparing…");
    try {
      const r = await exportZip(undefined, (d, t) => setProgress(`Decrypting ${d} of ${t}…`));
      setProgress(r.missing ? `Done. ${r.missing} clips weren't on this device (see MISSING.txt).` : "Done.");
    } catch (e) {
      setProgress(null);
      setError(e instanceof Error ? e.message : "Export failed.");
    }
  }

  async function signOut() {
    if (sync.pending && !window.confirm(`${sync.pending} changes haven't synced and will be lost on this device. Sign out anyway?`)) return;
    try {
      await authClient.signOut();
    } catch {}
    await signOutEverywhereLocal();
    location.replace("/sign-in");
  }

  async function revoke(id: string) {
    if (!window.confirm("Sign this device out? Its local copy is deleted next time it connects.")) return;
    await api("/api/devices", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ revoke: id }) });
    setDevices((d) => d?.filter((x) => x.id !== id) ?? null);
  }

  async function deleteAccount() {
    setError(null);
    try {
      await api("/api/account", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ confirm }) });
      await signOutEverywhereLocal();
      location.replace("/?deleted=1");
    } catch {
      setError("Couldn't delete. Check the email and that you're online.");
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="mb-2 text-[clamp(2rem,8vw,2.5rem)] font-medium leading-[1.1] tracking-[-0.03em]">Settings</h1>

      <Section icon={UserRound} title="Account">
        <p>
          {me?.name && <span className="font-semibold">{me.name} · </span>}
          <span className="text-muted">{me?.email}</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {me?.admin && (
            <a href="/admin" className="inline-flex h-11 items-center rounded-full px-5 text-sm font-semibold text-accent hover:bg-surface">
              Beta admin
            </a>
          )}
          <Button variant="secondary" onClick={signOut}>
            <LogOut size={16} aria-hidden="true" /> Sign out of this device
          </Button>
        </div>
      </Section>

      <Section icon={Download} title="Export">
        <p className="text-sm text-muted">
          {patients.length} patients · {recordings.length} recordings. A ZIP with WAV audio, IPA and notes (CSV + JSON).
        </p>
        <Button onClick={doExport} disabled={!!progress && !progress.startsWith("Done")}>
          <Download size={16} aria-hidden="true" /> Export everything
        </Button>
        {progress && (
          <p role="status" className="text-sm text-muted">
            {progress}
          </p>
        )}
      </Section>

      <Section icon={MonitorSmartphone} title="Devices">
        {devices === null ? (
          <p className="text-sm text-muted">Connect to see your devices.</p>
        ) : (
          <ul className="divide-y divide-border">
            {devices.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 py-3">
                <span className="flex items-center gap-3">
                  <Smartphone size={18} className="text-muted" aria-hidden="true" />
                  <span>
                    <span className="font-medium">{d.name}</span>
                    <span className="block text-xs text-muted">{d.current ? "This device" : `Last seen ${fmtDate(d.lastSeenAt)}`}</span>
                  </span>
                </span>
                {!d.current && (
                  <Button variant="ghost" onClick={() => void revoke(d.id)}>
                    Sign out
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section icon={HardDrive} title="On this device">
        {storage && (
          <p className="text-sm text-muted">
            {mb(storage.usage)} used{storage.quota ? ` of ${mb(storage.quota)} available` : ""}.{" "}
            {storage.persisted ? "Protected from automatic clean-up." : "Install the app to keep the browser from clearing it."}
          </p>
        )}
        <p className="flex items-start gap-2 text-sm text-muted">
          <ShieldCheck size={16} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
          Everything here is encrypted with a key this device can use but can&apos;t export.
        </p>
      </Section>

      <Section icon={Trash2} title="Delete account">
        <p className="text-sm text-muted">Erases all patients, recordings and keys from our servers and this device. Export first.</p>
        <Field label={`Type ${me?.email ?? "your email"} to confirm`}>
          <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" />
        </Field>
        <FormError message={error} />
        <Button variant="danger" disabled={!me || confirm.trim().toLowerCase() !== me.email.toLowerCase()} onClick={deleteAccount}>
          <Trash2 size={16} aria-hidden="true" /> Delete everything
        </Button>
      </Section>

      <p className="px-2 pt-2 text-sm text-muted">
        <a href="/privacy" className="font-semibold text-accent">
          Privacy
        </a>{" "}
        ·{" "}
        <a href="/terms" className="font-semibold text-accent">
          Terms
        </a>
      </p>
    </div>
  );
}
