import "server-only";
import type { AuditRecord, Prospect } from "@/lib/types";
import { getCategory } from "@/lib/categories";
import { nearPlace, placeOf } from "@/lib/locale";
import { engineLabels } from "@/lib/ai/engines";
import { site } from "@/lib/site";

export type Draft = { subject: string; body: string };

/**
 * Cold outreach draft built from a real audit. Specific, short, no promises of leads.
 * Includes sender identity and an opt-out line (Spam Act 2003 requirements).
 */
export function outreachDraft(p: Prospect, audit: AuditRecord, senderName = "[Your name]"): Draft {
  const r = audit.result;
  const cat = getCategory(p.category);
  const suburb = nearPlace(placeOf({ suburb: p.suburb || r.input.suburb, city: p.city || r.input.city, country: p.country || r.input.country }));
  const reportUrl = `${site.url}/report/${audit.id}`;
  const weakest = [...r.pillars].filter((x) => x.score !== null).sort((a, b) => (a.score ?? 0) - (b.score ?? 0))[0];
  const topFail = r.pillars.flatMap((x) => x.checks).find((c) => c.status === "fail" && c.weight >= 2);

  let hook: string;
  if (r.ai.measured && r.ai.mentionRate !== null) {
    const ok = r.ai.answers.filter((a) => !a.error);
    const hits = ok.filter((a) => a.mentioned).length;
    const rival = r.ai.topRivals[0]?.name;
    const example = ok.find((a) => !a.mentioned);
    hook =
      hits === 0
        ? `I asked ${[...new Set(ok.map((a) => engineLabels[a.engine]))].join(", ")} "${example?.prompt ?? `best ${cat.label.toLowerCase()} in ${suburb}`}" and similar questions. ${p.name} didn't come up in any of the ${ok.length} answers.${rival ? ` ${rival} did.` : ""}`
        : `I asked AI assistants ${ok.length} questions a local might ask about ${cat.plural.toLowerCase()} in ${suburb}. ${p.name} was named in ${hits} of them.${rival ? ` ${rival} came up more often.` : ""}`;
  } else {
    hook = `More people in ${suburb} now ask ChatGPT or Google's AI "who's a good ${cat.label.toLowerCase()} near me" instead of scrolling search results. I ran your site through the checks those tools rely on.`;
  }

  const subject = r.ai.measured && (r.ai.mentionRate ?? 0) === 0 ? `${p.name} isn't showing up in ChatGPT` : `${p.name}: your AI search score (${r.overall}/100)`;

  const body = [
    `Hi ${p.name} team,`,
    "",
    hook,
    "",
    `Your site scored ${r.overall}/100. The weakest area is ${weakest?.label.toLowerCase() ?? "structured data"}${topFail ? `: ${topFail.detail.replace(/\.$/, "")}` : ""}.`,
    "",
    `The full report is free and has the fixes listed in plain English:\n${reportUrl}`,
    "",
    `Most of it is a few hours of work. If you'd rather not deal with it, I fix it for a flat fee and then track whether the AI tools start naming you. Happy to do the first month free for a couple of ${suburb} businesses in exchange for honest feedback.`,
    "",
    `Worth a 10-minute call this week?`,
    "",
    `${senderName}`,
    `${site.name} · ${site.city}, SA${site.abn ? ` · ABN ${site.abn}` : ""}`,
    site.contactEmail,
    "",
    `If you'd rather not hear from me again, reply "no thanks" and I won't contact you again.`,
  ].join("\n");

  return { subject, body };
}

export function mailtoLink(to: string | null, d: Draft) {
  return `mailto:${encodeURIComponent(to ?? "")}?subject=${encodeURIComponent(d.subject)}&body=${encodeURIComponent(d.body)}`;
}
