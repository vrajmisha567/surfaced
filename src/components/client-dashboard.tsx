import { Check, Minus, X } from "lucide-react";
import type { AuditRecord, Client, EngineId, TrackerRun } from "@/lib/types";
import { latestWeekRuns, weeklyStats } from "@/lib/tracker";
import { Card, Label, StatTile, EmptyState } from "./ui";
import { ShareBars, TrendChart } from "./charts";

const engineName: Record<EngineId, string> = { chatgpt: "ChatGPT", gemini: "Gemini", perplexity: "Perplexity", claude: "Claude", ollama: "Open model" };

export function ClientDashboard({ client, runs, audits }: { client: Client; runs: TrackerRun[]; audits: AuditRecord[] }) {
  const stats = weeklyStats(runs, client.competitors);
  const last = stats.at(-1);
  const prev = stats.at(-2);
  const latest = latestWeekRuns(runs);
  const engines = [...new Set(latest.map((r) => r.engine))];
  const prompts = [...new Set(latest.map((r) => r.prompt))];
  const latestAudit = audits.at(-1);
  const baseline = audits.find((a) => a.id === client.baseline_audit_id) ?? audits[0];
  const done = client.fixes.filter((f) => f.done).length;
  const delta = last && prev ? Math.round((last.rate - prev.rate) * 100) : null;
  const comps = client.competitors.slice(0, 3);

  const series = [
    { name: client.name, values: stats.map((s) => s.rate) },
    ...comps.map((c) => ({ name: c, values: stats.map((s) => (s.total ? (s.competitor[c] ?? 0) / s.total : null)) })),
  ];

  const sov = last
    ? [
        { name: client.name, value: last.shareOfVoice, isClient: true },
        ...comps.map((c) => {
          const total = last.mentioned + Object.values(last.competitor).reduce((s, n) => s + n, 0);
          return { name: c, value: total ? (last.competitor[c] ?? 0) / total : 0 };
        }),
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Named in AI answers"
          value={last ? `${Math.round(last.rate * 100)}%` : "—"}
          sub={last ? `${last.mentioned} of ${last.total} this week${delta !== null ? ` · ${delta >= 0 ? "+" : ""}${delta} pts vs last` : ""}` : "First check pending"}
        />
        <StatTile label="Share of voice" value={last ? `${Math.round(last.shareOfVoice * 100)}%` : "—"} sub={comps.length ? `vs ${comps.length} competitors` : "Add competitors to compare"} />
        <StatTile
          label="Site score"
          value={latestAudit ? latestAudit.overall_score : "—"}
          sub={baseline && latestAudit && baseline.id !== latestAudit.id ? `Started at ${baseline.overall_score}` : "Out of 100"}
        />
        <StatTile label="Fixes done" value={`${done}/${client.fixes.length}`} sub={client.fixes.length ? `${Math.round((done / client.fixes.length) * 100)}% complete` : "From the audit"} />
      </div>

      {stats.length === 0 ? (
        <EmptyState title="No tracking data yet">The first weekly check runs automatically every Monday. It records each AI engine's answer to your tracked questions.</EmptyState>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
          <Card className="min-w-0 p-5">
            <Label>Weekly mention rate</Label>
            <p className="mb-4 mt-1 text-xs text-muted">Share of tracked AI answers that named each business.</p>
            <TrendChart weeks={stats.map((s) => s.week)} series={series} />
          </Card>
          <Card className="p-5">
            <Label>Share of voice · {last?.week}</Label>
            <p className="mb-5 mt-1 text-xs text-muted">Of all mentions across you and your competitors this week, how many were you.</p>
            {sov.length > 1 ? <ShareBars rows={sov} /> : <p className="text-sm text-muted">Add competitors to see share of voice.</p>}
            {last && (
              <div className="mt-6 border-t border-line pt-4">
                <Label>By engine</Label>
                <div className="mt-3 space-y-1.5 text-sm">
                  {Object.entries(last.byEngine).map(([e, v]) => (
                    <div key={e} className="flex justify-between">
                      <span className="text-ink-2">{engineName[e as EngineId]}</span>
                      <span className="tabular">{v!.mentioned}/{v!.total}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {latest.length > 0 && (
        <Card className="overflow-x-auto">
          <div className="px-5 pt-5"><Label>This week's answers · {latest[0].week}</Label></div>
          <table className="mt-3 w-full min-w-[620px] text-sm">
            <thead>
              <tr className="border-y border-line text-left">
                <th className="label px-5 py-2.5 font-normal">Question</th>
                {engines.map((e) => <th key={e} className="label px-3 py-2.5 text-center font-normal">{engineName[e]}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {prompts.map((p) => (
                <tr key={p}>
                  <td className="px-5 py-3 text-ink-2">“{p}”</td>
                  {engines.map((e) => {
                    const r = latest.find((x) => x.prompt === p && x.engine === e);
                    return (
                      <td key={e} className="px-3 py-3 text-center" title={r?.others_named.length ? `Named: ${r.others_named.join(", ")}` : undefined}>
                        {!r || r.error ? <Minus size={14} className="mx-auto text-muted" /> : r.mentioned ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-good"><Check size={13} />{r.position ? `#${r.position}` : "Named"}</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-bad"><X size={13} />No</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
