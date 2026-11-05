import { integrations, env } from "@/lib/env";
import { usingSupabase } from "@/lib/db";
import { site } from "@/lib/site";
import { Card, Label, StatusPill } from "@/components/ui";

export default async function SettingsPage() {
  const list = integrations();
  return (
    <div className="space-y-6">
      <div>
        <Label>Integrations</Label>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">What's connected</h1>
        <p className="mt-1 text-sm text-muted">Keys live in <code className="font-mono text-xs">.env.local</code> locally and in Vercel environment variables in production. They're never shown here.</p>
      </div>
      <Card className="divide-y divide-line">
        {list.map((i) => (
          <div key={i.key} className="grid gap-2 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <div className="font-medium">{i.label}</div>
              <div className="text-sm text-muted">{i.purpose}</div>
              <div className="mt-1 font-mono text-[11px] text-faint">{i.envVars.join(" · ")}</div>
            </div>
            <StatusPill status={i.enabled ? "pass" : "warn"} className="justify-self-start sm:justify-self-end" />
          </div>
        ))}
      </Card>
      <Card className="p-5 text-sm">
        <Label>Runtime</Label>
        <dl className="mt-3 grid grid-cols-[10rem_1fr] gap-y-1.5 text-ink-2">
          <dt>Site URL</dt><dd className="font-mono text-xs">{site.url}</dd>
          <dt>Storage</dt><dd>{usingSupabase() ? "Supabase" : "Local JSON file (.data/surfaced.json)"}</dd>
          <dt>Email sender</dt><dd className="font-mono text-xs">{env.resendFrom}</dd>
          <dt>Models</dt><dd className="font-mono text-xs">{env.openaiModel} · {env.geminiModel} · {env.perplexityModel} · {env.anthropicModel}</dd>
          <dt>Weekly cron</dt><dd>{env.cronSecret ? "Protected with CRON_SECRET" : "Set CRON_SECRET before deploying"}</dd>
        </dl>
      </Card>
    </div>
  );
}
