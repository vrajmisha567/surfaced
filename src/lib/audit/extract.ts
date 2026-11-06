import "server-only";
import * as cheerio from "cheerio";
import type { Extracted } from "@/lib/types";
import { categories } from "@/lib/categories";
import { getCountry, isPlausiblePhone, normalisePhone as normaliseFor } from "@/lib/locale";

const SOCIAL_HOSTS = [
  "facebook.com", "instagram.com", "linkedin.com", "youtube.com", "tiktok.com", "x.com", "twitter.com", "pinterest.com",
  "google.com/maps", "maps.app.goo.gl", "g.page", "yelp.", "tripadvisor.", "foursquare.com", "nextdoor.com", "bbb.org",
  "angi.com", "houzz.", "thumbtack.com", "checkatrade.com", "trustatrader.com", "yell.com", "justdial.com", "practo.com",
  "zomato.com", "fresha.com", "treatwell.", "healthgrades.com", "zocdoc.com", "homestars.com",
  "hipages.com.au", "truelocal.com.au", "yellowpages.", "healthengine.com.au", "hotdoc.com.au", "oneflare.com.au",
];

const LOCAL_TYPES = new Set([
  "LocalBusiness", "MedicalBusiness", "MedicalClinic", "FoodEstablishment", "HealthAndBeautyBusiness",
  "AutomotiveBusiness", "ProfessionalService", "Store", "HomeAndConstructionBusiness", "SportsActivityLocation",
  "LodgingBusiness", "EntertainmentBusiness", "FinancialService", "LegalService", "EmergencyService", "ChildCare",
  "Physician", "Attorney", "Notary", "TravelAgency", "SelfStorage", "ShoppingCenter", "GolfCourse", "HealthClub",
  ...categories.map((c) => c.schemaType),
]);

export function isLocalType(t: string) {
  return LOCAL_TYPES.has(t);
}

/** AU phone numbers: 08 xxxx xxxx landlines, 04xx mobiles, 1300/1800, 13xx xx, +61 forms. */
const AU_PHONE_RE = /(?:\+?61[\s-]?|\(?0)(?:[2378]\)?[\s-]?\d{4}[\s-]?\d{4}|4\d{2}[\s-]?\d{3}[\s-]?\d{3})|1[38]00[\s-]?\d{3}[\s-]?\d{3}|13[\s-]?\d{2}[\s-]?\d{2}/g;
/**
 * Elsewhere: only shapes that are clearly phone numbers (international +, (area) code,
 * US 3-3-4, or trunk-0 national numbers), so years and prices don't get picked up.
 */
const INTL_PHONE_RE = /\+\d{1,3}[\s.-]?\(?\d{1,4}\)?(?:[\s.-]?\d{2,4}){2,4}|\(\d{2,4}\)[\s.-]?\d{3,4}[\s.-]?\d{3,4}|\b\d{3}[\s.-]\d{3}[\s.-]\d{4}\b|\b0\d{2,4}[\s.-]?\d{3,4}[\s.-]?\d{3,4}\b/g;

const SUFFIXES = [
  "St", "Street", "Rd", "Road", "Ave", "Avenue", "Tce", "Terrace", "Pde", "Parade", "Hwy", "Highway", "Dr", "Drive", "Ct", "Court",
  "Pl", "Place", "Lane", "Ln", "Way", "Cres", "Crescent", "Blvd", "Boulevard", "Sq", "Square", "Close", "Grove", "Row", "Walk",
  "Parkway", "Pkwy", "Circle", "Cir", "Trail", "Esplanade", "Esp", "Mews", "Gardens", "Quay", "Wharf",
];
// Title case or ALL CAPS ("22 CAMDEN HIGH STREET"), but not lowercase, so prose like "3 people walk" doesn't match.
const STREET = new RegExp(
  String.raw`\d{1,5}[A-Za-z]?\s+[A-Z][A-Za-z'.-]+(?:\s+[A-Z][A-Za-z'.-]+){0,3}\s+(?:${[...SUFFIXES, ...SUFFIXES.map((s) => s.toUpperCase())].join("|")})\b`,
);

function addressPattern(countryCode: string) {
  const pc = getCountry(countryCode).postcode;
  return pc ? new RegExp(`${STREET.source}[^<\n]{0,60}?${pc.source}`, "g") : new RegExp(`${STREET.source}[^<\n]{0,40}`, "g");
}

export function normalisePhone(p: string, countryCode?: string | null) {
  return normaliseFor(p, countryCode);
}

function flattenJsonLd(node: unknown, out: Record<string, unknown>[]) {
  if (!node) return;
  if (Array.isArray(node)) {
    node.forEach((n) => flattenJsonLd(n, out));
    return;
  }
  if (typeof node === "object") {
    const obj = node as Record<string, unknown>;
    if (obj["@graph"]) flattenJsonLd(obj["@graph"], out);
    if (obj["@type"]) out.push(obj);
  }
}

function typesOf(obj: Record<string, unknown>): string[] {
  const t = obj["@type"];
  return Array.isArray(t) ? t.map(String) : t ? [String(t)] : [];
}

