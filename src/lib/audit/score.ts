import type { AuditInput, Check, CrawlerAccess, EngineAnswer, Extracted, Pillar, PillarKey } from "@/lib/types";
import { getCategory } from "@/lib/categories";
import { isLocalType, normalisePhone } from "./extract";
import { norm } from "@/lib/ai/visibility";

export const pillarMeta: Record<PillarKey, { label: string; summary: string; weight: number }> = {
  ai: { label: "AI visibility", summary: "Do ChatGPT, Gemini, Perplexity and Claude name you when locals ask?", weight: 0.25 },
  schema: { label: "Structured data", summary: "Machine-readable facts about your business that AI engines trust.", weight: 0.15 },
  nap: { label: "Name, address, phone", summary: "The same business details everywhere, so engines know it's you.", weight: 0.15 },
  content: { label: "Answer-first content", summary: "Pages that answer the exact questions customers ask.", weight: 0.15 },
  entity: { label: "Entity strength", summary: "Proof you're a real, established local business.", weight: 0.15 },
  crawl: { label: "AI crawler access", summary: "Whether AI crawlers are allowed in and can read your site.", weight: 0.15 },
};

function score(checks: Check[]) {
  const total = checks.reduce((s, c) => s + c.weight, 0);
  if (!total) return 0;
  const got = checks.reduce((s, c) => s + c.weight * (c.status === "pass" ? 1 : c.status === "warn" ? 0.5 : 0), 0);
  return Math.round((got / total) * 100);
}

function c(id: string, label: string, ok: boolean | "warn", weight: number, detail: string, fix?: string): Check {
  return { id, label, status: ok === true ? "pass" : ok === "warn" ? "warn" : "fail", detail, fix: ok === true ? undefined : fix, weight };
}

export function scoreSchema(x: Extracted, input: AuditInput): Pillar {
  const cat = getCategory(input.category);
  const biz = x.schemaBusiness;
  const types = x.schemaTypes;
  const hasLocal = types.some(isLocalType);
  const has = (k: string) => !!biz && biz[k] != null && biz[k] !== "";
  const specific = types.includes(cat.schemaType);
  const checks: Check[] = [
    c("schema-any", "Any structured data", types.length > 0, 1,
      types.length ? `Found: ${types.slice(0, 6).join(", ")}` : "No JSON-LD or microdata on the homepage.",
      "Add JSON-LD structured data. Surfaced generates it for you in the Fix Pack."),
    c("schema-local", "LocalBusiness schema", hasLocal, 3,
      hasLocal ? "A LocalBusiness-type entity is present." : "Nothing tells engines this is a local business.",
      `Add a ${cat.schemaType} (LocalBusiness) JSON-LD block with name, address, phone, hours and service area.`),
    c("schema-specific", `Specific type (${cat.schemaType})`, specific ? true : hasLocal ? "warn" : false, 1,
      specific ? `Uses ${cat.schemaType}.` : `Generic type used instead of ${cat.schemaType}.`,
      `Change @type to "${cat.schemaType}" so engines match you to ${cat.plural.toLowerCase()} questions.`),
    c("schema-address", "Address in schema", has("address"), 2, has("address") ? "Address present." : "No postal address in schema.",
      "Add a PostalAddress with streetAddress, addressLocality, addressRegion SA and postalCode."),
    c("schema-phone", "Phone in schema", has("telephone"), 1, has("telephone") ? "Phone present." : "No telephone in schema.", "Add telephone in +61 format."),
    c("schema-hours", "Opening hours", has("openingHoursSpecification") || has("openingHours"), 1,
      has("openingHoursSpecification") || has("openingHours") ? "Hours present." : "No opening hours in schema.",
      "Add openingHoursSpecification. 'Open now' questions rely on it."),
    c("schema-area", "Service area", has("areaServed") || has("geo"), 1,
      has("areaServed") || has("geo") ? "Service area or coordinates present." : "No areaServed or geo coordinates.",
      "List the suburbs you serve in areaServed and add geo coordinates."),
    c("schema-sameas", "sameAs profile links", x.sameAs.length >= 2 ? true : x.sameAs.length === 1 ? "warn" : false, 1,
      x.sameAs.length ? `${x.sameAs.length} profile link(s).` : "No sameAs links connecting your profiles.",
      "Add sameAs links to your Google Business Profile, Facebook, Instagram and directory listings."),
    c("schema-rating", "Review rating", has("aggregateRating") ? true : "warn", 1,
      has("aggregateRating") ? "AggregateRating present." : "No rating in schema (only add one if reviews are shown on your site).",
      "If your site displays genuine reviews, mark them up with aggregateRating."),
    c("schema-faq", "FAQ schema", types.includes("FAQPage") ? true : "warn", 1,
      types.includes("FAQPage") ? "FAQPage present." : "No FAQPage markup.",
      "Mark up your FAQ section with FAQPage schema."),
  ];
  return { key: "schema", ...pillarMeta.schema, score: score(checks), checks };
}

