import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import { db } from "@/lib/db";
import { getCategory } from "@/lib/categories";
import { pillarMeta } from "@/lib/audit/score";
import { site } from "@/lib/site";
import { Card, Label, Logo } from "@/components/ui";
import { ClientDashboard } from "@/components/client-dashboard";
import { PrintButton } from "@/components/print-button";
import { placeLabel } from "@/lib/locale";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your dashboard", robots: { index: false, follow: false } };

export default async function ClientPortal({ params }: PageProps<"/c/[token]">) {
  const { token } = await params;
  const c = await db.clients.byToken(token);
  if (!c || c.status === "cancelled") notFound();
  const [runs, audits] = await Promise.all([db.runs.forClient(c.id), db.audits.forClient(c.id)]);
  const baseline = c.baseline_audit_id ? await db.audits.get(c.baseline_audit_id) : null;
  const all = baseline && !audits.some((a) => a.id === baseline.id) ? [baseline, ...audits] : audits;
  const done = c.fixes.filter((f) => f.done);
  const next = c.fixes.filter((f) => !f.done).slice(0, 5);

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-card">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
          <Logo />
          <div className="flex items-center gap-3">
            <span className="label hidden sm:block">Private dashboard</span>
            <PrintButton label="Save report" />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl space-y-8 px-5 py-8">
        <div>
          <Label>{getCategory(c.category).label} · {placeLabel(c)}</Label>
          <h1 className="mt-1 text-[28px] font-semibold tracking-tight">{c.name}</h1>
          <p className="mt-1 text-sm text-muted">How often AI assistants name you when locals ask, updated weekly.</p>
        </div>

        <ClientDashboard client={c} runs={runs} audits={all} />

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-5">
            <Label>Done so far · {done.length}</Label>
            {done.length ? (
              <ul className="mt-3 space-y-2 text-sm">
                {done.map((f) => (
                  <li key={f.id} className="flex gap-2">
                    <Check size={15} className="mt-0.5 shrink-0 text-good" />
                    <span>{f.title} <span className="label ml-1">{pillarMeta[f.pillar].label}</span></span>
                  </li>
                ))}
              </ul>
            ) : <p className="mt-3 text-sm text-muted">Work starts this week.</p>}
          </Card>
          <Card className="p-5">
            <Label>Up next</Label>
            {next.length ? (
              <ol className="mt-3 space-y-2 text-sm">
                {next.map((f, i) => (
                  <li key={f.id} className="flex gap-3"><span className="font-mono text-xs text-accent">{String(i + 1).padStart(2, "0")}</span>{f.title}</li>
                ))}
              </ol>
            ) : <p className="mt-3 text-sm text-muted">All current fixes complete. We're now focused on reviews and directory listings.</p>}
          </Card>
        </div>

        <p className="label border-t border-line pt-4">
          Questions? Email {site.contactEmail}. AI answers vary day to day; we track the same questions every week so the trend is what matters.
        </p>
      </main>
    </div>
  );
}
