import type { AuditInput, Check, CrawlerAccess, EngineAnswer, Extracted, LocalPresence, Pillar, PillarKey, PageSpeed } from "@/lib/types";
import { faqsFor, getCategory } from "@/lib/categories";
import { getCountry, nearPlace, placeOf, shortPlace } from "@/lib/locale";
import { isLocalType, normalisePhone } from "./extract";
import { norm } from "@/lib/ai/visibility";

/**
 * Two groups. "visibility" is the outcome: are you named and ranked right now. "readiness" is the
 * website work that makes it last. Weights are within each group; the headline score is
 * 75% visibility + 25% readiness, so a business AI already ranks top 3 scores high.
 */
export const pillarMeta: Record<PillarKey, { label: string; summary: string; weight: number; group: "visibility" | "readiness" }> = {
  ai: { label: "AI answers", summary: "Do ChatGPT, Gemini, Perplexity and Claude name you when people ask?", weight: 0.5, group: "visibility" },
  local: { label: "Google Maps & reviews", summary: "Where you rank on Google Maps and how strong your reviews are. Gemini and Google's AI lean on this for local questions.", weight: 0.5, group: "visibility" },
  schema: { label: "Structured data", summary: "Machine-readable facts about your business that AI engines trust.", weight: 0.2, group: "readiness" },
  nap: { label: "Name, address, phone", summary: "The same business details everywhere, so engines know it's you.", weight: 0.2, group: "readiness" },
  content: { label: "Answer-first content", summary: "Pages that answer the exact questions customers ask.", weight: 0.2, group: "readiness" },
  entity: { label: "Entity strength", summary: "Proof you're a real, established local business.", weight: 0.2, group: "readiness" },
  crawl: { label: "Crawler access and speed", summary: "Whether AI crawlers can get in and read your site, and how fast it loads on a phone.", weight: 0.2, group: "readiness" },
};

export const VISIBILITY_SHARE = 0.75;

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
  // Custom business types have no specific schema.org type, so any LocalBusiness subtype counts.
  const generic = cat.schemaType === "LocalBusiness";
  const specific = generic ? hasLocal : types.includes(cat.schemaType);
  const blockName = generic ? "LocalBusiness" : `${cat.schemaType} (LocalBusiness)`;
  const checks: Check[] = [
    c("schema-any", "Any structured data", types.length > 0, 1,
      types.length ? `Found: ${types.slice(0, 6).join(", ")}` : "No JSON-LD or microdata on the homepage.",
      "Add JSON-LD structured data. Surfaced generates it for you in the Fix Pack."),
    c("schema-local", "LocalBusiness schema", hasLocal, 3,
      hasLocal ? "A LocalBusiness-type entity is present." : "Nothing tells engines this is a local business.",
      `Add a ${blockName} JSON-LD block with name, address, phone, hours and service area.`),
    generic
      ? c("schema-specific", "Business type in schema", hasLocal, 1,
          hasLocal ? `Uses ${types.find(isLocalType)}.` : "No business type set in schema.",
          "Use the most specific schema.org type that fits your business (see schema.org/LocalBusiness).")
      : c("schema-specific", `Specific type (${cat.schemaType})`, specific ? true : hasLocal ? "warn" : false, 1,
          specific ? `Uses ${cat.schemaType}.` : `Generic type used instead of ${cat.schemaType}.`,
          `Change @type to "${cat.schemaType}" so engines match you to ${cat.plural.toLowerCase()} questions.`),
    c("schema-address", "Address in schema", has("address"), 2, has("address") ? "Address present." : "No postal address in schema.",
      "Add a PostalAddress with streetAddress, addressLocality, addressRegion, postalCode and addressCountry."),
    c("schema-phone", "Phone in schema", has("telephone"), 1, has("telephone") ? "Phone present." : "No telephone in schema.",
      "Add telephone in international format, with the country code."),
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
  const place = placeOf(input);
  const schemaPhone = biz?.telephone ? normalisePhone(String(biz.telephone), place.country) : null;
  const schemaName = biz?.name ? String(biz.name) : null;
  const nameOnPage = norm(x.textSample).includes(norm(input.businessName)) || norm(x.title).includes(norm(input.businessName));
  const homePhones = x.homePhones ?? x.phones;
  const phoneConsistent = !schemaPhone || x.phones.length === 0 || x.phones.includes(schemaPhone);
  const where = nearPlace(place);
  const suburbMentioned = !!where && norm(x.textSample + " " + x.title).includes(norm(where));
  const areas = getCountry(place.country).areaWord === "suburb" ? "suburbs" : "areas";
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
    c("nap-phone-consistent", "One consistent phone", homePhones.length <= 2 && phoneConsistent ? true : "warn", 1,
      homePhones.length > 2 ? `${homePhones.length} different numbers on one page confuse engines.` : phoneConsistent ? "Phone numbers are consistent." : "Schema phone differs from the page.",
      "Pick one primary number and use it everywhere, including directories."),
    c("nap-address", "Street address visible", x.addresses.length > 0 ? true : x.postcodes.length ? "warn" : false, 2,
      x.addresses.length ? x.addresses[0] : x.postcodes.length ? `Postcode ${x.postcodes[0]} found, but no full street address.` : "No street address found.",
      "Show your full street address (or 'servicing [suburbs]' if you're mobile) in the footer."),
    c("nap-suburb", `Mentions ${where || "your area"}`, suburbMentioned, 1,
      suburbMentioned ? `Homepage mentions ${where}.` : `Homepage never mentions ${where}.`,
      `Say where you work in plain words: "${getCategory(input.category).label} in ${where} and surrounding ${areas}".`),
    c("nap-email", "Contact email", x.emails.length > 0 ? true : "warn", 0.5, x.emails.length ? x.emails[0] : "No email address found.", "Add a contact email."),
  ];
  return { key: "nap", ...pillarMeta.nap, score: score(checks), checks };
}

