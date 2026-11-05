import { ArrowRight, Check, Minus } from "lucide-react";
import { AnswerCard } from "@/components/answer-card";
import { AuditForm } from "@/components/audit-form";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { Card, Label, LinkButton, ScoreBar, ScoreRing } from "@/components/ui";
import { categories, fillTemplate } from "@/lib/categories";
import { pillarMeta } from "@/lib/audit/score";
import { plans, site } from "@/lib/site";

const faqs = [
  {
    q: "What is GEO, and why does it matter for a local business?",
    a: "GEO (generative engine optimisation) means making your business the one AI assistants name when someone asks for a recommendation. When a local asks ChatGPT “who's a good plumber in Norwood?”, it gives two or three names, not ten links. If you're not one of them, you don't get the call.",
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

export default function Home() {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "ProfessionalService",
      name: site.name,
      url: site.url,
      description: site.description,
      areaServed: { "@type": "City", name: "Adelaide" },
      address: { "@type": "PostalAddress", addressLocality: "Adelaide", addressRegion: "SA", addressCountry: "AU" },
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
      <div className="bg-accent-ink text-center text-[13px] text-white">
        <a href="#audit" className="mx-auto block max-w-6xl px-5 py-2 hover:underline">
          Free for Adelaide businesses: see whether ChatGPT recommends you. <span className="opacity-70">Run the audit →</span>
        </a>
      </div>
      <SiteHeader />

      <main>
        {/* HERO */}
        <section className="grid-paper border-b border-line">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 lg:grid-cols-[1.1fr_1fr] lg:py-24">
            <div className="rise">
              <Label>AI search visibility · Adelaide, SA</Label>
              <h1 className="mt-4 text-[44px] font-semibold leading-[1.04] tracking-[-0.03em] sm:text-[58px]">
                When locals ask AI who to call, <span className="text-accent">be the name it gives.</span>
              </h1>
              <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-ink-2">
                ChatGPT, Gemini, Perplexity and Claude now answer “who's the best plumber near me” with two or three names. Surfaced checks whether yours is one of them, fixes what's stopping it, and tracks it every week.
              </p>
              <Card className="mt-8 p-4 shadow-[0_1px_0_rgba(16,24,40,.04),0_12px_32px_-16px_rgba(16,24,40,.18)] sm:p-5">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-sm font-medium">Free AI visibility audit</div>
                  <div className="label">~45 seconds</div>
                </div>
                <AuditForm />
              </Card>
            </div>
            <div className="rise [animation-delay:150ms]">
              <AnswerCard />
            </div>
          </div>
        </section>

        {/* FACT BAND */}
        <section className="border-b border-line bg-card">
          <div className="mx-auto grid max-w-6xl grid-cols-2 divide-line px-5 md:grid-cols-4 md:divide-x">
            {[
              ["4", "AI engines checked", "ChatGPT · Gemini · Perplexity · Claude"],
              ["6", "areas scored", "From schema to crawler access"],
              ["30+", "individual checks", "Each with a plain-English fix"],
              ["Weekly", "re-checks", "Share of voice vs 3 competitors"],
            ].map(([n, l, s]) => (
              <div key={l} className="px-2 py-8 md:px-6">
                <div className="tabular text-[34px] font-semibold tracking-tight text-accent">{n}</div>
                <div className="mt-1 text-sm font-medium">{l}</div>
                <div className="label mt-2">{s}</div>
              </div>
            ))}
          </div>
        </section>

        {/* THE SHIFT */}
        <section className="mx-auto max-w-6xl px-5 py-20">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.3fr] lg:items-center">
            <div>
              <Label>Why this matters now</Label>
              <h2 className="mt-3 text-[34px] font-semibold leading-tight tracking-tight">Ten blue links became three names.</h2>
              <p className="mt-4 text-ink-2 leading-relaxed">
                On a search results page, ranking eighth still gets some clicks. In an AI answer there is no eighth. The assistant reads the web, decides who it trusts, and names a few businesses. Everyone else is invisible for that question.
              </p>
              <p className="mt-3 text-ink-2 leading-relaxed">
                Most Adelaide small business sites were built before this existed. They're missing the structured facts, directory consistency and direct answers these engines look for. That's fixable.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Card className="p-5">
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
              <Card className="border-ink bg-night p-5 text-white">
                <div className="label !text-faint">Now · AI answer</div>
                <p className="mt-4 text-sm leading-relaxed text-[#c9d1de]">
                  “For a plumber in Norwood, locals recommend <b className="text-white">Business A</b>, <b className="text-white">Business B</b> and <b className="text-white">Business C</b>.”
                </p>
                <div className="mt-6 space-y-2 text-sm">
                  <div className="flex items-center gap-2"><Check size={14} className="text-[#5fd3a5]" /> 3 businesses named</div>
                  <div className="flex items-center gap-2 text-[#8a96ab]"><Minus size={14} /> Everyone else: not mentioned</div>
                </div>
                <div className="label mt-5 border-t border-night-line pt-3 !text-[#6b7891]">Be named, or be absent</div>
              </Card>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how" className="border-y border-line bg-card">
          <div className="mx-auto max-w-6xl px-5 py-20">
            <Label>How it works</Label>
            <h2 className="mt-3 max-w-2xl text-[34px] font-semibold leading-tight tracking-tight">Audit, fix, then prove it moved.</h2>
            <div className="mt-10 grid gap-px overflow-hidden rounded-xl border border-line bg-line md:grid-cols-3">
              {[
                ["01", "Audit", "We ask the four big AI engines the questions your customers ask, and score your site on the six things they use to decide who to name."],
                ["02", "Fix", "We write and install the fixes: LocalBusiness schema, FAQ answers, llms.txt, crawler access, Google Business Profile cleanup and directory listings."],
                ["03", "Track", "Every week we re-ask the same questions and show you, in a private dashboard, how often you're named and who's named instead."],
              ].map(([n, t, d]) => (
                <div key={n} className="bg-card p-7">
                  <div className="font-mono text-sm text-accent">{n}</div>
                  <div className="mt-6 text-xl font-semibold">{t}</div>
                  <p className="mt-2 text-sm leading-relaxed text-ink-2">{d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* WHAT WE CHECK + SAMPLE */}
        <section id="checks" className="mx-auto max-w-6xl px-5 py-20">
          <div className="grid gap-12 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <Label>What we check</Label>
              <h2 className="mt-3 text-[34px] font-semibold leading-tight tracking-tight">Six areas decide whether AI can cite you.</h2>
              <div className="mt-8 divide-y divide-line border-y border-line">
                {Object.entries(pillarMeta).map(([k, p], i) => (
                  <div key={k} className="grid grid-cols-[2.5rem_1fr_auto] items-baseline gap-3 py-4">
                    <span className="font-mono text-xs text-muted">{String(i + 1).padStart(2, "0")}</span>
                    <div>
                      <div className="font-medium">{p.label}</div>
                      <div className="mt-0.5 text-sm text-ink-2">{p.summary}</div>
                    </div>
                    <span className="label">{Math.round(p.weight * 100)}%</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <Card className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="label">Exhibit 01 · Sample report</div>
                    <div className="mt-1 font-medium">Example Plumbing, Prospect</div>
                  </div>
                  <span className="rounded-md bg-bad-soft px-2 py-0.5 text-xs font-medium text-bad">Named in 0 of 12</span>
                </div>
                <div className="mt-6 flex items-center gap-6">
                  <ScoreRing score={38} size={120} stroke={8} />
                  <div className="flex-1 space-y-3">
                    {([["AI visibility", 0], ["Structured data", 20], ["Name, address, phone", 64], ["Answer-first content", 41], ["Entity strength", 50], ["AI crawler access", 78]] as const).map(([l, s]) => (
                      <div key={l}>
                        <div className="mb-1 flex justify-between text-xs"><span className="text-ink-2">{l}</span><span className="tabular">{s}</span></div>
                        <ScoreBar score={s} />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-6 rounded-lg bg-paper p-4 text-sm">
                  <div className="label mb-2">Top fix</div>
                  Add a Plumber (LocalBusiness) JSON-LD block with name, address, phone, hours and service area.
                </div>
                <div className="label mt-4">Fictional business · real report layout</div>
              </Card>
            </div>
          </div>
        </section>

        {/* CATEGORIES */}
        <section className="border-y border-line bg-paper-2/60">
          <div className="mx-auto max-w-6xl px-5 py-20">
            <Label>Built for Adelaide's local businesses</Label>
            <h2 className="mt-3 max-w-2xl text-[34px] font-semibold leading-tight tracking-tight">The questions we track for your trade.</h2>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {categories.filter((c) => ["plumber", "electrician", "dentist", "physio", "cafe", "salon"].includes(c.id)).map((c) => (
                <Card key={c.id} className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{c.plural}</div>
                    <div className="label">{c.group}</div>
                  </div>
                  <ul className="mt-4 space-y-2">
                    {c.prompts.slice(0, 3).map((p) => (
                      <li key={p} className="rounded-md border border-line bg-paper px-3 py-2 font-mono text-[12px] leading-snug text-ink-2">
                        “{fillTemplate(p, ["Norwood", "Unley", "Glenelg", "Prospect", "Mawson Lakes", "Burnside"][c.prompts.indexOf(p) % 6])}”
                      </li>
                    ))}
                  </ul>
                </Card>
              ))}
            </div>
            <p className="mt-6 text-sm text-muted">Also: roofers, air conditioning, builders, landscapers, mechanics, beauty clinics, accountants.</p>
          </div>
        </section>

        {/* PRICING */}
        <section id="pricing" className="mx-auto max-w-6xl px-5 py-20">
          <Label>Pricing · AUD, GST inclusive</Label>
          <h2 className="mt-3 text-[34px] font-semibold leading-tight tracking-tight">Priced for local businesses, not enterprise.</h2>
          <p className="mt-3 max-w-2xl text-ink-2">Agencies charge $1,500+ a month for this. You get the same checks and fixes, scoped to a single location.</p>
          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {plans.map((p) => (
              <Card key={p.id} className={`relative flex flex-col p-6 ${p.featured ? "border-ink shadow-[0_20px_50px_-24px_rgba(16,24,40,.35)]" : ""}`}>
                {p.featured && <span className="label absolute -top-2.5 left-6 rounded bg-ink px-2 py-0.5 !text-white">Most chosen</span>}
                <div className="font-medium">{p.name}</div>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="tabular text-[40px] font-semibold tracking-tight">${p.price}</span>
                  <span className="text-sm text-muted">{p.interval === "once" ? "one-off" : "/month"}</span>
                </div>
                <p className="mt-2 text-sm text-ink-2">{p.blurb}</p>
                <ul className="mt-6 flex-1 space-y-2.5 text-sm">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-accent" />{f}</li>
                  ))}
                </ul>
                <LinkButton href={`/api/checkout?plan=${p.id}`} variant={p.featured ? "primary" : "secondary"} className="mt-8 w-full" prefetch={false}>
                  {p.interval === "once" ? "Get the Fix Pack" : `Start ${p.name}`} <ArrowRight size={15} />
                </LinkButton>
              </Card>
            ))}
          </div>
          <div className="mt-6 rounded-xl border border-dashed border-line-2 p-5 text-sm text-ink-2">
            <b className="text-ink">Pilot spots:</b> the first three businesses in each category get their first month of Visibility free in exchange for an honest testimonial. <a href="#audit" className="text-accent underline underline-offset-2">Start with the free audit.</a>
          </div>
        </section>

        {/* HONESTY */}
        <section className="border-y border-line bg-night text-white">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 md:grid-cols-[1fr_1.4fr]">
            <div>
              <div className="label !text-faint">Our promise</div>
              <h2 className="mt-3 text-[30px] font-semibold leading-tight tracking-tight">Evidence, not guarantees.</h2>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              {[
                ["We won't promise rankings.", "Nobody controls what an AI says. Anyone guaranteeing “#1 in ChatGPT” is guessing."],
                ["We will show the receipts.", "Every week: the exact questions, each engine's answer, and whether you were named."],
                ["You keep everything.", "Schema, copy, listings and pages we create are yours, even if you leave."],
                ["Plain English.", "No jargon reports. Each fix says what it is, why it matters and whether it's done."],
              ].map(([t, d]) => (
                <div key={t}>
                  <div className="font-medium">{t}</div>
                  <p className="mt-1 text-sm leading-relaxed text-[#a9b4c6]">{d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="mx-auto max-w-3xl px-5 py-20">
          <Label>FAQ</Label>
          <h2 className="mt-3 text-[34px] font-semibold leading-tight tracking-tight">Questions owners ask us.</h2>
          <div className="mt-8 divide-y divide-line border-y border-line">
            {faqs.map((f) => (
              <details key={f.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                  {f.q}
                  <span className="font-mono text-muted transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-[15px] leading-relaxed text-ink-2">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto mb-20 max-w-6xl px-5">
          <div className="grid-paper flex flex-col items-start justify-between gap-6 rounded-2xl border border-line bg-card p-10 md:flex-row md:items-center">
            <div>
              <h2 className="text-[28px] font-semibold tracking-tight">Find out what AI says about your business.</h2>
              <p className="mt-2 text-ink-2">Free, about 45 seconds, no sign-up.</p>
            </div>
            <LinkButton href="#audit" size="lg">Run the free audit <ArrowRight size={16} /></LinkButton>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