export function extract(html: string, finalUrl: string, responseMs: number, renderer: "fetch" | "firecrawl", countryCode = "AU"): Extracted {
  const $ = cheerio.load(html);
  const country = getCountry(countryCode);
  const base = new URL(finalUrl);

  // JSON-LD
  const nodes: Record<string, unknown>[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).contents().text();
    try {
      flattenJsonLd(JSON.parse(raw), nodes);
    } catch {
      // Malformed JSON-LD is itself a finding; ignored here, caught by the schema check via empty types.
    }
  });
  // Microdata fallback
  $("[itemtype]").each((_, el) => {
    const it = $(el).attr("itemtype") ?? "";
    const t = it.split("/").pop();
    if (t) nodes.push({ "@type": t, __microdata: true });
  });

  const schemaTypes = [...new Set(nodes.flatMap(typesOf))];
  const schemaBusiness =
    nodes.find((n) => typesOf(n).some(isLocalType) && !n.__microdata) ??
    nodes.find((n) => typesOf(n).includes("Organization")) ??
    null;

  const sameAs = nodes.flatMap((n) => {
    const s = n.sameAs;
    return Array.isArray(s) ? s.map(String) : s ? [String(s)] : [];
  });

  const hasFaqSchema = schemaTypes.includes("FAQPage");

  // Text
  const $body = $("body").clone();
  $body.find("script,style,noscript,svg,iframe").remove();
  // Put a space after every element so neighbouring blocks don't glue together ("NW1 0JHinfo@...").
  $body.find("*").after(" ");
  const text = $body.text().replace(/\s+/g, " ").trim();
  const words = text ? text.split(" ").length : 0;

  const headings = $("h1,h2,h3")
    .map((_, el) => $(el).text().replace(/\s+/g, " ").trim())
    .get()
    .filter(Boolean);
  const h1 = $("h1").map((_, el) => $(el).text().replace(/\s+/g, " ").trim()).get().filter(Boolean);
  const questionHeadings = headings.filter((h) => /\?\s*$/.test(h) || /^(how|what|why|when|where|who|do|does|can|is|are|should)\b/i.test(h));

  // Links
  const links = $("a[href]").map((_, el) => $(el).attr("href") ?? "").get();
  const abs = links
    .map((h) => {
      try {
        return new URL(h, base).toString();
      } catch {
        return null;
      }
    })
    .filter((x): x is string => !!x);
  const internalLinks = [...new Set(abs.filter((u) => new URL(u).hostname === base.hostname).map((u) => u.split("#")[0]))];
  const socialLinks = [...new Set(abs.filter((u) => SOCIAL_HOSTS.some((s) => u.includes(s))))];

  const telLinks = links.filter((h) => h.startsWith("tel:")).map((h) => h.slice(4));
  const phoneMatches = text.match(country.code === "AU" ? AU_PHONE_RE : INTL_PHONE_RE) ?? [];
  const phones = [
    ...new Set([...telLinks, ...phoneMatches].map((p) => normalisePhone(p, country.code)).filter((p) => isPlausiblePhone(p, country.code))),
  ];
  const emails = [
    ...new Set([
      ...links.filter((h) => h.startsWith("mailto:")).map((h) => h.slice(7).split("?")[0]),
      ...(text.match(/[\w.+-]+@[\w-]+\.[\w.]+/g) ?? []),
    ]),
  ].slice(0, 5);

  const addresses = [...new Set((text.match(addressPattern(country.code)) ?? []).map((a) => a.trim()))].slice(0, 5);
  const postcodes = country.postcode ? [...new Set([...text.matchAll(country.postcode)].map((m) => m[1] ?? m[0]))].slice(0, 5) : [];

  const images = $("img").length;
  const imagesWithoutAlt = $("img").filter((_, el) => !($(el).attr("alt") ?? "").trim()).length;

  const hasFaq = hasFaqSchema || /frequently asked|faq/i.test(headings.join(" ")) || questionHeadings.length >= 3;

  return {
    finalUrl,
    title: $("title").first().text().trim(),
    metaDescription: $('meta[name="description"]').attr("content")?.trim() ?? "",
    h1,
    headings: headings.slice(0, 40),
    wordCount: words,
    phones,
    emails,
    addresses,
    postcodes,
    schemaTypes,
    schemaBusiness,
    sameAs: [...new Set(sameAs)],
    socialLinks,
    hasFaq,
    questionHeadings: questionHeadings.slice(0, 15),
    internalLinks: internalLinks.slice(0, 80),
    hasViewport: $('meta[name="viewport"]').length > 0,
    canonical: $('link[rel="canonical"]').attr("href") ?? null,
    robotsMeta: $('meta[name="robots"]').attr("content") ?? null,
    lang: $("html").attr("lang") ?? null,
    imagesWithoutAlt,
    images,
    hasReviewsMention: /reviews?|testimonials?|★|stars?\b|rated \d/i.test(text),
    hasBizId: country.businessId ? country.businessId.pattern.test(text) : undefined,
    bizIdLabel: country.businessId?.label,
    responseMs,
    https: base.protocol === "https:",
    usedRenderer: renderer,
    textSample: text.slice(0, 4000),
  };
}
