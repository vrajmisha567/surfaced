import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ShieldCheck, TriangleAlert } from "lucide-react";
import { NumberTicker, Reveal } from "@/components/fx";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { DailyBars } from "@/components/stats-charts";
import { Card, Label, LinkButton } from "@/components/ui";
import { getRevenue } from "@/lib/revenue";
import { getAuditStats } from "@/lib/stats";
import { plans } from "@/lib/site";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Open revenue",
  description: "Surfaced's revenue, subscriptions and usage, read straight from Stripe and updated hourly.",
};

function Serif({ children }: { children: React.ReactNode }) {
  return <span className="serif text-[1.08em]">{children}</span>;
}

function money(v: number, currency = "AUD", cents = false) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: cents ? 2 : 0, minimumFractionDigits: cents ? 2 : 0 }).format(v);
}

function Tile({ label, value, sub, dark }: { label: string; value: React.ReactNode; sub: React.ReactNode; dark?: boolean }) {
  return (
    <Card className={`p-6 ${dark ? "border-ink bg-night text-white" : ""}`}>
      <div className={`label ${dark ? "!text-faint" : ""}`}>{label}</div>
      <div className="tabular mt-4 text-[36px] font-semibold leading-none tracking-tight">{value}</div>
      <div className={`mt-2 text-xs ${dark ? "text-[#a9b4c6]" : "text-muted"}`}>{sub}</div>
    </Card>
  );
}

