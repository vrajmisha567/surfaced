import { ArrowRight, Check, Minus } from "lucide-react";
import { AnswerCard } from "@/components/answer-card";
import { AuditForm } from "@/components/audit-form";
import { BorderBeam, NumberTicker, Reveal, RevealWords, SampleScores, SpotlightCard, TextRotate } from "@/components/fx";
import { OpenSection, StatsSection } from "@/components/live-sections";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { Card, Label, LinkButton } from "@/components/ui";
import { categories, getCategory, promptsFor } from "@/lib/categories";
import { countryOptions, type Place } from "@/lib/locale";
import { pillarMeta } from "@/lib/audit/score";
import { getRevenue } from "@/lib/revenue";
import { plans, site } from "@/lib/site";
import { getAuditStats } from "@/lib/stats";

/** The live stats and revenue sections refresh hourly. */
export const revalidate = 3600;

const faqs = [
  {
    q: "What is GEO, and why does it matter for a local business?",
    a: "GEO (generative engine optimisation) means making your business the one AI assistants name when someone asks for a recommendation. When a customer asks ChatGPT “who's a good plumber near me?”, it gives two or three names, not ten links. If you're not one of them, you don't get the call.",
  },
  {
    q: "Do you work with businesses outside Australia?",
    a: "Yes. The audit and the fixes work for a business in any city, in any country. We check the AI answers and the Google Maps results for your own city, searched from several spots across it, so you see what your customers see.",
  },
  {
    q: "Can you guarantee ChatGPT will recommend me?",
    a: "No, and you should be wary of anyone who says they can. AI answers change daily and no one controls them. What we can do is fix the things engines rely on to trust and cite a business, then show you every week which questions you appear in and which competitors appear instead.",
  },
  {
    q: "How is this different from normal SEO?",
    a: "Google rankings still matter, and a lot of the groundwork overlaps. GEO adds what AI engines specifically read: structured data, consistent business details across directories, pages that answer questions directly, crawler access for AI bots, and an llms.txt file. Most local sites have none of these.",
  },
  {
    q: "Do I need to change website provider?",
    a: "No. The fixes work on WordPress, Wix, Squarespace, Shopify or custom sites. We either install them for you or send exact copy-paste instructions to whoever manages your site.",
  },
  {
    q: "How long until I see a change?",
    a: "Structured data and crawler fixes are picked up within days to weeks. Showing up more often in AI answers usually takes 4 to 12 weeks, because engines also weigh reviews and directory listings that build over time. Your weekly tracking shows the trend either way.",
  },
  {
    q: "Is there a lock-in contract?",
    a: "No. The Fix Pack is a one-off payment. Monthly plans are month to month and you can cancel any time. You keep every fix we've made.",
  },
];

/** Example questions for the ticker under the hero. Illustrative, not live data. */
const tickerQuestions: [string, string][] = [
  ["Manchester", "Best emergency plumber near me tonight?"],
  ["Austin", "Dentist that takes walk-ins on Saturday?"],
  ["Auckland", "Recommend a sports physio in Ponsonby"],
  ["Melbourne", "Dog-friendly cafe in Fitzroy for breakfast?"],
  ["Toronto", "Family lawyer with good reviews downtown?"],
  ["London", "Electrician in Camden who can come today?"],
  ["Dublin", "Vet open on Sunday near Rathmines?"],
  ["Singapore", "Hair salon that's good with curly hair?"],
  ["Denver", "Roofer for hail damage, who's reliable?"],
  ["Brisbane", "Accountant who understands tradies?"],
  ["Cape Town", "Yoga studio for beginners in Sea Point?"],
  ["Brooklyn", "Italian restaurant for a first date?"],
];

/** Each sample card is set in a different city, to show the questions adapt to place. */
const showcase: { id: string; place: Place; where: string }[] = [
  { id: "plumber", place: { area: "Camden", city: "London", country: "GB" }, where: "London · UK" },
  { id: "electrician", place: { area: "Leslieville", city: "Toronto", country: "CA" }, where: "Toronto · CA" },
  { id: "dentist", place: { area: "Zilker", city: "Austin", country: "US" }, where: "Austin · US" },
  { id: "physio", place: { area: "Ponsonby", city: "Auckland", country: "NZ" }, where: "Auckland · NZ" },
  { id: "cafe", place: { area: "Fitzroy", city: "Melbourne", country: "AU" }, where: "Melbourne · AU" },
  { id: "salon", place: { area: "Rathmines", city: "Dublin", country: "IE" }, where: "Dublin · IE" },
];

