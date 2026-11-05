import "server-only";
import type { AuditResult, FixItem } from "@/lib/types";
import { fillTemplate, getCategory } from "@/lib/categories";
import { writeText } from "@/lib/ai/engines";
import { normalisePhone } from "@/lib/audit/extract";

export type FixPack = {
  schema: string;
  llmsTxt: string;
  robotsTxt: string;
  faqs: { q: string; a: string }[];
  faqSchema: string;
  gbpChecklist: string[];
  directories: string[];
  fixes: FixItem[];
  aiWritten: boolean;
};

function intlPhone(p?: string) {
  if (!p) return undefined;
  const d = normalisePhone(p);
  return d.startsWith("0") ? `+61 ${d.slice(1)}` : d;
}

/** When there's no LocalBusiness schema at all, one "add schema" fix covers all of these. */
const COVERED_BY_LOCAL_SCHEMA = ["schema-any", "schema-specific", "schema-address", "schema-phone", "schema-hours", "schema-area", "schema-sameas", "schema-rating", "entity-org", "nap-name-schema"];

export function fixesFromAudit(r: AuditResult): FixItem[] {
  const noLocal = r.pillars.some((p) => p.checks.some((c) => c.id === "schema-local" && c.status === "fail"));
  return r.pillars
    .flatMap((p) => p.checks.filter((c) => (c.status === "fail" || c.status === "warn") && c.fix).map((c) => ({ c, p })))
    .filter(({ c }) => !(noLocal && COVERED_BY_LOCAL_SCHEMA.includes(c.id)))
    .sort((a, b) => b.c.weight - a.c.weight || (a.c.status === "fail" ? -1 : 1))
    .map(({ c, p }) => ({ id: c.id, title: c.fix!, pillar: p.key, done: false, done_at: null }));
}

