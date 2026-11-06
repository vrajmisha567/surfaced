import { ShieldCheck, TriangleAlert } from "lucide-react";
import { NumberTicker, Reveal } from "@/components/fx";
import { DailyBars, Scatter } from "@/components/stats-charts";
import { Card, Label } from "@/components/ui";
import type { RevenueStats } from "@/lib/revenue";
import type { AuditStats } from "@/lib/stats";
import { plans } from "@/lib/site";

/*
  Live-data sections of the home page: AI visibility statistics from every audit,
  and Surfaced's own revenue from Stripe. Both refresh hourly with the page.
*/

const pct = (v: number | null | undefined, digits = 0) => (v == null ? "—" : `${(v * 100).toFixed(digits)}%`);
const stamp = (iso: string) => new Date(iso).toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }) + " UTC";
const medals = ["🥇", "🥈", "🥉"];

function money(v: number, currency = "AUD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(v);
}

function Serif({ children }: { children: React.ReactNode }) {
  return <span className="serif text-[1.08em]">{children}</span>;
}

/** A labelled share bar. The value is always printed, so colour never carries meaning alone. */
function ShareRow({ label, sub, share, note, strong }: { label: string; sub?: string; share: number; note?: string; strong?: boolean }) {
  return (
    <div className="grid grid-cols-[minmax(0,10rem)_1fr_3.5rem] items-center gap-3 py-1.5 text-sm sm:grid-cols-[minmax(0,15rem)_1fr_4rem]">
      <span className="min-w-0 text-ink-2" title={label}>
        <span className="block truncate">{label}</span>
        {sub && <span className="block truncate text-[11px] text-muted">{sub}</span>}
      </span>
      <span className="h-2 rounded-full bg-paper-2">
        <span className={`block h-full rounded-full ${strong ? "bg-accent" : "bg-accent-2/80"}`} style={{ width: `${Math.max(share > 0 ? 2 : 0, share * 100)}%` }} />
      </span>
      <span className="tabular text-right font-medium">
        {pct(share, share > 0 && share < 0.1 ? 1 : 0)}
        {note && <span className="block text-[11px] font-normal text-muted">{note}</span>}
      </span>
    </div>
  );
}

