import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { NumberTicker, Reveal } from "@/components/fx";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { DailyBars, Scatter } from "@/components/stats-charts";
import { Card, Label, LinkButton } from "@/components/ui";
import { getAuditStats } from "@/lib/stats";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "AI visibility statistics",
  description: "How local businesses score on AI search visibility: live statistics from every free Surfaced audit, across business types, cities and countries.",
};

const pct = (v: number | null | undefined, digits = 0) => (v == null ? "—" : `${(v * 100).toFixed(digits)}%`);

function Serif({ children }: { children: React.ReactNode }) {
  return <span className="serif text-[1.08em]">{children}</span>;
}

/** A labelled share bar, like a distribution row. Value always printed, so colour never carries meaning alone. */
function ShareRow({ label, sub, share, note, strong }: { label: React.ReactNode; sub?: string; share: number; note?: string; strong?: boolean }) {
  return (
    <div className="grid grid-cols-[minmax(0,10rem)_1fr_3.5rem] items-center gap-3 py-1.5 text-sm sm:grid-cols-[minmax(0,15rem)_1fr_4rem]">
      <span className="min-w-0 text-ink-2" title={typeof label === "string" ? label : undefined}>
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
    <Card className={`p-6 ${className ?? ""}`}>
      <div className="font-semibold tracking-tight">{title}</div>
      {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
      <div className="mt-5">{children}</div>
    </Card>
  );
}

function Tile({ label, value, suffix, sub }: { label: string; value: number | null; suffix?: string; sub: string }) {
  return (
    <Card className="p-5">
      <Label>{label}</Label>
      <div className="mt-3 text-[34px] font-semibold leading-none tracking-tight">
        {value == null ? <span className="text-faint">—</span> : <NumberTicker value={value} suffix={suffix} />}
      </div>
      <div className="mt-2 text-xs text-muted">{sub}</div>
    </Card>
  );
}

const medals = ["🥇", "🥈", "🥉"];

export default async function StatsPage() {
  const s = await getAuditStats();
  const updated = s ? new Date(s.updatedAt).toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }) + " UTC" : null;
  const enough = (k: number) => k >= 5;

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-line">
          <div aria-hidden className="grid-paper absolute inset-0 [mask-image:radial-gradient(ellipse_80%_80%_at_50%_0%,#000_30%,transparent_100%)]" />
          <div className="relative mx-auto max-w-6xl px-5 py-16 sm:py-20">
            <Reveal>
              <div className="label">
                <Link href="/" className="hover:text-ink">Surfaced</Link> › Statistics
              </div>
              <h1 className="mt-4 max-w-3xl text-[40px] font-semibold leading-[1.05] tracking-[-0.03em] sm:text-[54px]">
                AI visibility, <Serif>by the numbers.</Serif>
              </h1>
              <p className="mt-4 max-w-2xl text-[17px] leading-relaxed text-ink-2">
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
          </div>
        </section>

        {!s || s.n === 0 ? (
          <section className="mx-auto max-w-6xl px-5 py-20">
            <Card className="p-10 text-center">
              <div className="font-medium">{s ? "No audits yet." : "Statistics are unavailable right now."}</div>
              <p className="mt-2 text-sm text-muted">Run the first free audit and this page fills in.</p>
              <LinkButton href="/#audit" className="mt-6">
                Run a free audit <ArrowRight size={15} />
              </LinkButton>
            </Card>
          </section>
        ) : (
          <>
            <section className="mx-auto max-w-6xl px-5 pt-12">
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <Tile label="Audits run" value={s.n} sub={`${s.businesses} businesses checked`} />
                <Tile label="Median score" value={s.medianScore} suffix="/100" sub="Across every audit" />
                <Tile label="Named by AI" value={s.namedShare == null ? null : Math.round(s.namedShare * 100)} suffix="%" sub={s.aiN ? `Named at least once, of ${s.aiN} measured` : "Not measured yet"} />
                <Tile
                  label="Maps top 3"
                  value={s.mapsTop3Share == null ? null : Math.round(s.mapsTop3Share * 100)}
                  suffix="%"
                  sub={s.mapsN ? `Top 3 from most of their city, of ${s.mapsN}` : "Measured on newer audits"}
                />
              </div>
            </section>

            <section className="mx-auto grid max-w-6xl gap-4 px-5 pt-4 [&>*]:min-w-0 lg:grid-cols-2">
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
            </section>

            <section className="mx-auto grid max-w-6xl gap-4 px-5 pt-4 [&>*]:min-w-0 lg:grid-cols-[1.15fr_1fr]">
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
                  {enough(s.scatter.length) ? (
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
                        Needs at least 5 audits with the new scoring.
                        <br />
                        {s.scatter.length} so far.
                      </div>
                    </div>
                  )}
                </Panel>
              </Reveal>
            </section>

            <section className="mx-auto grid max-w-6xl gap-4 px-5 pt-4 [&>*]:min-w-0 lg:grid-cols-[1.4fr_1fr]">
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
                        <span className="rounded bg-ink px-1.5 py-0.5 font-mono text-[10px] text-white">{c.code}</span>
                        <span className="flex-1 truncate font-medium">{c.name}</span>
                        <span className="tabular text-right text-xs text-muted">
                          {c.audits} {c.audits === 1 ? "audit" : "audits"} · {c.cities} {c.cities === 1 ? "city" : "cities"} · median {c.median}
                        </span>
                      </li>
                    ))}
                  </ol>
                </Panel>
              </Reveal>
            </section>

            <section className="mx-auto max-w-6xl px-5 pt-4">
              <Reveal>
                <Panel title="Audits per day" sub="Last 30 days.">
                  <DailyBars data={s.perDay.map((d) => ({ day: d.day, value: d.count }))} height={180} empty="No audits in the last 30 days" />
                </Panel>
              </Reveal>
            </section>

            <section className="mx-auto max-w-6xl px-5 pb-6 pt-6">
              <p className="label">
                Last updated {updated} · refreshed hourly · aggregated from every audit on Surfaced; no business names are shown
              </p>
            </section>
          </>
        )}

        <section className="mx-auto mb-20 mt-10 max-w-6xl px-5">
          <div className="flex flex-col items-start justify-between gap-6 rounded-2xl border border-line bg-card p-8 md:flex-row md:items-center">
            <div>
              <div className="text-[22px] font-semibold tracking-tight">Where does your business sit?</div>
              <p className="mt-1 text-ink-2">Run the free audit and add a dot to these charts.</p>
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