export function scoreNap(x: Extracted, input: AuditInput): Pillar {
  const biz = x.schemaBusiness;
  const schemaPhone = biz?.telephone ? normalisePhone(String(biz.telephone)) : null;
  const schemaName = biz?.name ? String(biz.name) : null;
  const nameOnPage = norm(x.textSample).includes(norm(input.businessName)) || norm(x.title).includes(norm(input.businessName));
  const phoneConsistent = !schemaPhone || x.phones.length === 0 || x.phones.includes(schemaPhone);
  const suburbMentioned = !!input.suburb && norm(x.textSample + " " + x.title).includes(norm(input.suburb));
  const checks: Check[] = [
    c("nap-name", "Business name on page", nameOnPage, 2,
      nameOnPage ? `"${input.businessName}" appears on the homepage.` : `"${input.businessName}" doesn't appear as written on the homepage.`,
      "Use your exact trading name, the same as on Google, in the header, footer and title tag."),
    c("nap-name-schema", "Schema name matches", !schemaName ? "warn" : norm(schemaName).includes(norm(input.businessName)) || norm(input.businessName).includes(norm(schemaName)), 1,
      schemaName ? `Schema says "${schemaName}".` : "No name in schema to compare.",
      "Make the schema name match your Google Business Profile name exactly."),
    c("nap-phone", "Phone number visible", x.phones.length > 0, 2,
      x.phones.length ? `Found ${x.phones.slice(0, 3).join(", ")}` : "No phone number found in text or tel: links.",
      "Show a clickable phone number (tel: link) in the header and footer of every page."),
    c("nap-phone-consistent", "One consistent phone", x.phones.length <= 2 && phoneConsistent ? true : "warn", 1,
      x.phones.length > 2 ? `${x.phones.length} different numbers on one page confuse engines.` : phoneConsistent ? "Phone numbers are consistent." : "Schema phone differs from the page.",
      "Pick one primary number and use it everywhere, including directories."),
    c("nap-address", "Street address visible", x.addresses.length > 0 ? true : x.postcodes.length ? "warn" : false, 2,
      x.addresses.length ? x.addresses[0] : x.postcodes.length ? `Postcode ${x.postcodes[0]} found, but no full street address.` : "No South Australian address found.",
      "Show your full street address (or 'servicing [suburbs]' if you're mobile) in the footer."),
    c("nap-suburb", `Mentions ${input.suburb || "your suburb"}`, suburbMentioned, 1,
      suburbMentioned ? `Homepage mentions ${input.suburb}.` : `Homepage never mentions ${input.suburb}.`,
      `Say where you work in plain words: "${getCategory(input.category).label} in ${input.suburb} and surrounding suburbs".`),
    c("nap-email", "Contact email", x.emails.length > 0 ? true : "warn", 0.5, x.emails.length ? x.emails[0] : "No email address found.", "Add a contact email."),
  ];
  return { key: "nap", ...pillarMeta.nap, score: score(checks), checks };
}

