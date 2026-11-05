import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Mail } from "lucide-react";
import { db } from "@/lib/db";
import { getCategory } from "@/lib/categories";
import { outreachDraft, mailtoLink } from "@/lib/outreach";
import { prospectStatuses } from "@/lib/types";
import { Card, Label, ScoreRing, inputCls, Field } from "@/components/ui";
import { ActionButton, SubmitButton } from "@/components/action-ui";
import { CopyButton } from "@/components/print-button";
import { auditProspect, convertProspect, deleteProspect, saveProspectNotes, setProspectStatus } from "../../actions";

export default async function ProspectPage({ params }: PageProps<"/app/prospects/[id]">) {
  const { id } = await params;
  const p = await db.prospects.get(id);
  if (!p) notFound();
  const audit = p.audit_id ? await db.audits.get(p.audit_id) : null;
  const draft = audit ? outreachDraft(p, audit) : null;
  const cat = getCategory(p.category);

  return (
    <div className="space-y-6">
      <Link href="/app/prospects" className="text-sm text-muted hover:text-ink">← Prospects</Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Label>{cat.label} · {p.suburb ?? "Adelaide"}</Label>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{p.name}</h1>
          <div className="mt-1 flex flex-wrap gap-x-4 text-sm text-muted">
            {p.website && <a href={p.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-ink">{p.website.replace(/^https?:\/\//, "")} <ExternalLink size={12} /></a>}
            {p.phone && <span>{p.phone}</span>}
            {p.rating && <span>{p.rating}★ · {p.review_count} Google reviews</span>}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {prospectStatuses.map((s) => (
            <form key={s} action={setProspectStatus.bind(null, p.id, s)}>
              <button className={`rounded-md px-2.5 py-1 text-xs capitalize ${p.status === s ? "bg-ink text-white" : "border border-line bg-card text-ink-2 hover:bg-paper-2"}`}>{s}</button>
            </form>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.6fr]">
        <div className="space-y-4">
          <Card className="p-5">
            <Label>Audit</Label>
            {audit ? (
              <div className="mt-4 flex items-center gap-5">
                <ScoreRing score={audit.overall_score} size={104} stroke={7} />
                <div className="space-y-2 text-sm">
                  <div>{audit.result.ai.measured ? `Named in ${audit.result.ai.answers.filter((a) => a.mentioned).length}/${audit.result.ai.answers.filter((a) => !a.error).length} AI answers` : "AI checks not run"}</div>
                  {audit.result.ai.topRivals[0] && <div className="text-muted">Top rival: {audit.result.ai.topRivals[0].name}</div>}
                  <Link href={`/report/${audit.id}`} className="inline-block text-accent underline underline-offset-2">Open public report</Link>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted">{p.website ? "Not audited yet." : "No website on file. Add one in notes or as a manual prospect."}</p>
            )}
            {p.website && (
              <div className="mt-4">
                <ActionButton action={auditProspect.bind(null, p.id)} variant={audit ? "secondary" : "primary"} pendingLabel="Auditing…">
                  {audit ? "Re-run audit" : "Run audit"}
                </ActionButton>
              </div>
            )}
          </Card>

          <Card className="p-5">
            <form action={saveProspectNotes.bind(null, p.id)} className="space-y-3">
              <Field label="Contact email"><input name="email" defaultValue={p.email ?? ""} className={inputCls} placeholder="owner@business.com.au" /></Field>
              <Field label="Notes"><textarea name="notes" defaultValue={p.notes ?? ""} rows={4} className={`${inputCls} h-auto py-2`} /></Field>
              <SubmitButton variant="secondary" size="sm">Save</SubmitButton>
            </form>
          </Card>

          <Card className="p-5">
            <Label>Convert to client</Label>
            <form action={convertProspect.bind(null, p.id)} className="mt-3 flex gap-2">
              <select name="plan" className={inputCls} defaultValue="pilot">
                <option value="pilot">Free pilot</option>
                <option value="fixpack">Fix Pack ($350)</option>
                <option value="visibility">Visibility ($400/mo)</option>
                <option value="growth">Growth ($750/mo)</option>
              </select>
              <SubmitButton size="md">Convert</SubmitButton>
            </form>
            <p className="mt-2 text-xs text-muted">Copies the audit's fixes and top rivals into a client workspace.</p>
          </Card>

          <form action={deleteProspect.bind(null, p.id)}>
            <button className="text-xs text-muted hover:text-bad">Delete prospect</button>
          </form>
        </div>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <Label>Outreach draft</Label>
            {draft && (
              <div className="flex gap-2">
                <CopyButton text={`Subject: ${draft.subject}\n\n${draft.body}`} label="Copy all" />
                <a href={mailtoLink(p.email, draft)} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-accent px-3 text-[13px] font-medium text-white hover:bg-accent-ink">
                  <Mail size={14} /> Open in email
                </a>
              </div>
            )}
          </div>
          {draft ? (
            <div className="mt-4 space-y-3">
              <input readOnly value={draft.subject} className={`${inputCls} font-medium`} aria-label="Subject" />
              <textarea readOnly value={draft.body} rows={22} className={`${inputCls} h-auto py-3 font-mono text-[12.5px] leading-relaxed`} aria-label="Body" />
              <p className="text-xs text-muted">
                Edit before sending. Australian Spam Act: cold emails to businesses are allowed when relevant to their role and published address, must identify you, and must include a working opt-out. Mark as “contacted” after you send.
              </p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted">Run an audit first. The draft is written from the audit's real findings.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
