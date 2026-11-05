import { NextResponse, type NextRequest } from "next/server";
import { createCheckout } from "@/lib/stripe";
import { plans, site, type PlanId } from "@/lib/site";

export async function GET(req: NextRequest) {
  const planId = req.nextUrl.searchParams.get("plan") as PlanId | null;
  const auditId = req.nextUrl.searchParams.get("audit") ?? undefined;
  const plan = plans.find((p) => p.id === planId);
  if (!plan) return NextResponse.redirect(new URL("/#pricing", req.url));

  try {
    const url = await createCheckout(plan.id, { auditId: auditId && /^[0-9a-f-]{36}$/.test(auditId) ? auditId : undefined });
    if (url) return NextResponse.redirect(url, 303);
  } catch (e) {
    console.error("checkout failed", e);
  }
  // Stripe not configured yet: fall back to an email enquiry so no lead is lost.
  const subject = encodeURIComponent(`${site.name} ${plan.name} enquiry`);
  return NextResponse.redirect(`mailto:${site.contactEmail}?subject=${subject}`, 303);
}
