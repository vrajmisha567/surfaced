import "server-only";
import { Resend } from "resend";
import { env } from "@/lib/env";
import { site } from "@/lib/site";

let client: Resend | null = null;
function resend() {
  if (!env.resend) return null;
  client ??= new Resend(env.resend);
  return client;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function layout(title: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:#f5f3ee;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#101828">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fffefb;border:1px solid #e2ddd2;border-radius:12px">
<tr><td style="padding:28px 32px 8px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#667085;font-family:ui-monospace,Menlo,monospace">${esc(site.name)}</td></tr>
<tr><td style="padding:0 32px 8px;font-size:22px;font-weight:600;line-height:1.3">${esc(title)}</td></tr>
<tr><td style="padding:8px 32px 28px;font-size:15px;line-height:1.6;color:#344054">${body}</td></tr>
</table>
<p style="font-size:12px;color:#98a2b3;margin-top:16px">${esc(site.name)} · ${esc(site.city)}, South Australia${site.abn ? ` · ABN ${esc(site.abn)}` : ""}</p>
</td></tr></table></body></html>`;
}

function button(href: string, label: string) {
  return `<a href="${esc(href)}" style="display:inline-block;background:#0f6b4f;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:600">${esc(label)}</a>`;
}

type SendResult = { ok: true; id: string } | { ok: false; error: string };

async function send(to: string, subject: string, html: string, idempotencyKey: string): Promise<SendResult> {
  const r = resend();
  if (!r) return { ok: false, error: "Email isn't configured yet (RESEND_API_KEY missing)." };
  const { data, error } = await r.emails.send({ from: env.resendFrom, to, subject, html }, { idempotencyKey });
  if (error) return { ok: false, error: error.message };
  return { ok: true, id: data?.id ?? "" };
}

export function sendAuditReport(to: string, auditId: string, businessName: string, score: number) {
  const url = `${site.url}/report/${auditId}`;
  return send(
    to,
    `${businessName}: your AI visibility report (${score}/100)`,
    layout(
      `${businessName} scored ${score}/100`,
      `<p>Here's your full report: where AI assistants can and can't find you, and the fixes in priority order.</p><p style="margin:24px 0">${button(url, "Open your report")}</p><p>Questions? Just reply to this email.</p>`,
    ),
    `audit-report/${auditId}/${to}`,
  );
}

export function sendMonthlyReport(to: string, clientName: string, portalUrl: string, summary: string[], month: string) {
  return send(
    to,
    `${clientName}: your ${month} AI visibility report`,
    layout(
      `${month} report for ${clientName}`,
      `<ul style="padding-left:18px">${summary.map((s) => `<li style="margin-bottom:6px">${esc(s)}</li>`).join("")}</ul><p style="margin:24px 0">${button(portalUrl, "Open your dashboard")}</p>`,
    ),
    `monthly-report/${clientName}/${month}`,
  );
}
