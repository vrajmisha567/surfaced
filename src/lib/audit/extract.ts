import "server-only";
import * as cheerio from "cheerio";
import type { Extracted } from "@/lib/types";

const SOCIAL_HOSTS = [
  "facebook.com",
  "instagram.com",
  "linkedin.com",
  "youtube.com",
  "tiktok.com",
  "x.com",
  "twitter.com",
  "pinterest.com",
  "google.com/maps",
  "maps.app.goo.gl",
  "g.page",
  "yelp.com",
  "hipages.com.au",
  "truelocal.com.au",
  "yellowpages.com.au",
];

const LOCAL_TYPES = new Set([
  "LocalBusiness", "Plumber", "Electrician", "RoofingContractor", "HVACBusiness", "GeneralContractor",
  "HomeAndConstructionBusiness", "Dentist", "Physiotherapy", "MedicalBusiness", "MedicalClinic",
  "CafeOrCoffeeShop", "Restaurant", "FoodEstablishment", "HairSalon", "BeautySalon", "HealthAndBeautyBusiness",
  "AutoRepair", "AutomotiveBusiness", "AccountingService", "ProfessionalService", "Store", "Locksmith",
  "MovingCompany", "HousePainter", "DaySpa", "NailSalon", "Optician", "Bakery", "BarOrPub",
]);

export function isLocalType(t: string) {
  return LOCAL_TYPES.has(t);
}

/** AU phone numbers: 08 xxxx xxxx (SA landline), 04xx mobiles, 1300/1800, +61 forms. */
const PHONE_RE = /(?:\+?61[\s-]?|\(?0)(?:[2378]\)?[\s-]?\d{4}[\s-]?\d{4}|4\d{2}[\s-]?\d{3}[\s-]?\d{3})|1[38]00[\s-]?\d{3}[\s-]?\d{3}|13[\s-]?\d{2}[\s-]?\d{2}/g;
const SA_ADDRESS_RE = /\d{1,5}[A-Za-z]?\s+[A-Z][A-Za-z'.-]+(?:\s+[A-Z][A-Za-z'.-]+){0,3}\s+(?:St|Street|Rd|Road|Ave|Avenue|Tce|Terrace|Pde|Parade|Hwy|Highway|Dr|Drive|Ct|Court|Pl|Place|Lane|Ln|Way|Cres|Crescent|Blvd|Boulevard)\b[^<\n]{0,60}?\b(?:SA|South Australia)\s*5\d{3}/g;
const POSTCODE_RE = /\b(?:SA|South Australia)\s*(5\d{3})\b/g;

export function normalisePhone(p: string) {
  let d = p.replace(/[^\d+]/g, "");
  if (d.startsWith("+61")) d = "0" + d.slice(3);
  if (d.startsWith("61") && d.length === 11) d = "0" + d.slice(2);
  return d;
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

export function extract(html: string, finalUrl: string, responseMs: number, renderer: "fetch" | "firecrawl"): Extracted {
  const $ = cheerio.load(html);
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
  const phones = [...new Set([...telLinks, ...(text.match(PHONE_RE) ?? [])].map(normalisePhone).filter((p) => p.length === 10 || (p.length === 6 && p.startsWith("13"))))];
  const emails = [
    ...new Set([
      ...links.filter((h) => h.startsWith("mailto:")).map((h) => h.slice(7).split("?")[0]),
      ...(text.match(/[\w.+-]+@[\w-]+\.[\w.]+/g) ?? []),
    ]),
  ].slice(0, 5);

  const addresses = [...new Set(text.match(SA_ADDRESS_RE) ?? [])].slice(0, 5);
  const postcodes = [...new Set([...text.matchAll(POSTCODE_RE)].map((m) => m[1]))];

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
    hasAbn: /\bABN\b[:\s]*\d{2}\s?\d{3}\s?\d{3}\s?\d{3}/i.test(text),
    responseMs,
    https: base.protocol === "https:",
    usedRenderer: renderer,
    textSample: text.slice(0, 4000),
  };
}
