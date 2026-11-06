import "server-only";
import type { EngineAnswer, EngineId } from "@/lib/types";
import { suburbs } from "@/lib/categories";
import type { Place } from "@/lib/locale";
import type { LocalListing } from "@/lib/places";
import { askEngine } from "./engines";

import { coreName, hostOf, hostOf as domainRoot, norm, similarName } from "@/lib/names";

/** The business being checked. aliases: other names it goes by, e.g. its Google Maps listing name. */
export type Business = { name: string; website?: string; aliases?: string[] };

export { norm, similarName };

/** Does this answer mention the business, by name or by linking its domain? */
export function mentions(answer: string, citations: { url: string }[], name: string, website?: string) {
  const a = ` ${norm(answer)} `;
  const full = norm(name);
  const core = coreName(name);
  if (full && a.includes(` ${full} `)) return true;
  if (core.length >= 5 && a.includes(` ${core} `)) return true;
  const host = domainRoot(website);
  if (host) {
    if (answer.toLowerCase().includes(host)) return true;
    if (citations.some((c) => domainRoot(c.url) === host)) return true;
  }
  return false;
}

const GENERIC = /^(cost|price|pricing|tips?|note|summary|conclusion|why|how|what|when|where|services?|reviews?|location|hours|contact|recommendation|recommendations|key|important|pros|cons|overview|factors|considerations?|emergency|availability|license|licensing|insurance|step \d|option \d|top picks?|best overall|budget|quick answer|best for|good for|known for|why them|why choose them|specialt(y|ies)|speciality|highlights?|website|phone|address|rating|google rating|area served|service area|reputation|experience)$/i;
// Places, so "**Unley (5061)**" or "Adelaide CBD" isn't counted as a rival business.
const PLACES = new Set(
  [
    ...suburbs, "Adelaide", "South Australia", "SA", "Australia", "Adelaide Hills", "Fleurieu Peninsula", "Barossa",
    // More metro suburbs that answers mention as headings.
    "Malvern", "Hawthorn", "Kensington", "Kensington Park", "Rose Park", "Toorak Gardens", "Glen Osmond", "Fullarton",
    "Wayville", "Millswood", "Kingswood", "Netherby", "Highgate", "Clarence Park", "Black Forest", "Plympton", "Edwardstown",
    "Marleston", "Richmond", "Thebarton", "Hindmarsh", "Bowden", "Brompton", "Croydon", "Woodville", "Seaton", "Grange",
    "Fulham", "Glenelg North", "Somerton Park", "Hove", "Seacliff", "Hallett Cove", "Reynella", "Christies Beach", "Seaford",
    "Happy Valley", "Aberfoyle Park", "Flagstaff Hill", "Belair", "Eden Hills", "Pasadena", "St Marys", "Felixstow",
    "Paradise", "Athelstone", "Rostrevor", "Newton", "Hectorville", "Tranmere", "Beulah Park", "Stepney", "Maylands",
    "Marden", "Klemzig", "Windsor Gardens", "Gilles Plains", "Enfield", "Kilburn", "Nailsworth", "Broadview", "Medindie",
    "Fitzroy", "Ovingham", "Collinswood", "Wynn Vale", "Greenwith", "Para Hills", "Ingle Farm", "Munno Para", "Craigmore",
    "Inner South", "Inner North", "Eastern Suburbs", "Western Suburbs", "Northern Suburbs", "Southern Suburbs",
    // Regulators, platforms and review sites that answers cite but aren't competitors.
    "Consumer and Business Services", "CBS", "ACCC", "Google", "Google Maps", "Google Reviews", "Google Business Profile",
    "ProductReview", "ProductReview.com.au", "Word of Mouth", "WOMO", "hipages", "Yelp", "Oneflare", "Airtasker",
    "Facebook", "Instagram", "Reddit", "Trustpilot", "TripAdvisor", "Yelp", "Better Business Bureau", "BBB", "Angi", "Angie's List",
    "Thumbtack", "HomeAdvisor", "Houzz", "Nextdoor", "Checkatrade", "TrustATrader", "Yell", "Justdial", "Practo", "Zomato",
    "Zocdoc", "Healthgrades", "OpenTable", "Treatwell", "Fresha", "Booksy", "NHS", "Master Plumbers Association", "Master Builders SA", "Master Electricians Australia", "Healthdirect", "AHPRA",
  ].map((p) => norm(p)),
);
const SMALL_WORDS = new Set(["and", "&", "of", "the", "for", "in", "at", "by"]);

