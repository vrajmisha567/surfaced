"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { endSession, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { categoryFromForm, getCategory, promptsFor } from "@/lib/categories";
import { isKnownCountry, placeOf, shortPlace } from "@/lib/locale";
import { runAudit } from "@/lib/audit/run";
import { searchPlaces } from "@/lib/places";
import { fixesFromAudit } from "@/lib/fixpack";
import { trackClient, weeklyStats, latestWeekRuns } from "@/lib/tracker";
import { sendMonthlyReport } from "@/lib/email";
import { plans, site } from "@/lib/site";
import { prospectStatuses, type Client, type ProspectStatus } from "@/lib/types";

export type ActionResult = { ok: boolean; message: string };

/** Suburb/area, city and country from a form. Defaults to Adelaide, Australia. */
function locationFromForm(form: FormData) {
  const country = String(form.get("country") ?? "AU").trim().toUpperCase();
  return placeOf({
    suburb: String(form.get("suburb") ?? "").trim(),
    city: String(form.get("city") ?? "").trim() || (country === "AU" ? "Adelaide" : ""),
    country: isKnownCountry(country) ? country : "AU",
  });
}

/** suburb/city/country for a row, with legacy rows treated as Adelaide, Australia. */
function placeFields(x: { suburb?: string | null; city?: string | null; country?: string | null }) {
  const p = placeOf(x);
  return { suburb: p.area, city: p.city, country: p.country };
}

export async function logout() {
  await endSession();
  redirect("/login");
}

/* ---------------- Prospects ---------------- */

