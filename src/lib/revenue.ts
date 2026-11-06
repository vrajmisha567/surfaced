import "server-only";
import type Stripe from "stripe";
import { env } from "@/lib/env";
import { plans } from "@/lib/site";
import { stripe } from "@/lib/stripe";

/*
  Revenue for the public /open page, read straight from Stripe (like TrustMRR's
  "verified with Stripe" pages). Amounts are in the account's currency (AUD), in dollars.
*/

const DAY = 86_400_000;

export type RevenueStats = Awaited<ReturnType<typeof buildRevenue>>;

/** Monthly value of one subscription, from its prices (yearly prices count as 1/12). */
function monthly(sub: Stripe.Subscription) {
  return sub.items.data.reduce((sum, it) => {
    const p = it.price;
    const amount = (p.unit_amount ?? 0) * (it.quantity ?? 1);
    const every = p.recurring?.interval_count ?? 1;
    const perMonth =
      p.recurring?.interval === "year" ? amount / 12 / every : p.recurring?.interval === "week" ? (amount * 52) / 12 / every : p.recurring?.interval === "day" ? (amount * 365) / 12 / every : amount / every;
    return sum + perMonth;
  }, 0);
}

function planName(meta: Stripe.Metadata | null | undefined) {
  return plans.find((p) => p.id === meta?.plan)?.name ?? null;
}

async function buildRevenue(s: Stripe) {
  // Payments: every successful charge, net of refunds. Capped so a big account can't stall the page.
  const charges: Stripe.Charge[] = [];
  for await (const ch of s.charges.list({ limit: 100 })) {
    if (ch.status === "succeeded" && ch.paid) charges.push(ch);
    if (charges.length >= 5000) break;
  }
  const net = (c: Stripe.Charge) => (c.amount - (c.amount_refunded ?? 0)) / 100;
  const now = Date.now();
  const allTime = charges.reduce((a, c) => a + net(c), 0);
  const inRange = (from: number, to: number) => charges.filter((c) => c.created * 1000 >= from && c.created * 1000 < to).reduce((a, c) => a + net(c), 0);
  const last30 = inRange(now - 30 * DAY, now + DAY);
  const prev30 = inRange(now - 60 * DAY, now - 30 * DAY);

  const subs: Stripe.Subscription[] = [];
  for await (const sub of s.subscriptions.list({ status: "active", limit: 100 })) {
    subs.push(sub);
    if (subs.length >= 2000) break;
  }
  const mrr = subs.reduce((a, sub) => a + monthly(sub), 0) / 100;
  const byPlan = new Map<string, number>();
  for (const sub of subs) {
    const name = planName(sub.metadata) ?? sub.items.data[0]?.price.nickname ?? "Other";
    byPlan.set(name, (byPlan.get(name) ?? 0) + 1);
  }
  const oneOff = charges.filter((c) => !(c as Stripe.Charge & { invoice?: unknown }).invoice).length;

  const customers = new Set(charges.map((c) => (typeof c.customer === "string" ? c.customer : c.customer?.id) ?? c.billing_details?.email ?? c.id)).size;

  // Daily revenue for the last 365 days, oldest first.
  const days = 365;
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const t0 = start.getTime() - (days - 1) * DAY;
  const daily = Array.from({ length: days }, (_, i) => ({ day: new Date(t0 + i * DAY).toISOString().slice(0, 10), amount: 0 }));
  for (const c of charges) {
    const i = Math.floor((c.created * 1000 - t0) / DAY);
    if (i >= 0 && i < days) daily[i].amount += net(c);
  }

  return {
    currency: (charges[0]?.currency ?? "aud").toUpperCase(),
    allTime,
    last30,
    prev30,
    growth: prev30 > 0 ? (last30 - prev30) / prev30 : null,
    mrr,
    activeSubs: subs.length,
    byPlan: [...byPlan.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    oneOffPayments: oneOff,
    customers,
    payments: charges.length,
    firstPayment: charges.length ? new Date(Math.min(...charges.map((c) => c.created * 1000))).toISOString() : null,
    daily,
    testMode: env.stripeSecret?.startsWith("sk_test_") ?? false,
    updatedAt: new Date().toISOString(),
  };
}

export async function getRevenue() {
  const s = stripe();
  if (!s) return null;
  try {
    return await buildRevenue(s);
  } catch (e) {
    console.error("revenue:", e);
    return null;
  }
}