export function scoreContent(x: Extracted, input: AuditInput): Pillar {
  const cat = getCategory(input.category);
  const place = placeOf(input);
  const where = nearPlace(place);
  const inPlace = (s: string) => [place.area, place.city].some((p) => !!p && norm(s).includes(norm(p)));
  const h1 = x.h1[0] ?? "";
  const h1Local = !!h1 && (norm(h1).includes(norm(cat.label).split(" ")[0]) || inPlace(h1));
  const titleLocal = inPlace(x.title);
  const servicePages = x.internalLinks.filter((u) => /service|repair|install|treat|menu|book|price|cost|faq|class|lesson|product|shop|rates/i.test(u)).length;
  const checks: Check[] = [
    c("content-h1", "One clear H1", x.h1.length === 1 ? true : x.h1.length > 1 ? "warn" : false, 1,
      x.h1.length ? `H1: "${h1.slice(0, 90)}"${x.h1.length > 1 ? ` (+${x.h1.length - 1} more)` : ""}` : "No H1 heading.",
      `Use one H1 that says what you do and where, e.g. "${cat.label} in ${where}".`),
    c("content-h1-local", "H1 states service + place", h1Local, 2,
      h1Local ? "The main heading names your service or location." : "The main heading doesn't say what you do or where.",
      `Rewrite the H1 to answer "what and where" in one line.`),
    c("content-title", "Title mentions location", !!titleLocal, 1, x.title ? `Title: "${x.title.slice(0, 80)}"` : "No title tag.",
      `Title format: "${cat.label} in ${shortPlace(place)} | ${input.businessName}".`),
    c("content-meta", "Meta description", x.metaDescription.length >= 70 ? true : x.metaDescription ? "warn" : false, 1,
      x.metaDescription ? `${x.metaDescription.length} characters.` : "Missing.",
      "Write a 120-155 character description that answers who you are, what you do and where."),
    c("content-faq", "FAQ section", x.hasFaq, 2,
      x.hasFaq ? "FAQ content found." : "No FAQ section. AI engines lift answers straight from FAQs.",
      `Add 5-8 FAQs locals actually ask, e.g. "${faqsFor(cat, place)[0] ?? "How much does it cost?"}"`),
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

export function scoreEntity(x: Extracted, input: AuditInput): Pillar {
  const country = getCountry(placeOf(input).country);
  const hasId = x.hasBizId ?? x.hasAbn ?? false;
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
      "Link 3+ active profiles (Facebook, Instagram, LinkedIn, industry directories)."),
    c("entity-about", "About page", about, 1, about ? "About/team page linked." : "No About page linked from the homepage.",
      "Add an About page with the owner's name, years operating and licences. Engines weigh real people."),
    c("entity-reviews", "Reviews or testimonials shown", x.hasReviewsMention, 2, x.hasReviewsMention ? "Reviews or testimonials mentioned." : "No reviews or testimonials on the homepage.",
      "Show recent Google reviews on the homepage, with the reviewer's first name and area."),
    c("entity-org", "Organisation identity in schema", !!x.schemaBusiness, 1, x.schemaBusiness ? "Business entity defined in schema." : "No business entity in schema.",
      "Define your business once in schema with logo, founder and founding date."),
  ];
  // Only for countries with one common business ID (the US has no single equivalent, for example).
  const id = country.businessId;
  if (id) {
    const label = id.label.charAt(0).toUpperCase() + id.label.slice(1);
    checks.splice(4, 0, c(country.code === "AU" ? "entity-abn" : "entity-bizid", `${label} displayed`, hasId ? true : "warn", 1,
      hasId ? `${label} shown.` : `No ${id.label} found.`, id.tip));
  }
  return { key: "entity", ...pillarMeta.entity, score: score(checks), checks };
}

