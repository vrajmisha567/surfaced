import "server-only";
import Stripe from "stripe";
import { env } from "@/lib/env";
import { plans, site, type PlanId } from "@/lib/site";

let client: Stripe | null = null;
export function stripe() {
  if (!env.stripeSecret) return null;
  client ??= new Stripe(env.stripeSecret);
  return client;
}

/** Optional pre-created Stripe prices; otherwise prices are created inline from lib/site plans. */
const priceEnv: Record<PlanId, string | undefined> = {
  fixpack: process.env.STRIPE_PRICE_FIXPACK,
  tracking: process.env.STRIPE_PRICE_TRACKING,
  visibility: process.env.STRIPE_PRICE_VISIBILITY,
  growth: process.env.STRIPE_PRICE_GROWTH,
};

export async function createCheckout(planId: PlanId, meta: { email?: string; auditId?: string }) {
  const s = stripe();
  if (!s) return null;
  const plan = plans.find((p) => p.id === planId);
  if (!plan) throw new Error("Unknown plan");
  const recurring = plan.interval === "month";
  const price = priceEnv[planId];

  const session = await s.checkout.sessions.create({
    mode: recurring ? "subscription" : "payment",
    line_items: [
      price
        ? { price, quantity: 1 }
        : {
            quantity: 1,
            price_data: {
              currency: "aud",
              unit_amount: plan.price * 100,
              product_data: { name: `${site.name} ${plan.name}`, description: plan.blurb },
              ...(recurring ? { recurring: { interval: "month" as const } } : {}),
            },
          },
    ],
    customer_email: meta.email,
    metadata: { plan: planId, auditId: meta.auditId ?? "" },
    ...(recurring ? { subscription_data: { metadata: { plan: planId, auditId: meta.auditId ?? "" } } } : {}),
    allow_promotion_codes: true,
    billing_address_collection: "auto",
    success_url: `${site.url}/thanks?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${site.url}/#pricing`,
  });
  return session.url;
}