export function scoreContent(x: Extracted, input: AuditInput): Pillar {
  const cat = getCategory(input.category);
  const h1 = x.h1[0] ?? "";
  const h1Local = !!h1 && (norm(h1).includes(norm(cat.label).split(" ")[0]) || norm(h1).includes(norm(input.suburb)) || norm(h1).includes("adelaide"));
  const titleLocal = /adelaide|\bsa\b/i.test(x.title) || (input.suburb && norm(x.title).includes(norm(input.suburb)));
  const servicePages = x.internalLinks.filter((u) => /service|plumb|electric|roof|repair|install|treat|menu|book|price|cost|faq/i.test(u)).length;
  const checks: Check[] = [
    c("content-h1", "One clear H1", x.h1.length === 1 ? true : x.h1.length > 1 ? "warn" : false, 1,
      x.h1.length ? `H1: "${h1.slice(0, 90)}"${x.h1.length > 1 ? ` (+${x.h1.length - 1} more)` : ""}` : "No H1 heading.",
      `Use one H1 that says what you do and where, e.g. "${cat.label} in ${input.suburb || "Adelaide"}".`),
    c("content-h1-local", "H1 states service + place", h1Local, 2,
      h1Local ? "The main heading names your service or location." : "The main heading doesn't say what you do or where.",
      `Rewrite the H1 to answer "what and where" in one line.`),
    c("content-title", "Title mentions location", !!titleLocal, 1, x.title ? `Title: "${x.title.slice(0, 80)}"` : "No title tag.",
      `Title format: "${cat.label} ${input.suburb || "Adelaide"} | ${input.businessName}".`),
    c("content-meta", "Meta description", x.metaDescription.length >= 70 ? true : x.metaDescription ? "warn" : false, 1,
      x.metaDescription ? `${x.metaDescription.length} characters.` : "Missing.",
      "Write a 120-155 character description that answers who you are, what you do and where."),
    c("content-faq", "FAQ section", x.hasFaq, 2,
      x.hasFaq ? "FAQ content found." : "No FAQ section. AI engines lift answers straight from FAQs.",
      `Add 5-8 FAQs locals actually ask, e.g. "${cat.faqs[0]?.replace("{suburb}", input.suburb || "Adelaide").replace("{city}", "Adelaide")}"`),
    c("content-questions", "Question-style headings", x.questionHeadings.length >= 3 ? true : x.questionHeadings.length ? "warn" : false, 1,
      `${x.questionHeadings.length} heading(s) phrased as questions.`,
      "Phrase some H2s as the questions customers ask, and answer in the first sentence below."),
    c("content-depth", "Enough content to quote", x.wordCount >= 600 ? true : x.wordCount >= 250 ? "warn" : false, 1,
      `${x.wordCount.toLocaleString()} words on the homepage.`,
      "Thin pages give engines nothing to cite. Aim for 600+ useful words on key pages."),
    c("content-services", "Dedicated service pages", servicePages >= 3 ? true : servicePages ? "warn" : false, 1,
      `${servicePages} internal link(s) that look like service, pricing or FAQ pages.`,
      "Give each main service its own page with pricing guidance and FAQs."),
  ];
  return { key: "content", ...pillarMeta.content, score: score(checks), checks };
}

export function scoreEntity(x: Extracted): Pillar {
  const gbp = [...x.socialLinks, ...x.sameAs].some((u) => /google\.com\/maps|maps\.app\.goo\.gl|g\.page|business\.google/i.test(u));
  const socials = new Set([...x.socialLinks, ...x.sameAs].map((u) => {
    try {
      return new URL(u).hostname.replace(/^www\./, "");
    } catch {
      return u;
    }
  }));
  const about = x.internalLinks.some((u) => /about|our-story|team|who-we-are/i.test(u));
  const checks: Check[] = [
    c("entity-gbp", "Links to Google Business Profile", gbp, 2, gbp ? "Google Maps / Business Profile link found." : "No link to your Google Business Profile.",
      "Link your Google Business Profile from the site and from sameAs schema."),
    c("entity-social", "Social and directory profiles", socials.size >= 3 ? true : socials.size ? "warn" : false, 2,
      socials.size ? `${socials.size} profile(s): ${[...socials].slice(0, 5).join(", ")}` : "No social or directory links.",
      "Link 3+ active profiles (Facebook, Instagram, LinkedIn, trade directories)."),
    c("entity-about", "About page", about, 1, about ? "About/team page linked." : "No About page linked from the homepage.",
      "Add an About page with the owner's name, years operating and licences. Engines weigh real people."),
    c("entity-reviews", "Reviews or testimonials shown", x.hasReviewsMention, 2, x.hasReviewsMention ? "Reviews or testimonials mentioned." : "No reviews or testimonials on the homepage.",
      "Show recent Google reviews on the homepage, with the reviewer's first name and suburb."),
    c("entity-abn", "ABN displayed", x.hasAbn ? true : "warn", 1, x.hasAbn ? "ABN shown." : "No ABN found.", "Show your ABN in the footer. It's a strong legitimacy signal in Australia."),
    c("entity-org", "Organisation identity in schema", !!x.schemaBusiness, 1, x.schemaBusiness ? "Business entity defined in schema." : "No business entity in schema.",
      "Define your business once in schema with logo, founder and founding date."),
  ];
  return { key: "entity", ...pillarMeta.entity, score: score(checks), checks };
}