function Panel({ title, sub, children, className }: { title: string; sub?: string; children: React.ReactNode; className?: string }) {
  return (
    <Card className={`h-full p-6 ${className ?? ""}`}>
      <div className="font-semibold tracking-tight">{title}</div>
      {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
      <div className="mt-5">{children}</div>
    </Card>
  );
}

function Tile({ label, value, sub, dark }: { label: string; value: React.ReactNode; sub: React.ReactNode; dark?: boolean }) {
  return (
    <Card className={`p-5 ${dark ? "border-night bg-night text-white" : ""}`}>
      <div className={`label ${dark ? "!text-faint" : ""}`}>{label}</div>
      <div className="tabular mt-3 text-[34px] font-semibold leading-none tracking-tight">{value}</div>
      <div className={`mt-2 text-xs ${dark ? "text-[#a9b4c6]" : "text-muted"}`}>{sub}</div>
    </Card>
  );
}

const ticker = (v: number | null, suffix = "") => (v == null ? <span className="text-faint">—</span> : <NumberTicker value={v} suffix={suffix} />);

/* ---------------- AI visibility statistics ---------------- */

export function StatsSection({ s }: { s: AuditStats | null }) {
  return (
    <section id="stats" className="border-b border-line">
      <div className="mx-auto max-w-6xl px-5 py-24">
        <Reveal>
          <Label>Live data · from every free audit</Label>
          <h2 className="mt-3 max-w-3xl text-[38px] font-semibold leading-[1.08] tracking-tight">
            AI visibility, <Serif>by the numbers.</Serif>
          </h2>
          <p className="mt-3 max-w-2xl text-ink-2">
            {s && s.n > 0 ? (
              <>
                A live snapshot of <b className="text-ink">{s.n.toLocaleString()} audits</b> across {s.businesses.toLocaleString()} businesses in {s.cities}{" "}
                {s.cities === 1 ? "city" : "cities"} and {s.countries} {s.countries === 1 ? "country" : "countries"}: how often AI names local businesses, and what holds them back.
              </>
            ) : (
              "A live snapshot of every free audit: how often AI names local businesses, and what holds them back."
            )}
          </p>
        </Reveal>

        {!s || s.n === 0 ? (
          <Card className="mt-10 p-10 text-center text-sm text-muted">{s ? "No audits yet. Run the first one and this fills in." : "Statistics are unavailable right now."}</Card>
        ) : (
          <>
            <div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Tile label="Audits run" value={ticker(s.n)} sub={`${s.businesses} businesses checked`} />
              <Tile label="Median score" value={ticker(s.medianScore, "/100")} sub="Across every audit" />
              <Tile label="Named by AI" value={ticker(s.namedShare == null ? null : Math.round(s.namedShare * 100), "%")} sub={s.aiN ? `Named at least once, of ${s.aiN} measured` : "Not measured yet"} />
              <Tile
                label="Maps top 3"
                value={ticker(s.mapsTop3Share == null ? null : Math.round(s.mapsTop3Share * 100), "%")}
                sub={s.mapsN ? `Top 3 from most of their city, of ${s.mapsN}` : "Measured on newer audits"}
              />
            </div>

            <div className="mt-4 grid gap-4 [&>*]:min-w-0 lg:grid-cols-2">
              <Reveal>
                <Panel title="Score distribution" sub="Overall score out of 100, share of audits.">
                  {s.buckets.map((b) => (
                    <ShareRow key={b.label} label={b.label} share={b.share} note={`${b.count}`} />
                  ))}
                </Panel>
              </Reveal>
              <Reveal delay={0.08}>
                <Panel title="Average score by area" sub="What's strong and what's weak, out of 100.">
                  {s.pillars.map((p) => (
                    <ShareRow
                      key={p.key}
                      label={p.label}
                      sub={p.group === "visibility" ? "Visible now" : "Site readiness"}
                      share={(p.avg ?? 0) / 100}
                      note={p.avg == null ? "n/a" : undefined}
                      strong={p.group === "visibility"}
                    />
                  ))}
                </Panel>
              </Reveal>
            </div>

            <div className="mt-4 grid gap-4 [&>*]:min-w-0 lg:grid-cols-[1.15fr_1fr]">
              <Reveal>
                <Panel title="Most common problems" sub="Share of audited sites failing or needing work on each check.">
                  {s.problems.length ? (
                    s.problems.map((p) => <ShareRow key={p.id} label={p.label} sub={p.pillar} share={p.problemShare} />)
                  ) : (
                    <p className="text-sm text-muted">Not enough audits yet.</p>
                  )}
                </Panel>
              </Reveal>
              <Reveal delay={0.08}>
                <Panel title="Does a ready site get named more?" sub="Each dot is one audit: site readiness against visibility now.">
                  {s.scatter.length >= 5 ? (
                    <>
                      <Scatter points={s.scatter} xLabel="Site readiness" yLabel="Visible now" height={280} />
                      <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-xs text-muted">
                        <span>
                          {s.r == null
                            ? "Too little variation to call yet"
                            : s.r > 0.2
                              ? "Readier sites tend to be more visible"
                              : s.r < -0.2
                                ? "So far, readiness and visibility move apart"
                                : "So far, no clear link"}
                        </span>
                        <span className="tabular font-mono">
                          r={s.r == null ? "—" : s.r.toFixed(2)} n={s.scatter.length}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="grid h-[240px] place-items-center rounded-lg border border-dashed border-line-2 text-center text-sm text-muted">
                      <div>
                        Needs at least 5 audits.
                        <br />
                        {s.scatter.length} so far.
                      </div>
                    </div>
                  )}
                </Panel>
              </Reveal>
            </div>

            <div className="mt-4 grid gap-4 [&>*]:min-w-0 lg:grid-cols-[1.4fr_1fr]">
              <Reveal>
                <Panel title="Business types" sub="Most audited types: median score and how often AI names them.">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="label border-b border-line text-left">
                          <th className="py-2 pr-2 font-normal">#</th>
                          <th className="py-2 pr-2 font-normal">Type</th>
                          <th className="py-2 pr-2 text-right font-normal">Audits</th>
                          <th className="py-2 pr-2 text-right font-normal">Median</th>
                          <th className="py-2 text-right font-normal">Named by AI</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {s.categories.map((c, i) => (
                          <tr key={c.id}>
                            <td className="py-2.5 pr-2 text-muted">{medals[i] ?? i + 1}</td>
                            <td className="py-2.5 pr-2 font-medium">{c.label}</td>
                            <td className="tabular py-2.5 pr-2 text-right">{c.audits}</td>
                            <td className="tabular py-2.5 pr-2 text-right">{c.median}</td>
                            <td className="tabular py-2.5 text-right">{pct(c.named)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Panel>
              </Reveal>
              <Reveal delay={0.08}>
                <Panel title="Countries" sub="Where audited businesses are.">
                  <ol className="space-y-2">
                    {s.countryRows.map((c, i) => (
                      <li key={c.code} className="flex items-center gap-3 rounded-lg border border-line bg-paper px-3 py-2.5 text-sm">
                        <span className="w-6 text-muted">{medals[i] ?? `#${i + 1}`}</span>
                        <span className="rounded bg-inverse px-1.5 py-0.5 font-mono text-[10px] text-on-inverse">{c.code}</span>
                        <span className="flex-1 truncate font-medium">{c.name}</span>
                        <span className="tabular text-right text-xs text-muted">
                          {c.audits} {c.audits === 1 ? "audit" : "audits"} · median {c.median}
                        </span>
                      </li>
                    ))}
                  </ol>
                </Panel>
              </Reveal>
            </div>

            <div className="mt-4">
              <Reveal>
                <Panel title="Audits per day" sub="Last 30 days.">
                  <DailyBars data={s.perDay.map((d) => ({ day: d.day, value: d.count }))} height={180} empty="No audits in the last 30 days" />
                </Panel>
              </Reveal>
            </div>

            <p className="label mt-6">Last updated {stamp(s.updatedAt)} · refreshed hourly · no business names are shown</p>
          </>
        )}
      </div>
    </section>
  );
}

/* ---------------- Open revenue ---------------- */

export function OpenSection({ rev }: { rev: RevenueStats | null }) {
  const cur = rev?.currency ?? "AUD";
  const growth = rev?.growth;
  return (
    <section id="open" className="mx-auto max-w-6xl px-5 py-24">
      <Reveal>
        <Label>Building in public</Label>
        <h2 className="mt-3 text-[38px] font-semibold leading-[1.08] tracking-tight">
          Surfaced, <Serif>in the open.</Serif>
        </h2>
        <p className="mt-3 max-w-2xl text-ink-2">Every dollar Surfaced earns, read straight from Stripe and refreshed every hour. No screenshots, no rounding up.</p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-line bg-card/80 px-3 py-1 text-xs text-ink-2">
          <ShieldCheck size={14} className="text-accent" /> Revenue verified with the Stripe API{rev ? ` · last updated ${stamp(rev.updatedAt)}` : ""}
        </div>
      </Reveal>

      {rev?.testMode && (
        <div className="mt-6 flex items-center gap-2 rounded-lg border border-warn/20 bg-warn-soft px-4 py-3 text-sm text-warn">
          <TriangleAlert size={15} className="shrink-0" />
          Stripe is in test mode, so the figures below are test payments, not real revenue.
        </div>
      )}

      {!rev ? (
        <Card className="mt-10 p-10 text-center text-sm text-muted">Revenue figures are unavailable right now.</Card>
      ) : (
        <>
          <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
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
            <Tile
              label="Paying customers"
              value={ticker(rev.customers)}
              sub={rev.firstPayment ? `Since ${new Date(rev.firstPayment).toLocaleDateString("en-AU", { month: "long", year: "numeric" })}` : "First one coming soon"}
            />
          </div>

          <div className="mt-4 grid gap-4 [&>*]:min-w-0 lg:grid-cols-[1.8fr_1fr]">
            <Reveal>
              <Card className="h-full p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div className="font-semibold tracking-tight">Revenue</div>
                  <span className="label">{cur} · daily, net of refunds</span>
                </div>
                <DailyBars data={rev.daily.map((d) => ({ day: d.day, value: Math.round(d.amount) }))} currency={cur} ranges={[30, 90, 365]} height={220} empty="No payments in this period yet" />
              </Card>
            </Reveal>
            <Reveal delay={0.08}>
              <Card className="h-full p-6">
                <div className="font-semibold tracking-tight">Subscriptions by plan</div>
                <ul className="mt-4 divide-y divide-line text-sm">
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
                      One-off payments <span className="text-muted">· Fix Pack</span>
                    </span>
                    <span className="tabular font-medium">{rev.oneOffPayments}</span>
                  </li>
                </ul>
                <dl className="mt-5 space-y-2 border-t border-line pt-4 text-sm">
                  {[
                    ["Founded", "November 2026"],
                    ["Based in", "Australia"],
                    ["Serves", "Local businesses, worldwide"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4">
                      <dt className="text-muted">{k}</dt>
                      <dd className="text-right font-medium">{v}</dd>
                    </div>
                  ))}
                </dl>
              </Card>
            </Reveal>
          </div>
        </>
      )}
    </section>
  );
}