/** Pull business names out of a typical "here are the best X" answer. */
export function extractNames(answer: string): string[] {
  const names: string[] = [];
  const push = (raw: string) => {
    // "**Best for:**" style labels end in a colon; real names don't.
    if (/:\s*$/.test(raw.replace(/[*_`]/g, ""))) return;
    const n = raw
      .replace(/\[(.*?)\]\(.*?\)/g, "$1")
      .replace(/[*_`#]/g, "")
      .replace(/\s*[\(\[].*$/, "")
      .replace(/\s*[–—:|-]\s.*$/, "")
      .replace(/[.,:;]+$/, "")
      .trim();
    if (n.length < 3 || n.length > 60) return;
    if (GENERIC.test(n) || PLACES.has(norm(n))) return;
    // Category headings like "Highly Rated Local & Independent Plumbers" or "Top Electricians".
    if (/^(highly|top|best|other|more|local|independent|trusted|recommended|reputable|popular)\b/i.test(n) && /s$/i.test(n)) return;
    if (n.split(" ").length > 8) return;
    if (!/[A-Z]/.test(n[0] ?? "")) return;
    // Business names are title case; "CCTV drain cameras" is a phrase, not a business.
    const words = n.split(/\s+/).filter((w) => !SMALL_WORDS.has(w.toLowerCase()));
    if (words.length > 1 && words.filter((w) => /^[a-z]/.test(w)).length * 2 >= words.length) return;
    if (!names.some((x) => norm(x) === norm(n))) names.push(n);
  };
  for (const m of answer.matchAll(/\*\*([^*\n]{3,80})\*\*/g)) push(m[1]);
  for (const m of answer.matchAll(/^\s*(?:\d+[.)]|[-•*])\s+([^\n]{3,90})/gm)) {
    if (!m[1].startsWith("**")) push(m[1]);
  }
  for (const m of answer.matchAll(/^#{2,4}\s+(?:\d+[.)]\s*)?([^\n]{3,80})/gm)) push(m[1]);
  return names.slice(0, 15);
}

export async function runPrompt(
  engine: EngineId,
  prompt: string,
  business: Business,
  competitors: string[] = [],
  place?: Place,
  mapsListings?: LocalListing[],
): Promise<EngineAnswer> {
  const t0 = Date.now();
  try {
    const { answer, citations, grounded, grounding } = await askEngine(engine, prompt, place, mapsListings);
    // The business's own suburb and city often appear as headings; they aren't rivals.
    const own = new Set([place?.area, place?.city].filter(Boolean).map((p) => norm(p!)));
    const named = extractNames(answer).filter((n) => !own.has(norm(n)));
    // The name typed into the audit plus the name on Google Maps ("Kinetic Rehab" vs "Kinetic Rehabilitation + Performance").
    const ourNames = [business.name, ...(business.aliases ?? [])];
    const ourHost = hostOf(business.website);
    const ourCitations = citations.filter((c) => ourHost && hostOf(c.url) === ourHost).map((c) => c.title ?? "");
    const isUs = (n: string) =>
      ourNames.some((x) => mentions(n, [], x) || similarName(n, x)) || ourCitations.some((t) => t && norm(t) === norm(n));
    const mentioned = ourNames.some((x) => mentions(answer, citations, x, business.website)) || named.some(isUs);
    const others = named.filter((n) => !isUs(n));

    let position: number | null = null;
    if (mentioned) {
      const idx = named.findIndex(isUs);
      if (idx >= 0) position = idx + 1;
      else {
        // Mentioned in prose, not in a list: rank by first appearance.
        const text = norm(answer);
        const at = Math.min(...[...ourNames, ...ourCitations].map((x) => text.indexOf(coreName(x) || norm(x))).filter((i) => i >= 0));
        position = Number.isFinite(at) ? named.filter((n) => text.indexOf(norm(n)) < at).length + 1 : null;
      }
    }

    return {
      engine,
      prompt,
      answer,
      citations: citations.slice(0, 12),
      mentioned,
      position,
      othersNamed: others.slice(0, 10),
      competitorsMentioned: competitors.filter((c) => c && mentions(answer, citations, c)),
      grounded: grounded ?? true,
      grounding: grounding ?? (grounded === false ? "none" : "web"),
      ms: Date.now() - t0,
    };
  } catch (e) {
    return {
      engine,
      prompt,
      answer: "",
      citations: [],
      mentioned: false,
      position: null,
      othersNamed: [],
      competitorsMentioned: [],
      error: e instanceof Error ? e.message : String(e),
      ms: Date.now() - t0,
    };
  }
}

/** Run a prompt set across engines with modest concurrency. */
export async function runMatrix(
  engines: EngineId[],
  prompts: string[],
  business: Business,
  competitors: string[] = [],
  place?: Place,
  mapsListings?: LocalListing[],
  concurrency = 4,
): Promise<EngineAnswer[]> {
  const jobs = prompts.flatMap((p) => engines.map((e) => ({ e, p })));
  const out: EngineAnswer[] = new Array(jobs.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, jobs.length) }, async () => {
      while (i < jobs.length) {
        const idx = i++;
        out[idx] = await runPrompt(jobs[idx].e, jobs[idx].p, business, competitors, place, mapsListings);
      }
    }),
  );
  return out;
}

export function rivalsFrom(answers: EngineAnswer[]) {
  const counts = new Map<string, { name: string; count: number }>();
  for (const a of answers)
    for (const n of a.othersNamed) {
      const k = norm(n);
      const cur = counts.get(k) ?? { name: n, count: 0 };
      cur.count++;
      counts.set(k, cur);
    }
  return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 8);
}
