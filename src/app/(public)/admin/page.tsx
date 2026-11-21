import type { Metadata } from "next";
import { desc } from "drizzle-orm";
import { Check, UserMinus, UserPlus, X } from "lucide-react";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/session";
import { NOINDEX } from "@/lib/constants";
import { Badge, Button, Card, Input, PageHeader } from "@/components/ui";
import { approve, deny, revoke } from "./actions";

export const metadata: Metadata = { title: "Admin", robots: NOINDEX };

const fmt = (d: Date) => d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });

export default async function AdminPage() {
  await requireAdmin();
  const [requests, allowed] = await Promise.all([
    db().select().from(schema.accessRequests).orderBy(desc(schema.accessRequests.createdAt)).limit(500),
    db().select().from(schema.allowlist).orderBy(desc(schema.allowlist.approvedAt)),
  ]);
  const pending = requests.filter((r) => r.status === "pending");
  const decided = requests.filter((r) => r.status !== "pending");

  return (
    <div className="space-y-10">
      <PageHeader title="Beta access">
        <Badge>{allowed.length} approved</Badge>
      </PageHeader>

      <Card className="space-y-4">
        <h2 className="text-lg font-semibold">Add someone directly</h2>
        <form action={approve} className="flex flex-col gap-2 sm:flex-row">
          <Input name="email" type="email" placeholder="slp@example.com" required />
          <Button type="submit" className="h-12">
            <UserPlus size={18} aria-hidden="true" /> Approve
          </Button>
        </form>
      </Card>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Waiting ({pending.length})</h2>
        {pending.length === 0 && <p className="text-muted">No pending requests.</p>}
        <ul className="space-y-2">
          {pending.map((r) => (
            <li key={r.email} className="flex flex-wrap items-center justify-between gap-3 rounded-panel bg-card p-4 ring-1 ring-inset ring-border">
              <div className="min-w-0">
                <p className="font-semibold">{r.name}</p>
                <p className="truncate text-sm text-muted">
                  {r.email} · {r.clinic || "No clinic"} · PRC {r.prcLicense || "—"} · {fmt(r.createdAt)}
                </p>
              </div>
              <div className="flex gap-2">
                <form action={approve}>
                  <input type="hidden" name="email" value={r.email} />
                  <Button type="submit">
                    <Check size={16} aria-hidden="true" /> Approve
                  </Button>
                </form>
                <form action={deny}>
                  <input type="hidden" name="email" value={r.email} />
                  <Button type="submit" variant="secondary">
                    <X size={16} aria-hidden="true" /> Deny
                  </Button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Approved</h2>
        <ul className="divide-y divide-border rounded-panel bg-card ring-1 ring-inset ring-border">
          {allowed.map((a) => (
            <li key={a.email} className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="min-w-0 truncate">
                {a.email} <span className="text-sm text-muted">· {fmt(a.approvedAt)}</span>
              </span>
              <form action={revoke}>
                <input type="hidden" name="email" value={a.email} />
                <Button type="submit" variant="danger" aria-label={`Remove access for ${a.email}`}>
                  <UserMinus size={16} aria-hidden="true" /> Remove
                </Button>
              </form>
            </li>
          ))}
        </ul>
      </section>

      {decided.length > 0 && (
        <details className="text-sm text-muted">
          <summary className="cursor-pointer font-semibold">Past requests ({decided.length})</summary>
          <ul className="mt-2 space-y-1">
            {decided.map((r) => (
              <li key={r.email}>
                {r.email} · {r.status}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