export function scoreCrawl(x: Extracted, cr: CrawlerAccess): Pillar {
  const noindex = /noindex/i.test(x.robotsMeta ?? "");
  const checks: Check[] = [
    c("crawl-ai-bots", "AI crawlers allowed", cr.blocked.length === 0 ? true : cr.blocked.length <= 2 ? "warn" : false, 3,
      cr.blocked.length ? `Blocked: ${cr.blocked.join(", ")}` : "No AI crawlers are blocked in robots.txt.",
      "Remove Disallow rules for GPTBot, OAI-SearchBot, PerplexityBot, ClaudeBot and Google-Extended."),
    c("crawl-noindex", "Page is indexable", !noindex, 3, noindex ? "The homepage has a noindex robots meta tag." : "No noindex tag.", "Remove the noindex meta tag."),
    c("crawl-llms", "llms.txt file", cr.llmsTxt ? true : "warn", 1, cr.llmsTxt ? "llms.txt found." : "No /llms.txt.",
      "Publish an llms.txt summarising your business, services and key pages. Surfaced writes it for you."),
    c("crawl-sitemap", "XML sitemap", cr.sitemap, 1, cr.sitemap ? "Sitemap found." : "No sitemap.xml found.", "Publish a sitemap and reference it in robots.txt."),
    c("crawl-https", "HTTPS", x.https, 1, x.https ? "Served over HTTPS." : "Not served over HTTPS.", "Enable HTTPS."),
    c("crawl-ssr", "Readable without JavaScript", x.usedRenderer === "fetch" && x.wordCount >= 150 ? true : x.wordCount >= 150 ? "warn" : false, 2,
      x.usedRenderer === "firecrawl" ? "Content only appears after JavaScript runs. Many AI crawlers don't run JavaScript." : `${x.wordCount} words readable in raw HTML.`,
      "Make sure key text is in the HTML the server sends, not injected by JavaScript."),
    c("crawl-speed", "Server response time", x.responseMs < 1500 ? true : x.responseMs < 4000 ? "warn" : false, 1, `${(x.responseMs / 1000).toFixed(1)}s to load the homepage HTML.`,
      "Slow responses get dropped by crawlers on a time budget. Aim for under 1.5s."),
    c("crawl-mobile", "Mobile viewport", x.hasViewport, 0.5, x.hasViewport ? "Viewport tag present." : "No mobile viewport tag.", "Add a responsive viewport meta tag."),
    c("crawl-alt", "Image alt text", x.images === 0 || x.imagesWithoutAlt / x.images < 0.3 ? true : "warn", 0.5,
      `${x.imagesWithoutAlt} of ${x.images} images have no alt text.`, "Describe images with alt text, e.g. 'Plumber fixing hot water system in Norwood'."),
  ];
  return { key: "crawl", ...pillarMeta.crawl, score: score(checks), checks };
}

export function scoreAi(answers: EngineAnswer[], measured: boolean): Pillar {
  if (!measured) {
    return {
      key: "ai",
      ...pillarMeta.ai,
      score: null,
      checks: [
        {
          id: "ai-unmeasured",
          label: "Live AI checks",
          status: "info",
          detail: "Live engine checks aren't switched on for this audit. Your score is based on the five site factors that decide whether engines can cite you.",
          weight: 0,
        },
      ],
    };
  }
  const ok = answers.filter((a) => !a.error);
  const hits = ok.filter((a) => a.mentioned);
  const rate = ok.length ? hits.length / ok.length : 0;
  const top3 = hits.filter((a) => a.position !== null && a.position <= 3).length;
  const engines = [...new Set(ok.map((a) => a.engine))];
  const enginesWithHit = new Set(hits.map((a) => a.engine));
  const checks: Check[] = [
    {
      id: "ai-rate",
      label: "Named in AI answers",
      status: rate >= 0.5 ? "pass" : rate > 0 ? "warn" : "fail",
      detail: `Named in ${hits.length} of ${ok.length} answers.`,
      fix: rate >= 0.5 ? undefined : "Fix the site factors below, then build citations on the directories engines read.",
      weight: 3,
    },
    {
      id: "ai-top3",
      label: "Ranked in the top 3",
      status: top3 >= Math.max(1, ok.length / 3) ? "pass" : top3 > 0 ? "warn" : "fail",
      detail: `${top3} answer(s) placed you in the top 3.`,
      fix: "Being listed first comes from review volume, consistent citations and answer-first pages.",
      weight: 2,
    },
    {
      id: "ai-coverage",
      label: "Engines that know you",
      status: enginesWithHit.size === engines.length ? "pass" : enginesWithHit.size > 0 ? "warn" : "fail",
      detail: `${enginesWithHit.size} of ${engines.length} engines named you at least once.`,
      fix: "Each engine reads different sources. Gemini leans on Google Business Profile; ChatGPT and Claude on Bing and directories; Perplexity on review sites.",
      weight: 1,
    },
  ];
  return { key: "ai", ...pillarMeta.ai, score: score(checks), checks };
}

export function overallScore(pillars: Pillar[]) {
  const measured = pillars.filter((p) => p.score !== null);
  const totalWeight = measured.reduce((s, p) => s + pillarMeta[p.key].weight, 0);
  const v = measured.reduce((s, p) => s + (p.score ?? 0) * pillarMeta[p.key].weight, 0) / (totalWeight || 1);
  return Math.round(v);
}

export function gradeFor(score: number): "A" | "B" | "C" | "D" | "F" {
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 55) return "C";
  if (score >= 40) return "D";
  return "F";
}