const rotatingTrades = ["plumber", "dentist", "physio", "lawyer", "cafe", "roofer", "vet", "salon"];

function Serif({ children }: { children: React.ReactNode }) {
  return <span className="serif text-[1.08em]">{children}</span>;
}

function Ticker() {
  const items = tickerQuestions.map(([city, q]) => (
    <span key={city} className="inline-flex shrink-0 items-center gap-2.5 rounded-full border border-line bg-card/80 py-1.5 pl-1.5 pr-4 text-[13px] text-ink-2 shadow-[0_1px_0_rgba(16,24,40,.03)]">
      <span className="rounded-full bg-paper-2 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted">{city}</span>
      “{q}”
    </span>
  ));
  return (
    <div className="fx-marquee-wrap flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,#000_10%,#000_90%,transparent)]">
      {[0, 1].map((k) => (
        <div key={k} aria-hidden={k === 1} className="fx-marquee flex shrink-0 gap-3 pr-3 [--dur:70s]">
          {items}
        </div>
      ))}
    </div>
  );
}

export default async function Home() {
  const [stats, revenue] = await Promise.all([getAuditStats(), getRevenue()]);
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "ProfessionalService",
      name: site.name,
      url: site.url,
      description: site.description,
      areaServed: "Worldwide",
      address: { "@type": "PostalAddress", addressCountry: "AU" },
      email: site.contactEmail,
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="bg-night text-center text-[13px] text-white">
        <a href="#audit" className="group mx-auto flex max-w-6xl items-center justify-center gap-2 px-5 py-2">
          <span className="rounded-full bg-accent px-1.5 py-px font-mono text-[10px] uppercase tracking-wider">Free</span>
          <span className="text-[#c9d1de]">See whether AI recommends your business, wherever you are.</span>
          <span className="hidden text-white sm:inline">
            Run the audit <span className="inline-block transition-transform group-hover:translate-x-0.5">→</span>
          </span>
        </a>
      </div>
      <SiteHeader />

      <main>
        {/* HERO */}
        <section className="relative overflow-hidden border-b border-line">
          <div aria-hidden className="grid-paper absolute inset-0 [mask-image:radial-gradient(ellipse_90%_75%_at_50%_0%,#000_35%,transparent_100%)]" />
          <div aria-hidden className="fx-glow absolute -top-48 right-[-12%] h-[620px] w-[620px] rounded-full bg-[radial-gradient(circle,rgba(19,133,95,.20),transparent_62%)] blur-2xl" />
          <div aria-hidden className="fx-glow absolute -bottom-64 left-[-14%] h-[560px] w-[560px] rounded-full bg-[radial-gradient(circle,rgba(16,24,40,.07),transparent_62%)] blur-2xl [animation-delay:-9s]" />

          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 pb-14 pt-14 lg:grid-cols-[1.25fr_1fr] lg:pb-20 lg:pt-20">
            <div>
              <div className="rise inline-flex items-center gap-2 rounded-full border border-line bg-card/70 px-3 py-1 backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-accent-2" />
                <span className="fx-shine font-mono text-[11px] uppercase tracking-[0.08em]">
                  AI search visibility<span className="hidden sm:inline"> · for local businesses</span>, worldwide
                </span>
              </div>
              <h1 className="mt-6 text-[38px] font-semibold leading-[1.05] tracking-[-0.035em] sm:text-[56px] lg:text-[46px] xl:text-[54px]">
                <RevealWords text="When customers ask AI" />
                <br className="hidden sm:block" />{" "}
                <RevealWords text="for the best" delay={0.24} />{" "}
                <TextRotate words={rotatingTrades} className="text-accent" />
                <span className="text-accent">,</span>
                <br />
                <RevealWords text="be the name it gives." delay={0.42} className="serif text-[1.1em] tracking-[-0.02em] text-ink" />
              </h1>
              <Reveal delay={0.55}>
                <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-ink-2">
                  ChatGPT, Gemini, Perplexity and Claude now answer “who's the best plumber near me?” with two or three names. Surfaced checks whether yours is one of them, fixes what's stopping it, and tracks it every week, in any city.
                </p>
              </Reveal>
              <Reveal delay={0.7}>
                <Card className="relative mt-8 p-4 shadow-[0_1px_0_rgba(16,24,40,.04),0_24px_60px_-28px_rgba(16,24,40,.28)] sm:p-5">
                  <BorderBeam size={120} duration={12} />
                  <div className="mb-3 flex items-center justify-between">
                    <div className="text-sm font-medium">Free AI visibility audit</div>
                    <div className="label">~45 seconds<span className="hidden sm:inline"> · no sign-up</span></div>
                  </div>
                  <AuditForm />
                </Card>
              </Reveal>
            </div>
            <Reveal delay={0.35} y={24}>
              <AnswerCard />
            </Reveal>
          </div>

          <div className="relative pb-10">
            <div className="label mb-4 text-center">The kind of questions customers ask AI, in every city</div>
            <Ticker />
          </div>
        </section>

        {/* FACT BAND */}
        <section className="border-b border-line bg-card">
          <div className="mx-auto grid max-w-6xl grid-cols-2 divide-line px-5 md:grid-cols-4 md:divide-x">
            {(
              [
                [4, "", "AI engines checked", "ChatGPT · Gemini · Perplexity · Claude"],
                [7, "", "areas scored", "From Google Maps to crawler access"],
                [categories.length, "", "business types built in", "Or type your own"],
                [countryOptions.length, "", "countries, any city", "Maps searched where you are"],
              ] as const
            ).map(([n, suffix, l, s], k) => (
              <Reveal key={l} delay={k * 0.08} className="px-2 py-9 md:px-6">
                <NumberTicker value={n} suffix={suffix} className="text-[38px] font-semibold tracking-tight text-accent" />
                <div className="mt-1 text-sm font-medium">{l}</div>
                <div className="label mt-2">{s}</div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* THE SHIFT */}
        <section className="mx-auto max-w-6xl px-5 py-24">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.3fr] lg:items-center">
            <Reveal>
              <Label>Why this matters now</Label>
              <h2 className="mt-3 text-[38px] font-semibold leading-[1.08] tracking-tight">
                Ten blue links became <Serif>three names.</Serif>
              </h2>
              <p className="mt-4 leading-relaxed text-ink-2">
                On a search results page, ranking eighth still gets some clicks. In an AI answer there is no eighth. The assistant reads the web, decides who it trusts, and names a few businesses. Everyone else is invisible for that question.
              </p>
              <p className="mt-3 leading-relaxed text-ink-2">
                Most small business websites were built before this existed. They're missing the structured facts, directory consistency and direct answers these engines look for. That's fixable.
              </p>
            </Reveal>
            <div className="grid gap-4 sm:grid-cols-2">
              <Reveal delay={0.1}>
                <Card className="h-full p-5">
                  <div className="label">Then · search results</div>
                  <ol className="mt-4 space-y-2.5 text-sm">
                    {["Ad", "Ad", "Map pack × 3", "Result 1", "Result 2", "Result 3", "Result 4", "… 6 more"].map((r, i) => (
                      <li key={i} className="flex items-center gap-2 text-ink-2">
                        <span className="h-2 w-2 rounded-full bg-line-2" />
                        {r}
                      </li>
                    ))}
                  </ol>
                  <div className="label mt-5 border-t border-line pt-3">Plenty of places to be found</div>
                </Card>
              </Reveal>
              <Reveal delay={0.2}>
                <Card className="relative h-full border-ink bg-night p-5 text-white shadow-[0_30px_70px_-30px_rgba(11,18,32,.6)]">
                  <BorderBeam size={110} duration={8} delay={3} from="#13855f" to="#a7f0d2" />
                  <div className="label !text-faint">Now · AI answer</div>
                  <p className="mt-4 text-sm leading-relaxed text-[#c9d1de]">
                    “For a plumber near you, people recommend <b className="text-white">Business A</b>, <b className="text-white">Business B</b> and <b className="text-white">Business C</b>.”
                  </p>
                  <div className="mt-6 space-y-2 text-sm">
                    <div className="flex items-center gap-2"><Check size={14} className="text-[#5fd3a5]" /> 3 businesses named</div>
                    <div className="flex items-center gap-2 text-[#8a96ab]"><Minus size={14} /> Everyone else: not mentioned</div>
                  </div>
                  <div className="label mt-5 border-t border-night-line pt-3 !text-[#6b7891]">Be named, or be absent</div>
                </Card>
              </Reveal>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how" className="border-y border-line bg-card">
          <div className="mx-auto max-w-6xl px-5 py-24">
            <Reveal>
              <Label>How it works</Label>
              <h2 className="mt-3 max-w-2xl text-[38px] font-semibold leading-[1.08] tracking-tight">
                Audit, fix, then <Serif>prove it moved.</Serif>
              </h2>
            </Reveal>
            <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-3">
              {[
                ["01", "Audit", "We ask AI engines the questions your customers ask, check where you rank on Google Maps across your city, and score your site on the five things engines use to decide who to name."],
                ["02", "Fix", "We write and install the fixes: LocalBusiness schema, FAQ answers, llms.txt, crawler access, Google Business Profile cleanup and directory listings."],
                ["03", "Track", "Every week we re-ask the same questions and show you, in a private dashboard, how often you're named and who's named instead."],
              ].map(([n, t, d], k) => (
                <SpotlightCard key={n} className="bg-card">
                  <Reveal delay={k * 0.1} className="p-8">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm text-accent">{n}</span>
                      <span className="h-px flex-1 bg-gradient-to-r from-line-2 to-transparent" />
                    </div>
                    <div className="mt-8 text-[22px] font-semibold tracking-tight">{t}</div>
                    <p className="mt-2 text-sm leading-relaxed text-ink-2">{d}</p>
                  </Reveal>
                </SpotlightCard>
              ))}
            </div>
          </div>
        </section>

        {/* WHAT WE CHECK + SAMPLE */}
        <section id="checks" className="mx-auto max-w-6xl px-5 py-24">
          <div className="grid gap-12 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <Reveal>
                <Label>What we check</Label>
                <h2 className="mt-3 text-[38px] font-semibold leading-[1.08] tracking-tight">
                  Two questions: are you named now, and <Serif>will it last?</Serif>
                </h2>
              </Reveal>
              <div className="mt-8 divide-y divide-line border-y border-line">
                {Object.entries(pillarMeta).map(([k, p], i) => (
                  <Reveal key={k} delay={i * 0.05} y={8}>
                    <div className="group grid grid-cols-[2.5rem_1fr_auto] items-baseline gap-3 py-4">
                      <span className="font-mono text-xs text-muted transition-colors group-hover:text-accent">{String(i + 1).padStart(2, "0")}</span>
                      <div>
                        <div className="font-medium">{p.label}</div>
                        <div className="mt-0.5 text-sm text-ink-2">{p.summary}</div>
                      </div>
                      <span className="label">{p.group === "visibility" ? "Visible now" : "Readiness"}</span>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
            <Reveal delay={0.15} className="lg:sticky lg:top-24 lg:self-start">
              <Card className="relative p-6 shadow-[0_30px_70px_-36px_rgba(16,24,40,.3)]">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="label">Exhibit 01 · Sample report</div>
                    <div className="mt-1 font-medium">Example Plumbing Co.</div>
                  </div>
                  <span className="rounded-md bg-bad-soft px-2 py-0.5 text-xs font-medium text-bad">Named in 0 of 12</span>
                </div>
                <SampleScores
                  score={38}
                  bars={[
                    ["AI answers", 0],
                    ["Google Maps & reviews", 31],
                    ["Structured data", 20],
                    ["Name, address, phone", 64],
                    ["Answer-first content", 41],
                    ["AI crawler access", 78],
                  ]}
                />
                <div className="mt-6 rounded-lg bg-paper p-4 text-sm">
                  <div className="label mb-2">Top fix</div>
                  Add a Plumber (LocalBusiness) JSON-LD block with name, address, phone, hours and service area.
                </div>
                <div className="label mt-4">Fictional business · real report layout</div>
              </Card>
            </Reveal>
          </div>
        </section>

        {/* CATEGORIES */}
        <section className="border-y border-line bg-paper-2/60">
          <div className="mx-auto max-w-6xl px-5 py-24">
            <Reveal>
              <Label>Built for local businesses, anywhere</Label>
              <h2 className="mt-3 max-w-2xl text-[38px] font-semibold leading-[1.08] tracking-tight">
                The questions we track <Serif>for your trade.</Serif>
              </h2>
            </Reveal>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {showcase.map(({ id, place, where }, k) => {
                const c = getCategory(id);
                return (
                  <Reveal key={id} delay={(k % 3) * 0.08}>
                    <SpotlightCard className="h-full rounded-xl border border-line bg-card transition-shadow duration-300 hover:shadow-[0_24px_50px_-30px_rgba(16,24,40,.35)]">
                      <div className="p-5">
                        <div className="flex items-center justify-between">
                          <div className="font-medium">{c.plural}</div>
                          <div className="label">{where}</div>
                        </div>
                        <ul className="mt-4 space-y-2">
                          {promptsFor(id, place, 3).map((p) => (
                            <li key={p} className="rounded-md border border-line bg-paper px-3 py-2 font-mono text-[12px] leading-snug text-ink-2">
                              “{p}”
                            </li>
                          ))}
                        </ul>
                      </div>
                    </SpotlightCard>
                  </Reveal>
                );
              })}
            </div>
            <p className="mt-8 text-sm text-muted">
              Plus {categories.length - showcase.length} more built-in business types, from roofers and vets to lawyers and wedding venues. Not listed? Pick
              &ldquo;Other&rdquo; in the audit form and type yours. Questions are written for your city and country, wherever you are.
            </p>
          </div>
        </section>

        {/* LIVE STATS */}
        <StatsSection s={stats} />

        {/* PRICING */}
        <section id="pricing" className="mx-auto max-w-6xl px-5 py-24">
          <Reveal>
            <Label>Pricing · AUD</Label>
            <h2 className="mt-3 text-[38px] font-semibold leading-[1.08] tracking-tight">
              Priced for local businesses, <Serif>not enterprise.</Serif>
            </h2>
            <p className="mt-3 max-w-2xl text-ink-2">Agencies charge $1,500+ a month for this. You get the same checks and fixes, scoped to a single location.</p>
          </Reveal>
          <div className="mt-12 grid gap-4 lg:grid-cols-3">
            {plans.map((p, k) => (
              <Reveal key={p.id} delay={k * 0.1}>
                <Card
                  className={`relative flex h-full flex-col p-7 transition-transform duration-300 hover:-translate-y-1 ${
                    p.featured ? "border-ink bg-night text-white shadow-[0_40px_80px_-36px_rgba(11,18,32,.7)]" : "hover:shadow-[0_24px_50px_-30px_rgba(16,24,40,.35)]"
                  }`}
                >
                  {p.featured && (
                    <>
                      <BorderBeam size={160} duration={9} from="#13855f" to="#a7f0d2" />
                      <span className="label absolute -top-2.5 left-7 rounded bg-accent px-2 py-0.5 !text-white">Most chosen</span>
                    </>
                  )}
                  <div className="font-medium">{p.name}</div>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="tabular text-[44px] font-semibold tracking-tight">${p.price}</span>
                    <span className={`text-sm ${p.featured ? "text-faint" : "text-muted"}`}>{p.interval === "once" ? "one-off" : "/month"}</span>
                  </div>
                  <p className={`mt-2 text-sm ${p.featured ? "text-[#c9d1de]" : "text-ink-2"}`}>{p.blurb}</p>
                  <ul className={`mt-6 flex-1 space-y-2.5 text-sm ${p.featured ? "text-[#dfe5ee]" : ""}`}>
                    {p.features.map((f) => (
                      <li key={f} className="flex gap-2">
                        <Check size={16} className={`mt-0.5 shrink-0 ${p.featured ? "text-[#5fd3a5]" : "text-accent"}`} />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <LinkButton
                    href={`/api/checkout?plan=${p.id}`}
                    variant={p.featured ? "primary" : "secondary"}
                    className={`mt-8 w-full ${p.featured ? "fx-sheen" : ""}`}
                    prefetch={false}
                  >
                    {p.interval === "once" ? "Get the Fix Pack" : `Start ${p.name}`} <ArrowRight size={15} />
                  </LinkButton>
                </Card>
              </Reveal>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted">Prices in Australian dollars. GST included for Australian businesses.</p>
          <Reveal>
            <div className="mt-6 rounded-xl border border-dashed border-line-2 p-5 text-sm text-ink-2">
              <b className="text-ink">Pilot spots:</b> the first three businesses in each category get their first month of Visibility free in exchange for an honest testimonial.{" "}
              <a href="#audit" className="text-accent underline underline-offset-2">Start with the free audit.</a>
            </div>
          </Reveal>
        </section>

        {/* OPEN REVENUE */}
        <div className="border-t border-line">
          <OpenSection rev={revenue} />
        </div>

        {/* HONESTY */}
        <section className="relative overflow-hidden border-y border-line bg-night text-white">
          <div aria-hidden className="fx-glow absolute -right-40 -top-40 h-[480px] w-[480px] rounded-full bg-[radial-gradient(circle,rgba(19,133,95,.22),transparent_62%)] blur-2xl" />
          <div className="relative mx-auto grid max-w-6xl gap-10 px-5 py-20 md:grid-cols-[1fr_1.4fr]">
            <Reveal>
              <div className="label !text-faint">Our promise</div>
              <h2 className="mt-3 text-[34px] font-semibold leading-tight tracking-tight">
                Evidence, <Serif>not guarantees.</Serif>
              </h2>
            </Reveal>
            <div className="grid gap-x-8 gap-y-7 sm:grid-cols-2">
              {[
                ["We won't promise rankings.", "Nobody controls what an AI says. Anyone guaranteeing “#1 in ChatGPT” is guessing."],
                ["We will show the receipts.", "Every week: the exact questions, each engine's answer, and whether you were named."],
                ["You keep everything.", "Schema, copy, listings and pages we create are yours, even if you leave."],
                ["Plain English.", "No jargon reports. Each fix says what it is, why it matters and whether it's done."],
              ].map(([t, d], k) => (
                <Reveal key={t} delay={k * 0.08}>
                  <div className="border-l border-night-line pl-4">
                    <div className="font-medium">{t}</div>
                    <p className="mt-1 text-sm leading-relaxed text-[#a9b4c6]">{d}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="mx-auto max-w-3xl px-5 py-24">
          <Reveal>
            <Label>FAQ</Label>
            <h2 className="mt-3 text-[38px] font-semibold leading-[1.08] tracking-tight">
              Questions owners <Serif>ask us.</Serif>
            </h2>
          </Reveal>
          <div className="mt-8 divide-y divide-line border-y border-line">
            {faqs.map((f) => (
              <details key={f.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium transition-colors hover:text-accent">
                  {f.q}
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-line font-mono text-muted transition-transform duration-300 group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-[15px] leading-relaxed text-ink-2">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto mb-24 max-w-6xl px-5">
          <Reveal>
            <div className="relative overflow-hidden rounded-3xl border border-night-line bg-night p-10 text-white sm:p-14">
              <BorderBeam size={220} duration={12} from="#13855f" to="#a7f0d2" />
              <div aria-hidden className="grid-paper absolute inset-0 opacity-[.35] invert [mask-image:radial-gradient(ellipse_70%_90%_at_100%_50%,#000_20%,transparent_75%)]" />
              <div aria-hidden className="fx-glow absolute -bottom-40 -right-24 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(19,133,95,.35),transparent_62%)] blur-2xl" />
              <div className="relative flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
                <div>
                  <h2 className="max-w-xl text-[34px] font-semibold leading-[1.1] tracking-tight sm:text-[40px]">
                    Find out what AI says about <Serif>your business.</Serif>
                  </h2>
                  <p className="mt-3 text-[#a9b4c6]">Free, about 45 seconds, no sign-up. Works in any city.</p>
                </div>
                <LinkButton href="#audit" size="lg" className="fx-sheen shrink-0">
                  Run the free audit <ArrowRight size={16} />
                </LinkButton>
              </div>
            </div>
          </Reveal>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