export async function buildFixPack(r: AuditResult, opts: { useAi?: boolean } = {}): Promise<FixPack> {
  const { input, extracted: x } = r;
  const cat = getCategory(input.category);
  const origin = new URL(x?.finalUrl ?? input.url).origin;
  const existing = (x?.schemaBusiness ?? {}) as Record<string, unknown>;
  const phone = intlPhone((existing.telephone as string) ?? x?.phones[0]);
  const address = x?.addresses[0];
  const postcode = x?.postcodes[0];

  const schemaObj = {
    "@context": "https://schema.org",
    "@type": cat.schemaType,
    "@id": `${origin}/#business`,
    name: input.businessName,
    url: origin,
    telephone: phone ?? "+61 8 XXXX XXXX",
    email: x?.emails[0],
    image: (existing.image as string) ?? `${origin}/og-image.jpg`,
    logo: (existing.logo as string) ?? `${origin}/logo.png`,
    priceRange: (existing.priceRange as string) ?? "$$",
    address: {
      "@type": "PostalAddress",
      streetAddress: address ? address.replace(/,?\s*(?:[A-Z][a-z]+\s*)*(?:SA|South Australia)\s*5\d{3}.*$/, "").trim() : "[street address]",
      addressLocality: input.suburb || "Adelaide",
      addressRegion: "SA",
      postalCode: postcode ?? "5000",
      addressCountry: "AU",
    },
    areaServed: [input.suburb, "Adelaide"].filter(Boolean).map((name) => ({ "@type": "City", name })),
    openingHoursSpecification: [
      { "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], opens: "08:00", closes: "17:00" },
    ],
    sameAs: [...new Set([...(x?.sameAs ?? []), ...(x?.socialLinks ?? [])])].slice(0, 8),
  };
  const schema = `<script type="application/ld+json">\n${JSON.stringify(schemaObj, null, 2)}\n</script>`;

  const questions = cat.faqs.map((q) => fillTemplate(q, input.suburb));
  let faqs = questions.map((q) => ({ q, a: templateAnswer(q, input.businessName, input.suburb, cat.label) }));
  let aiWritten = false;

  if (opts.useAi) {
    const text = await writeText(
      "You write FAQ answers for small Australian local business websites. Answers are 2-3 sentences, plain Australian English, first sentence directly answers the question, no hype, no invented facts. Where a specific fact (price, hours, licence number) is unknown, write a bracketed placeholder like [price] for the owner to fill in. Return JSON only: [{\"q\":\"...\",\"a\":\"...\"}].",
      `Business: ${input.businessName}\nCategory: ${cat.label}\nSuburb: ${input.suburb}, Adelaide SA\nWebsite text excerpt:\n${(x?.textSample ?? "").slice(0, 2500)}\n\nQuestions:\n${questions.map((q, i) => `${i + 1}. ${q}`).join("\n")}`,
    );
    const parsed = parseFaqJson(text);
    if (parsed?.length) {
      faqs = parsed;
      aiWritten = true;
    }
  }

  const faqSchema = `<script type="application/ld+json">\n${JSON.stringify(
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
    null,
    2,
  )}\n</script>`;

  const servicePages = (x?.internalLinks ?? []).filter((u) => u !== origin && u !== `${origin}/`).slice(0, 8);
  const llmsTxt = [
    `# ${input.businessName}`,
    "",
    `> ${input.businessName} is a ${cat.label.toLowerCase()} based in ${input.suburb || "Adelaide"}, South Australia, serving ${input.suburb ? `${input.suburb} and` : ""} greater Adelaide.`,
    "",
    "## Contact",
    `- Phone: ${phone ?? "[phone]"}`,
    `- Website: ${origin}`,
    address ? `- Address: ${address}` : `- Service area: ${input.suburb || "Adelaide"} and surrounding suburbs`,
    "",
    "## Key pages",
    `- [Home](${origin}/): What we do and where`,
    ...servicePages.map((u) => `- [${prettyPath(u)}](${u})`),
    "",
    "## Frequently asked",
    ...faqs.slice(0, 5).map((f) => `- ${f.q} ${f.a}`),
    "",
  ].join("\n");

  const robotsTxt = [
    "# Allow AI answer engines to read and cite this site",
    "User-agent: GPTBot",
    "Allow: /",
    "",
    "User-agent: OAI-SearchBot",
    "Allow: /",
    "",
    "User-agent: ChatGPT-User",
    "Allow: /",
    "",
    "User-agent: PerplexityBot",
    "Allow: /",
    "",
    "User-agent: ClaudeBot",
    "Allow: /",
    "",
    "User-agent: Claude-SearchBot",
    "Allow: /",
    "",
    "User-agent: Google-Extended",
    "Allow: /",
    "",
    "User-agent: *",
    "Allow: /",
    "",
    `Sitemap: ${origin}/sitemap.xml`,
  ].join("\n");

  const gbpChecklist = [
    `Primary category set to "${cat.label}" (the most specific option Google offers)`,
    `Business name matches the website exactly: "${input.businessName}"`,
    "Phone number matches the website and schema",
    `Service area lists ${input.suburb || "your suburb"} and each nearby suburb you actually serve`,
    "Opening hours filled in, including public holiday hours",
    "Every service added with a 1-2 sentence description",
    "At least 10 recent photos (team, vans, work, premises)",
    "Q&A section seeded with the FAQs above",
    "Reply to every review, mentioning the service and suburb naturally",
    "Post an update at least once a fortnight",
    "Website link uses the homepage URL with no tracking clutter",
  ];

  return {
    schema,
    llmsTxt,
    robotsTxt,
    faqs,
    faqSchema,
    gbpChecklist,
    directories: cat.directories,
    fixes: fixesFromAudit(r),
    aiWritten,
  };
}

function prettyPath(u: string) {
  const p = new URL(u).pathname.replace(/\/$/, "").split("/").pop() ?? "";
  return p.replace(/[-_]/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()) || "Page";
}

function templateAnswer(q: string, name: string, suburb: string, label: string) {
  const s = suburb || "Adelaide";
  if (/cost|price|much/i.test(q)) return `${name} charges [price range] for most jobs in ${s}. We quote upfront before any work starts, so there are no surprises.`;
  if (/emergency|24\/7|after-hours|weekend/i.test(q)) return `Yes. ${name} takes urgent calls across ${s} and nearby suburbs [hours]. Call [phone] and we'll tell you when we can be there.`;
  if (/licen|insur|registered/i.test(q)) return `Yes. ${name} is fully licensed (licence [number]) and insured to work in South Australia.`;
  if (/suburb|area|service/i.test(q)) return `We work across ${s} and surrounding suburbs including [suburb list].`;
  if (/book|appointment/i.test(q)) return `Book online at [booking link] or call [phone]. Most appointments are available within [timeframe].`;
  return `${name} is a ${label.toLowerCase()} in ${s}. [Answer this in one or two plain sentences.]`;
}

function parseFaqJson(text: string | null) {
  if (!text) return null;
  const m = text.match(/\[[\s\S]*\]/);
  if (!m) return null;
  try {
    const arr = JSON.parse(m[0]) as { q?: string; a?: string }[];
    return arr.filter((f) => f.q && f.a).map((f) => ({ q: String(f.q), a: String(f.a) }));
  } catch {
    return null;
  }
}
