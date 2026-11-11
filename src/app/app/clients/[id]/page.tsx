import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { db } from "@/lib/db";
import { getCategory } from "@/lib/categories";
import { buildFixPack } from "@/lib/fixpack";
import { clientPrompts } from "@/lib/tracker";
import { aiEnginesEnabled } from "@/lib/env";
import { site } from "@/lib/site";
import { pillarMeta } from "@/lib/audit/score";
import { Card, Label, inputCls, Field } from "@/components/ui";
import { ActionButton, SubmitButton } from "@/components/action-ui";
import { CopyButton } from "@/components/print-button";
import { ClientDashboard } from "@/components/client-dashboard";
import { auditClient, emailMonthlyReport, toggleFix, trackNow, updateClientSetup } from "../../actions";
import { placeLabel } from "@/lib/locale";

export const maxDuration = 300;

export default async function ClientPage({ params, searchParams }: PageProps<"/app/clients/[id]">) {
  const { id } = await params;
  const { ai } = await searchParams;
  const c = await db.clients.get(id);
  if (!c) notFound();
  const [runs, audits] = await Promise.all([db.runs.forClient(c.id), db.audits.forClient(c.id)]);
  const baseline = c.baseline_audit_id ? await db.audits.get(c.baseline_audit_id) : null;
  const allAudits = baseline && !audits.some((a) => a.id === baseline.id) ? [baseline, ...audits] : audits;
  const latestAudit = allAudits.at(-1);
  const pack = latestAudit ? await buildFixPack(latestAudit.result, { useAi: ai === "1" }) : null;
  const portal = `${site.url}/c/${c.share_token}`;
  const engines = aiEnginesEnabled();

  return (
    <div className="space-y-8">
      <Link href="/app/clients" className="text-sm text-muted hover:text-ink">← Clients</Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Label>{getCategory(c.category).label} · {placeLabel(c)} · <span className="capitalize">{c.plan}</span> · ${Number(c.monthly_value)}/mo</Label>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{c.name}</h1>
          <a href={c.website} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">{c.website.replace(/^https?:\/\//, "")} <ExternalLink size={12} /></a>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CopyButton text={portal} label="Copy client link" />
          <Link href={`/c/${c.share_token}`} target="_blank" className="inline-flex h-8 items-center rounded-lg border border-line-2 bg-card px-3 text-[13px] hover:bg-paper-2">Open portal</Link>
        </div>
      </div>

      <Card className="flex flex-wrap items-center gap-3 p-4">
        <ActionButton action={trackNow.bind(null, c.id)} variant="dark" pendingLabel={`Asking ${engines} engines…`}>Run weekly check now</ActionButton>
        <ActionButton action={auditClient.bind(null, c.id)} pendingLabel="Auditing…">Re-audit site</ActionButton>
        <ActionButton action={emailMonthlyReport.bind(null, c.id)} pendingLabel="Sending…">Email monthly report</ActionButton>
        {engines === 0 && <span className="text-xs text-warn">No AI keys configured. Tracking needs at least one.</span>}
      </Card>

      <ClientDashboard client={c} runs={runs} audits={allAudits} />

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Card className="p-5">
          <Label>Fix checklist</Label>
          {c.fixes.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Run an audit to generate the checklist.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {c.fixes.map((f) => (
                <li key={f.id} className="flex items-start gap-3 py-2.5">
                  <form action={toggleFix.bind(null, c.id, f.id)}>
                    <button aria-label={f.done ? "Mark not done" : "Mark done"} className={`mt-0.5 flex h-4.5 w-4.5 items-center justify-center rounded border text-[11px] ${f.done ? "border-accent bg-accent text-white" : "border-line-2 bg-card"}`}>
                      {f.done ? "✓" : ""}
                    </button>
                  </form>
                  <div className="flex-1">
                    <div className={`text-sm ${f.done ? "text-muted line-through" : ""}`}>{f.title}</div>
                    <div className="label mt-0.5">{pillarMeta[f.pillar].label}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <Label>Tracking setup</Label>
          <form action={updateClientSetup.bind(null, c.id)} className="mt-4 space-y-3">
            <Field label="Competitors (one per line, max 5)" hint="Use names exactly as customers would say them.">
              <textarea name="competitors" defaultValue={c.competitors.join("\n")} rows={4} className={`${inputCls} h-auto py-2`} />
            </Field>
            <Field label="Tracked questions (one per line)">
              <textarea name="prompts" defaultValue={clientPrompts(c).join("\n")} rows={6} className={`${inputCls} h-auto py-2 text-[13px]`} />
            </Field>
            <div className="grid grid-cols-3 gap-2">
              <Field label="Contact email"><input name="contact_email" defaultValue={c.contact_email ?? ""} className={inputCls} /></Field>
              <Field label="Plan">
                <select name="plan" defaultValue={c.plan} className={inputCls}>
                  {["pilot", "fixpack", "tracking", "visibility", "growth"].map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
              <Field label="Status">
                <select name="status" defaultValue={c.status} className={inputCls}>
                  {["active", "paused", "cancelled"].map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
            </div>
            <SubmitButton variant="secondary" size="sm">Save setup</SubmitButton>
          </form>
        </Card>
      </div>

      {pack && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <Label>Fix Pack · generated from the latest audit</Label>
              <h2 className="mt-1 text-xl font-semibold tracking-tight">Copy-paste deliverables</h2>
            </div>
            {!pack.aiWritten && engines > 0 && (
              <Link href={`/app/clients/${c.id}?ai=1`} className="text-sm text-accent underline underline-offset-2">Write FAQ answers with AI</Link>
            )}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <CodeCard title="LocalBusiness schema" note="Paste into the <head> of every page." code={pack.schema} />
            <CodeCard title="FAQ schema" note="Paste on the page that shows the FAQs." code={pack.faqSchema} />
            <CodeCard title="llms.txt" note="Upload to the site root: /llms.txt" code={pack.llmsTxt} />
            <CodeCard title="robots.txt" note="Merge with the existing robots.txt." code={pack.robotsTxt} />
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="p-5 lg:col-span-1">
              <div className="flex items-center justify-between">
                <Label>FAQ copy {pack.aiWritten ? "· AI drafted" : "· template"}</Label>
                <CopyButton text={pack.faqs.map((f) => `${f.q}\n${f.a}`).join("\n\n")} />
              </div>
              <dl className="mt-3 space-y-3 text-sm">
                {pack.faqs.map((f) => (
                  <div key={f.q}><dt className="font-medium">{f.q}</dt><dd className="mt-0.5 text-ink-2">{f.a}</dd></div>
                ))}
              </dl>
            </Card>
            <Card className="p-5">
              <Label>Google Business Profile</Label>
              <ul className="mt-3 space-y-2 text-sm text-ink-2">{pack.gbpChecklist.map((g) => <li key={g} className="flex gap-2"><span className="text-muted">□</span>{g}</li>)}</ul>
            </Card>
            <Card className="p-5">
              <Label>Directory citations</Label>
              <ul className="mt-3 space-y-1.5 text-sm text-ink-2">{pack.directories.map((d) => <li key={d} className="flex gap-2"><span className="text-muted">□</span>{d}</li>)}</ul>
              <p className="mt-3 text-xs text-muted">Same name, address and phone on every listing.</p>
            </Card>
          </div>
        </section>
      )}
    </div>
  );
}

function CodeCard({ title, note, code }: { title: string; note: string; code: string }) {
  return (
    <Card className="flex flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div>
          <div className="text-sm font-medium">{title}</div>
          <div className="text-xs text-muted">{note}</div>
        </div>
        <CopyButton text={code} />
      </div>
      <pre className="max-h-72 overflow-auto bg-night p-4 font-mono text-[11.5px] leading-relaxed text-[#c9d1de]">{code}</pre>
    </Card>
  );
}