export function scoreCrawl(x: Extracted, cr: CrawlerAccess, speed?: PageSpeed | null): Pillar {
  const noindex = /noindex/i.test(x.robotsMeta ?? "");
  const checks: Check[] = [
    c("crawl-ai-bots", "AI crawlers allowed", cr.blocked.length === 0 ? true : cr.blocked.length <= 2 ? "warn" : false, 3,
      cr.blocked.length ? `Blocked: ${cr.blocked.join(", ")}` : "No AI crawlers are blocked in robots.txt.",
      "Remove Disallow rules for GPTBot, OAI-SearchBot, PerplexityBot, ClaudeBot and Google-Extended."),
    c("crawl-firewall", "Firewall lets crawlers in", !x.botBlocked, 3,
      x.botBlocked
        ? "Your server refused our crawler but served a normal browser. Firewalls that do this usually turn away ChatGPT, Perplexity and Claude's crawlers too."
        : "Our crawler was served normally.",
      "In your firewall or security plugin (Cloudflare bot settings, Wordfence, your host's WAF), allow verified AI crawlers: GPTBot, OAI-SearchBot, PerplexityBot, ClaudeBot."),
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
  if (speed) {
    // Real-visitor LCP when Google has it, otherwise the lab result.
    const lcp = speed.field?.lcpMs ?? speed.lcpMs;
    const ok = speed.score >= 70 || (speed.field?.lcpMs != null && speed.field.lcpMs <= 2500);
    const meh = speed.score >= 45;
    const sec = (v: number | null) => (v == null ? "?" : `${(v / 1000).toFixed(1)}s`);
    checks.push(
      c("crawl-pagespeed", "Fast on mobile", ok ? true : meh ? "warn" : false, 2,
        `Mobile speed score ${speed.score}/100. Main content shows in ${sec(lcp)}${speed.field?.lcpMs != null ? " for real visitors" : " in Google's test"}.`,
        "Compress and resize images, cut unused plugins and scripts, and use caching. Aim for the main content to show in under 2.5 seconds on a phone."),
    );
  }
  return { key: "crawl", ...pillarMeta.crawl, score: score(checks), checks };
}

export function scoreAi(answers: EngineAnswer[], measured: boolean): Pillar {
  // Only answers backed by a live search (web or Google Maps) are scored. From memory, a model names
  // a different list from the real assistant, so scoring it would mislead (top-3 businesses scored 19).
  const replied = answers.filter((a) => !a.error);
  const ok = replied.filter((a) => a.grounding !== "none");
  if (measured && replied.length && !ok.length) {
    return {
      key: "ai",
      ...pillarMeta.ai,
      score: null,
      checks: [
        {
          id: "ai-memory-only",
          label: "Live AI checks",
          status: "info",
          detail:
            "The AI couldn't search the web or Google Maps for this audit, so it answered from memory. Those answers are shown for reference but not scored, because they often differ from what the real assistant says.",
          weight: 0,
        },
      ],
    };
  }
  // Every engine call failed (bad key, no credits, outage): don't score the business 0 for our problem.
  if (!measured || !ok.length) {
    return {
      key: "ai",
      ...pillarMeta.ai,
      score: null,
      checks: [
        {
          id: "ai-unmeasured",
          label: "Live AI checks",
          status: "info",
          detail: measured
            ? "The AI engines didn't respond for this audit, so live answer checks were skipped. Your score uses Google Maps and your site instead."
            : "Live engine checks aren't switched on for this audit. Your score uses Google Maps and your site instead.",
          weight: 0,
        },
      ],
    };
  }
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

function groupScore(pillars: Pillar[], group: "visibility" | "readiness") {
  const measured = pillars.filter((p) => pillarMeta[p.key].group === group && p.score !== null);
  if (!measured.length) return null;
  const w = measured.reduce((s, p) => s + pillarMeta[p.key].weight, 0);
  return Math.round(measured.reduce((s, p) => s + (p.score ?? 0) * pillarMeta[p.key].weight, 0) / w);
}

/** Headline = 75% "visible now" + 25% "site readiness". Falls back to whichever half was measured. */
export function scoreSummary(pillars: Pillar[]) {
  const visibility = groupScore(pillars, "visibility");
  const readiness = groupScore(pillars, "readiness");
  const overall =
    visibility === null ? (readiness ?? 0) : readiness === null ? visibility : Math.round(VISIBILITY_SHARE * visibility + (1 - VISIBILITY_SHARE) * readiness);
  return { overall, visibility, readiness };
}

export function overallScore(pillars: Pillar[]) {
  return scoreSummary(pillars).overall;
}

export function scoreLocal(l: LocalPresence | null, error?: string): Pillar {
  const base = { key: "local" as const, ...pillarMeta.local };
  if (!l) {
    return {
      ...base,
      score: null,
      checks: [{ id: "local-unmeasured", label: "Google Maps checks", status: "info", detail: `Google Maps couldn't be checked for this audit${error ? `: ${error.replace(/\.$/, "").toLowerCase()}` : ""}. Your score uses the other areas.`, weight: 0 }],
    };
  }
  const q = `"${l.query}"`;
  const leaders = l.leaders.map((x) => x.name).join(", ");
  const leaderReviews = l.leaders.length ? Math.min(...l.leaders.map((x) => x.reviews)) : 100;
  const rating = l.rating ?? 0;
  const reviews = l.reviews ?? 0;
  // Newer audits rank from nine spots across the city; older ones from a single search.
  const spots = l.spots ?? 0;
  const share = spots ? (l.top3 ?? 0) / spots : null;
  const ranked = (l.grid ?? []).filter((g) => g.rank !== null).length;
  const rankCheck =
    share !== null
      ? c("local-rank", "Top 3 on Google Maps across the city", share >= 0.6 ? true : share > 0 || ranked >= Math.ceil(spots / 2) ? "warn" : false, 4,
          `Top 3 for ${q} from ${l.top3} of ${spots} spots across the city${ranked > (l.top3 ?? 0) ? `, top 20 from ${ranked}` : ""}.${share < 0.6 && leaders ? ` From the centre, the top 3 are ${leaders}.` : ""}`,
          "Climb the Maps results across the city, not just near your address: complete every field of your Google Business Profile, choose the most specific primary category, add every suburb you serve, and keep earning reviews that mention the service and suburb.")
      : c("local-rank", "Ranks on Google Maps", l.rank !== null && l.rank <= 3 ? true : l.rank !== null && l.rank <= 10 ? "warn" : false, 4,
          l.rank !== null ? `#${l.rank} on Google Maps for ${q}.` : `Not in the top 20 on Google Maps for ${q}.${leaders ? ` The top 3 are ${leaders}.` : ""}`,
          "Climb the Maps results: complete every field of your Google Business Profile, choose the most specific primary category, and keep earning reviews that mention the service and suburb.");
  const checks: Check[] = [
    rankCheck,
    c("local-profile", "Google Business Profile found", l.found, 1,
      l.found ? `Found "${l.name}" on Google Maps.` : "No Google Maps listing matched this business name and website.",
      "Claim and verify your Google Business Profile, using exactly the same name and website as your site."),
    c("local-rating", "Star rating", !l.found ? false : rating >= 4.6 ? true : rating >= 4 ? "warn" : false, 1.5,
      l.found ? (l.rating ? `${rating.toFixed(1)} stars on Google.` : "No Google rating yet.") : "No listing found, so no rating.",
      "Reply to every review and fix the issues behind low ones. Ask happy customers to review straight after the job."),
    c("local-reviews", "Number of reviews", reviews >= Math.max(100, leaderReviews) ? true : reviews >= 25 ? "warn" : false, 2,
      `${reviews} Google review${reviews === 1 ? "" : "s"}.${l.leaders.length ? ` The top 3 on Maps have at least ${leaderReviews}.` : ""}`,
      "Ask every happy customer for a Google review with a direct link (text it after the job). Volume and recency both count."),
    c("local-complete", "Profile has website and hours", l.found && l.hasWebsite && l.hasHours ? true : l.found ? "warn" : false, 0.5,
      l.found ? `Website ${l.hasWebsite ? "listed" : "missing"}, opening hours ${l.hasHours ? "listed" : "missing"}.` : "No listing found.",
      "Add your website and opening hours to your Google Business Profile."),
  ];
  return { ...base, score: score(checks), checks };
}

export function gradeFor(score: number): "A" | "B" | "C" | "D" | "F" {
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 55) return "C";
  if (score >= 40) return "D";
  return "F";
}