export default async function OpenPage() {
  const [rev, stats] = await Promise.all([getRevenue(), getAuditStats()]);
  const cur = rev?.currency ?? "AUD";
  const updated = rev ? new Date(rev.updatedAt).toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }) + " UTC" : null;
  const growth = rev?.growth;

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-line">
          <div aria-hidden className="grid-paper absolute inset-0 [mask-image:radial-gradient(ellipse_80%_80%_at_50%_0%,#000_30%,transparent_100%)]" />
          <div aria-hidden className="fx-glow absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(19,133,95,.16),transparent_62%)] blur-2xl" />
          <div className="relative mx-auto max-w-6xl px-5 py-16 sm:py-20">
            <Reveal>
              <div className="label">
                <Link href="/" className="hover:text-ink">Surfaced</Link> › Open revenue
              </div>
              <h1 className="mt-4 max-w-3xl text-[40px] font-semibold leading-[1.05] tracking-[-0.03em] sm:text-[54px]">
                Surfaced, <Serif>in the open.</Serif>
              </h1>
              <p className="mt-4 max-w-2xl text-[17px] leading-relaxed text-ink-2">
                Every dollar Surfaced earns, read straight from Stripe and refreshed every hour. No screenshots, no rounding up.
              </p>
              <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-line bg-card/80 px-3 py-1 text-xs text-ink-2">
                <ShieldCheck size={14} className="text-accent" /> Revenue verified with the Stripe API{updated ? ` · last updated ${updated}` : ""}
              </div>
            </Reveal>
          </div>
        </section>

        {rev?.testMode && (
          <div className="border-b border-warn/20 bg-warn-soft">
            <div className="mx-auto flex max-w-6xl items-center gap-2 px-5 py-3 text-sm text-warn">
              <TriangleAlert size={15} className="shrink-0" />
              Stripe is in test mode, so the figures below are test payments, not real revenue.
            </div>
          </div>
        )}

        {!rev ? (
          <section className="mx-auto max-w-6xl px-5 py-20">
            <Card className="p-10 text-center">
              <div className="font-medium">Revenue figures are unavailable right now.</div>
              <p className="mt-2 text-sm text-muted">Stripe couldn&apos;t be reached. Try again in a little while.</p>
            </Card>
          </section>
        ) : (
          <>
            <section className="mx-auto max-w-6xl px-5 pt-12">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Tile dark label="All-time revenue" value={money(rev.allTime, cur)} sub={`${rev.payments} ${rev.payments === 1 ? "payment" : "payments"}, net of refunds`} />
                <Tile label="MRR" value={money(rev.mrr, cur)} sub={`${rev.activeSubs} active ${rev.activeSubs === 1 ? "subscription" : "subscriptions"}`} />
                <Tile
                  label="Last 30 days"
                  value={money(rev.last30, cur)}
                  sub={
                    growth == null ? (
                      "No earlier month to compare"
                    ) : (
                      <span className={growth >= 0 ? "text-good" : "text-bad"}>
                        {growth >= 0 ? "▲" : "▼"} {Math.abs(Math.round(growth * 100))}% vs previous 30 days
                      </span>
                    )
                  }
                />
                <Tile label="Paying customers" value={<NumberTicker value={rev.customers} />} sub={rev.firstPayment ? `Since ${new Date(rev.firstPayment).toLocaleDateString("en-AU", { month: "long", year: "numeric" })}` : "First one coming soon"} />
              </div>
            </section>

            <section className="mx-auto max-w-6xl px-5 pt-4">
              <Reveal>
                <Card className="p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="font-semibold tracking-tight">Revenue</div>
                    <span className="label">{cur} · daily, net of refunds</span>
                  </div>
                  <DailyBars
                    data={rev.daily.map((d) => ({ day: d.day, value: Math.round(d.amount) }))}
                    currency={cur}
                    ranges={[30, 90, 365]}
                    height={240}
                    empty="No payments in this period yet"
                  />
                </Card>
              </Reveal>
            </section>

            <section className="mx-auto grid max-w-6xl gap-4 px-5 pt-4 [&>*]:min-w-0 lg:grid-cols-3">
              <Reveal>
                <Card className="h-full p-6">
                  <div className="font-semibold tracking-tight">Subscriptions by plan</div>
                  <ul className="mt-5 divide-y divide-line text-sm">
                    {plans
                      .filter((p) => p.interval === "month")
                      .map((p) => (
                        <li key={p.id} className="flex items-center justify-between py-2.5">
                          <span>
                            {p.name} <span className="text-muted">· {money(p.price, cur)}/mo</span>
                          </span>
                          <span className="tabular font-medium">{rev.byPlan.find((b) => b.name === p.name)?.count ?? 0}</span>
                        </li>
                      ))}
                    <li className="flex items-center justify-between py-2.5">
                      <span>
                        One-off payments <span className="text-muted">· Fix Pack and similar</span>
                      </span>
                      <span className="tabular font-medium">{rev.oneOffPayments}</span>
                    </li>
                  </ul>
                </Card>
              </Reveal>
              <Reveal delay={0.08}>
                <Card className="h-full p-6">
                  <div className="font-semibold tracking-tight">Product usage</div>
                  <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-5">
                    {[
                      ["Free audits run", stats?.n ?? 0],
                      ["Businesses checked", stats?.businesses ?? 0],
                      ["Cities", stats?.cities ?? 0],
                      ["Countries", stats?.countries ?? 0],
                    ].map(([l, v]) => (
                      <div key={l as string}>
                        <dt className="label">{l}</dt>
                        <dd className="mt-1 text-[26px] font-semibold leading-none tracking-tight">
                          <NumberTicker value={v as number} />
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <Link href="/stats" className="mt-6 inline-flex items-center gap-1 text-sm text-accent hover:underline">
                    See the full AI visibility statistics <ArrowRight size={14} />
                  </Link>
                </Card>
              </Reveal>
              <Reveal delay={0.16}>
                <Card className="h-full p-6">
                  <div className="font-semibold tracking-tight">About Surfaced</div>
                  <dl className="mt-5 space-y-3 text-sm">
                    {[
                      ["Founded", "November 2026"],
                      ["Based in", "Australia"],
                      ["Serves", "Local businesses, worldwide"],
                      ["Model", "One-off Fix Pack, then monthly tracking"],
                      ["Payments", "Stripe"],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-4 border-b border-line pb-3 last:border-0">
                        <dt className="text-muted">{k}</dt>
                        <dd className="text-right font-medium">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </Card>
              </Reveal>
            </section>
          </>
        )}

        <section className="mx-auto mb-20 mt-10 max-w-6xl px-5">
          <div className="flex flex-col items-start justify-between gap-6 rounded-2xl border border-line bg-card p-8 md:flex-row md:items-center">
            <div>
              <Label>Building in public</Label>
              <div className="mt-2 text-[22px] font-semibold tracking-tight">Want to be one of these numbers?</div>
              <p className="mt-1 text-ink-2">Start with the free audit. Pilot spots get their first month free.</p>
            </div>
            <LinkButton href="/#audit" size="lg" className="fx-sheen">
              Run the free audit <ArrowRight size={16} />
            </LinkButton>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
