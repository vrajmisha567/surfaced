import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { env } from "@/lib/env";
import { db } from "@/lib/db";
import { plans } from "@/lib/site";
import { fixesFromAudit } from "@/lib/fixpack";
import { promptsFor } from "@/lib/categories";
import { placeOf } from "@/lib/locale";
import type { Client } from "@/lib/types";

/**
 * Stripe webhook. Creates or activates a client when checkout completes,
 * and pauses them when a subscription is cancelled.
 * Configure in Stripe: checkout.session.completed, customer.subscription.deleted
 */
export async function POST(req: NextRequest) {
  const s = stripe();
  if (!s || !env.stripeWebhookSecret) return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = s.webhooks.constructEvent(body, req.headers.get("stripe-signature") ?? "", env.stripeWebhookSecret);
  } catch {
    return NextResponse.json({ error: "Bad signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const planId = (session.metadata?.plan ?? "visibility") as Client["plan"];
    const auditId = session.metadata?.auditId || null;
    const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;
    const email = session.customer_details?.email ?? null;
    const plan = plans.find((p) => p.id === planId);

    const existing = (await db.clients.list()).find((c) => (customerId && c.stripe_customer_id === customerId) || (auditId && c.baseline_audit_id === auditId));
    if (existing) {
      await db.clients.update(existing.id, { status: "active", plan: planId, monthly_value: plan?.interval === "month" ? plan.price : existing.monthly_value, stripe_customer_id: customerId });
    } else {
      const audit = auditId ? await db.audits.get(auditId) : null;
      await db.clients.create({
        name: audit?.business_name ?? session.customer_details?.name ?? email ?? "New client",
        website: audit?.url ?? "",
        suburb: audit?.suburb ?? "",
        city: audit ? placeOf(audit).city : "Adelaide",
        country: audit?.country ?? "AU",
        category: audit?.category ?? "plumber",
        contact_name: session.customer_details?.name ?? null,
        contact_email: email,
        plan: planId,
        status: "active",
        monthly_value: plan?.interval === "month" ? plan.price : 0,
        competitors: (audit?.result.ai.topRivals ?? []).slice(0, 3).map((r) => r.name),
        prompts: audit ? promptsFor(audit.category, placeOf(audit), 5) : [],
        fixes: audit ? fixesFromAudit(audit.result) : [],
        stripe_customer_id: customerId,
        baseline_audit_id: auditId,
      });
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object;
    const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
    const c = (await db.clients.list()).find((x) => x.stripe_customer_id === customerId);
    if (c) await db.clients.update(c.id, { status: "paused", monthly_value: 0 });
  }

  return NextResponse.json({ received: true });
}
