import Link from "next/link";
import { db } from "@/lib/db";
import { integrations } from "@/lib/env";
import { prospectStatuses } from "@/lib/types";
import { Card, Label, StatTile, LinkButton } from "@/components/ui";
import { ArrowRight } from "lucide-react";

export default async function Overview() {
  const [prospects, clients, audits] = await Promise.all([db.prospects.list(), db.clients.list(), db.audits.list(200)]);
  const active = clients.filter((c) => c.status === "active");
  const mrr = active.reduce((s, c) => s + Number(c.monthly_value || 0), 0);
  const inbound = audits.filter((a) => !a.prospect_id && !a.client_id);
  const counts = Object.fromEntries(prospectStatuses.map((s) => [s, prospects.filter((p) => p.status === s).length]));
  const maxCount = Math.max(1, ...Object.values(counts));
  const missing = integrations().filter((i) => !i.enabled);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Label>Overview</Label>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Agency at a glance</h1>
        </div>
        <LinkButton href="/app/prospects" size="sm">Find prospects <ArrowRight size={14} /></LinkButton>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="MRR" value={`$${mrr.toLocaleString()}`} sub={`Target $2,000–5,000 · ${Math.min(100, Math.round((mrr / 2000) * 100))}% of $2k`} />
        <StatTile label="Active clients" value={active.length} sub={`${clients.filter((c) => c.plan === "pilot").length} on free pilot`} />
        <StatTile label="Prospects" value={prospects.length} sub={`${counts.contacted ?? 0} contacted · ${counts.replied ?? 0} replied`} />
        <StatTile label="Inbound audits" value={inbound.length} sub="From the public audit form" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
        <Card className="p-5">
          <Label>Pipeline</Label>
          <div className="mt-4 space-y-2.5">
            {prospectStatuses.map((s) => (
              <div key={s} className="grid grid-cols-[5.5rem_1fr_2rem] items-center gap-3 text-sm">
                <span className="capitalize text-ink-2">{s}</span>
                <div className="h-2 rounded-full bg-paper-2">
                  <div className="h-full rounded-full bg-accent-2" style={{ width: `${(counts[s] / maxCount) * 100}%`, minWidth: counts[s] ? 6 : 0 }} />
                </div>
                <span className="tabular text-right">{counts[s]}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <Label>Recent audits</Label>
            <Link href="/app/audits" className="text-xs text-muted hover:text-ink">All audits →</Link>
          </div>
          {audits.length === 0 ? (
            <p className="mt-6 text-sm text-muted">No audits yet. Run one from the homepage or the Prospects tab.</p>
          ) : (
            <table className="mt-3 w-full text-sm">
              <tbody className="divide-y divide-line">
                {audits.slice(0, 7).map((a) => (
                  <tr key={a.id}>
                    <td className="py-2.5"><Link href={`/report/${a.id}`} className="hover:underline">{a.business_name}</Link></td>
                    <td className="py-2.5 text-muted">{a.suburb}</td>
                    <td className="label py-2.5">{a.prospect_id ? "Prospect" : a.client_id ? "Client" : "Inbound"}</td>
                    <td className="tabular py-2.5 text-right font-medium">{a.overall_score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      {missing.length > 0 && (
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <Label>Setup · {missing.length} integrations not connected</Label>
            <Link href="/app/settings" className="text-xs text-muted hover:text-ink">Details →</Link>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {missing.map((i) => (
              <span key={i.key} className="rounded-md border border-line bg-paper px-2 py-1 text-xs text-ink-2">{i.label}</span>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