export async function findProspects(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const category = categoryFromForm(String(form.get("category") ?? "plumber"), String(form.get("customType") ?? ""));
  if (!category) return { ok: false, message: "Pick a business type, or type one under Other." };
  const place = locationFromForm(form);
  const suburb = shortPlace(place);
  const cat = getCategory(category);
  try {
    const isAdelaide = place.country === "AU" && place.city.toLowerCase() === "adelaide";
    const places = await searchPlaces(`${cat.plural} in ${suburb}${isAdelaide ? " SA" : ""}`, { country: place.country, adelaide: isAdelaide });
    const existing = new Set((await db.prospects.list()).map((p) => p.place_id).filter(Boolean));
    let added = 0;
    for (const p of places) {
      if (existing.has(p.place_id)) continue;
      await db.prospects.create({
        name: p.name,
        website: p.website,
        phone: p.phone,
        email: null,
        address: p.address,
        suburb: p.suburb ?? place.area,
        city: place.city,
        country: place.country,
        category,
        place_id: p.place_id,
        rating: p.rating,
        review_count: p.review_count,
        status: "new",
        audit_id: null,
        score: null,
        notes: p.website ? null : "No website listed on Google",
        last_contacted_at: null,
      });
      added++;
    }
    revalidatePath("/app/prospects");
    return { ok: true, message: `Found ${places.length}, added ${added} new ${cat.plural.toLowerCase()} in ${suburb}.` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Search failed" };
  }
}

const manualSchema = z.object({
  name: z.string().trim().min(2),
  website: z.string().trim().optional(),
  email: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  suburb: z.string().trim().optional(),
  city: z.string().trim().optional(),
  country: z.string().trim().optional(),
  category: z.string(),
  customType: z.string().trim().optional(),
});

export async function addProspect(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const p = manualSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { ok: false, message: "Name is required" };
  const category = categoryFromForm(p.data.category, p.data.customType);
  if (!category) return { ok: false, message: "Pick a business type, or type one under Other." };
  const place = locationFromForm(form);
  await db.prospects.create({
    name: p.data.name,
    website: p.data.website || null,
    email: p.data.email || null,
    phone: p.data.phone || null,
    address: null,
    suburb: p.data.suburb || null,
    city: place.city,
    country: place.country,
    category,
    place_id: null,
    rating: null,
    review_count: null,
    status: "new",
    audit_id: null,
    score: null,
    notes: null,
    last_contacted_at: null,
  });
  revalidatePath("/app/prospects");
  return { ok: true, message: `Added ${p.data.name}.` };
}

export async function auditProspect(id: string): Promise<ActionResult> {
  await requireAdmin();
  const p = await db.prospects.get(id);
  if (!p) return { ok: false, message: "Prospect not found" };
  if (!p.website) return { ok: false, message: "No website to audit" };
  try {
    const result = await runAudit({ url: p.website, businessName: p.name, ...placeFields(p), category: p.category });
    const rec = await db.audits.create({
      url: result.input.url,
      business_name: p.name,
      suburb: result.input.suburb,
      city: result.input.city ?? "",
      country: result.input.country ?? "AU",
      category: p.category,
      email: null,
      overall_score: result.overall,
      result,
      prospect_id: p.id,
      client_id: null,
    });
    await db.prospects.update(p.id, { audit_id: rec.id, score: result.overall, status: p.status === "new" ? "audited" : p.status });
    revalidatePath("/app/prospects");
    revalidatePath(`/app/prospects/${id}`);
    return { ok: true, message: `${p.name}: ${result.overall}/100` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Audit failed" };
  }
}

/** Audit up to N un-audited prospects that have websites. */
export async function auditBatch(): Promise<ActionResult> {
  await requireAdmin();
  const todo = (await db.prospects.list()).filter((p) => !p.audit_id && p.website).slice(0, 8);
  if (!todo.length) return { ok: true, message: "Nothing left to audit." };
  const results = await Promise.all(todo.map((p) => auditProspect(p.id)));
  const ok = results.filter((r) => r.ok).length;
  return { ok: true, message: `Audited ${ok} of ${todo.length}.` };
}

export async function setProspectStatus(id: string, status: ProspectStatus) {
  await requireAdmin();
  if (!prospectStatuses.includes(status)) return;
  await db.prospects.update(id, { status, ...(status === "contacted" ? { last_contacted_at: new Date().toISOString() } : {}) });
  revalidatePath("/app/prospects");
  revalidatePath(`/app/prospects/${id}`);
}

export async function saveProspectNotes(id: string, form: FormData) {
  await requireAdmin();
  await db.prospects.update(id, { notes: String(form.get("notes") ?? ""), email: String(form.get("email") ?? "") || null });
  revalidatePath(`/app/prospects/${id}`);
}

export async function deleteProspect(id: string) {
  await requireAdmin();
  await db.prospects.remove(id);
  revalidatePath("/app/prospects");
  redirect("/app/prospects");
}

/* ---------------- Clients ---------------- */

export async function loadDemoClient() {
  await requireAdmin();
  const { seedDemoClient } = await import("@/lib/demo");
  const c = await seedDemoClient();
  redirect(`/app/clients/${c.id}`);
}

function planValue(plan: Client["plan"]) {
  const p = plans.find((x) => x.id === plan);
  return p && p.interval === "month" ? p.price : 0;
}

export async function convertProspect(id: string, form: FormData) {
  await requireAdmin();
  const p = await db.prospects.get(id);
  if (!p || !p.website) return;
  const plan = (String(form.get("plan") ?? "pilot") as Client["plan"]);
  const audit = p.audit_id ? await db.audits.get(p.audit_id) : null;
  const client = await db.clients.create({
    name: p.name,
    website: p.website,
    ...placeFields(p),
    category: p.category,
    contact_name: null,
    contact_email: p.email,
    plan,
    status: "active",
    monthly_value: planValue(plan),
    competitors: (audit?.result.ai.topRivals ?? []).slice(0, 3).map((r) => r.name),
    prompts: promptsFor(p.category, placeOf(p), 5),
    fixes: audit ? fixesFromAudit(audit.result) : [],
    stripe_customer_id: null,
    baseline_audit_id: audit?.id ?? null,
  });
  await db.prospects.update(p.id, { status: plan === "pilot" ? "pilot" : "won" });
  revalidatePath("/app/clients");
  redirect(`/app/clients/${client.id}`);
}

const clientSchema = z.object({
  name: z.string().trim().min(2),
  website: z.string().trim().min(4),
  suburb: z.string().trim().optional().default(""),
  city: z.string().trim().min(2),
  country: z.string().trim().toUpperCase().refine(isKnownCountry),
  category: z.string(),
  customType: z.string().trim().optional(),
  contact_email: z.string().trim().optional(),
  plan: z.enum(["fixpack", "visibility", "growth", "pilot"]),
});

export async function createClient(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const p = clientSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { ok: false, message: "Fill in name, website, city, country and plan" };
  const category = categoryFromForm(p.data.category, p.data.customType);
  if (!category) return { ok: false, message: "Pick a business type, or type one under Other." };
  const { customType: _unused, ...data } = p.data;
  void _unused;
  const c = await db.clients.create({
    ...data,
    category,
    contact_name: null,
    contact_email: p.data.contact_email || null,
    status: "active",
    monthly_value: planValue(p.data.plan),
    competitors: [],
    prompts: promptsFor(category, placeOf(data), 5),
    fixes: [],
    stripe_customer_id: null,
    baseline_audit_id: null,
  });
  redirect(`/app/clients/${c.id}`);
}

export async function updateClientSetup(id: string, form: FormData) {
  await requireAdmin();
  const lines = (k: string) =>
    String(form.get(k) ?? "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  const plan = String(form.get("plan") ?? "") as Client["plan"];
  await db.clients.update(id, {
    competitors: lines("competitors").slice(0, 5),
    prompts: lines("prompts").slice(0, 30),
    contact_email: String(form.get("contact_email") ?? "") || null,
    ...(plan ? { plan, monthly_value: planValue(plan) } : {}),
    status: (String(form.get("status") ?? "active") as Client["status"]),
  });
  revalidatePath(`/app/clients/${id}`);
}

export async function toggleFix(clientId: string, fixId: string) {
  await requireAdmin();
  const c = await db.clients.get(clientId);
  if (!c) return;
  const fixes = c.fixes.map((f) => (f.id === fixId ? { ...f, done: !f.done, done_at: !f.done ? new Date().toISOString() : null } : f));
  await db.clients.update(clientId, { fixes });
  revalidatePath(`/app/clients/${clientId}`);
}

export async function auditClient(id: string): Promise<ActionResult> {
  await requireAdmin();
  const c = await db.clients.get(id);
  if (!c) return { ok: false, message: "Client not found" };
  try {
    const result = await runAudit({ url: c.website, businessName: c.name, ...placeFields(c), category: c.category, competitors: c.competitors });
    const rec = await db.audits.create({
      url: result.input.url,
      business_name: c.name,
      suburb: result.input.suburb,
      city: result.input.city ?? "",
      country: result.input.country ?? "AU",
      category: c.category,
      email: null,
      overall_score: result.overall,
      result,
      prospect_id: null,
      client_id: c.id,
    });
    const patch: Partial<Client> = {};
    if (!c.baseline_audit_id) patch.baseline_audit_id = rec.id;
    if (!c.fixes.length) patch.fixes = fixesFromAudit(result);
    if (Object.keys(patch).length) await db.clients.update(c.id, patch);
    revalidatePath(`/app/clients/${id}`);
    return { ok: true, message: `Audit complete: ${result.overall}/100` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Audit failed" };
  }
}

export async function trackNow(id: string): Promise<ActionResult> {
  await requireAdmin();
  const c = await db.clients.get(id);
  if (!c) return { ok: false, message: "Client not found" };
  try {
    const r = await trackClient(c);
    revalidatePath(`/app/clients/${id}`);
    return { ok: true, message: `${r.week}: named in ${r.mentioned} of ${r.count} answers` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Tracking failed" };
  }
}

export async function emailMonthlyReport(id: string): Promise<ActionResult> {
  await requireAdmin();
  const c = await db.clients.get(id);
  if (!c?.contact_email) return { ok: false, message: "Add a contact email first" };
  const runs = await db.runs.forClient(c.id);
  const stats = weeklyStats(runs, c.competitors);
  const last = stats.at(-1);
  const first = stats[0];
  const latest = latestWeekRuns(runs);
  const done = c.fixes.filter((f) => f.done);
  const month = new Date().toLocaleDateString("en-AU", { month: "long", year: "numeric" });
  const summary = [
    last ? `Named in ${last.mentioned} of ${last.total} AI answers this week (${Math.round(last.rate * 100)}%).` : "Tracking starts this month.",
    first && last && stats.length > 1 ? `Change since we started: ${Math.round(first.rate * 100)}% → ${Math.round(last.rate * 100)}%.` : "",
    `Fixes completed: ${done.length} of ${c.fixes.length}.`,
    latest.find((r) => r.mentioned) ? `Example: ${latest.find((r) => r.mentioned)!.engine} named you for “${latest.find((r) => r.mentioned)!.prompt}”.` : "",
  ].filter(Boolean);
  const res = await sendMonthlyReport(c.contact_email, c.name, `${site.url}/c/${c.share_token}`, summary, month);
  return res.ok ? { ok: true, message: `Sent to ${c.contact_email}` } : { ok: false, message: res.error };
}
