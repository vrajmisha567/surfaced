"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { runAudit } from "@/lib/audit/run";
import { db } from "@/lib/db";
import { currentAccount } from "@/lib/supabase/server";
import { categoryFromForm } from "@/lib/categories";
import { isKnownCountry } from "@/lib/locale";
import { sendAuditReport } from "@/lib/email";

const schema = z
  .object({
    url: z.string().trim().min(4, "Enter your website").max(300),
    businessName: z.string().trim().min(2, "Enter your business name").max(120),
    suburb: z.string().trim().max(60).optional().default(""),
    city: z.string().trim().min(2, "Enter your city or town").max(60),
    country: z.string().trim().toUpperCase().refine(isKnownCountry, "Pick a country"),
    category: z.string().trim(),
    customType: z.string().trim().max(50).optional().default(""),
    specialty: z.string().trim().max(60).optional().default(""),
    specialtyOther: z.string().trim().max(60).optional().default(""),
    email: z.union([z.literal(""), z.email("That email doesn't look right")]).optional(),
  })
  .transform((d, ctx) => {
    // "Other" means the visitor typed their own business type.
    const category = categoryFromForm(d.category, d.customType, d.specialty, d.specialtyOther);
    if (!category) {
      const message =
        d.category === "custom"
          ? "Type your kind of business, e.g. wedding photographer"
          : d.specialty === "other"
            ? "Type the speciality in plain words, e.g. Burmese"
            : "Pick a business type";
      ctx.addIssue({ code: "custom", message });
      return z.NEVER;
    }
    return { url: d.url, businessName: d.businessName, suburb: d.suburb, city: d.city, country: d.country, category, email: d.email };
  });

export type AuditFormState = { error?: string; fields?: Record<string, string> };

// Best-effort rate limit per IP (per server instance). Each audit can call 4 paid AI APIs.
const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60 * 60 * 1000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 5;
}

export async function runAuditAction(_prev: AuditFormState, form: FormData): Promise<AuditFormState> {
  const fields = Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)]));
  const parsed = schema.safeParse(fields);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form", fields };

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (limited(ip)) return { error: "You've run a few audits already. Try again in an hour.", fields };

  let id: string;
  try {
    const result = await runAudit(parsed.data);
    const rec = await db.audits.create({
      url: result.input.url,
      business_name: result.input.businessName,
      suburb: result.input.suburb,
      city: result.input.city ?? "",
      country: result.input.country ?? "AU",
      category: result.input.category,
      email: parsed.data.email || null,
      overall_score: result.overall,
      result,
      prospect_id: null,
      client_id: null,
      user_id: (await currentAccount())?.id ?? null,
    });
    id = rec.id;
    if (parsed.data.email) {
      await sendAuditReport(parsed.data.email, rec.id, result.input.businessName, result.overall).catch((e) => console.error("report email failed", e));
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Something went wrong";
    return { error: msg.includes("public website") || msg.includes("Invalid URL") ? "That doesn't look like a public website address." : `The audit failed: ${msg}`, fields };
  }
  redirect(`/report/${id}`);
}
