import "server-only";
import { getCountry } from "@/lib/locale";
import type { LocalListing } from "@/lib/places";

/*
  DataForSEO: pay-per-request access to what customers actually see.
  - ChatGPT: answers scraped from the real ChatGPT app (LLM Scraper), with its cited sources.
  - Google AI Overviews: the AI summary on a live Google results page.
  - Claude and Perplexity: model answers with web search switched on (LLM Responses).
  - Google Maps: local results from any point, for the city rank grid (no Places daily cap).
  Switched on by DATAFORSEO_LOGIN + DATAFORSEO_PASSWORD. Billed per call, so nothing here retries.
  Request shapes and the answer parsing follow OpenSEO (github.com/every-app/open-seo, MIT).
*/

const API = "https://api.dataforseo.com";

export function dataforseoEnabled() {
  return !!(process.env.DATAFORSEO_LOGIN && process.env.DATAFORSEO_PASSWORD);
}

/** Which DataForSEO engines to use (comma list); defaults to all four. */
export function dataforseoEngines(): Set<string> {
  const raw = process.env.DATAFORSEO_ENGINES?.trim();
  return new Set((raw ? raw.split(",") : ["chatgpt", "ai_overview", "perplexity", "claude"]).map((s) => s.trim()).filter(Boolean));
}

function auth() {
  return "Basic " + Buffer.from(`${process.env.DATAFORSEO_LOGIN}:${process.env.DATAFORSEO_PASSWORD}`).toString("base64");
}

type Task<R> = { status_code: number; status_message: string; cost?: number; result?: R[] | null };
type Envelope<R> = { status_code: number; status_message: string; tasks?: Task<R>[] };

/** One billed call. Never retried: an ambiguous failure must not charge twice. */
async function post<R>(path: string, body: unknown[], timeoutMs: number): Promise<R | null> {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { Authorization: auth(), "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => null)) as Envelope<R> | null;
  if (!res.ok || !json || json.status_code !== 20000) throw new Error(`DataForSEO ${res.status}: ${json?.status_message ?? "no response"}`);
  const task = json.tasks?.[0];
  if (!task) throw new Error("DataForSEO returned no task");
  // 40102 = "no search results": a valid, empty answer.
  if (task.status_code === 40102) return null;
  if (task.status_code !== 20000) throw new Error(`DataForSEO task ${task.status_code}: ${task.status_message}`);
  return task.result?.[0] ?? null;
}

async function get<R>(path: string): Promise<R[]> {
  const res = await fetch(`${API}${path}`, { headers: { Authorization: auth() }, signal: AbortSignal.timeout(15_000), cache: "no-store" });
  const json = (await res.json().catch(() => null)) as Envelope<R> | null;
  return json?.tasks?.[0]?.result ?? [];
}

/* ---------------- answers → text + citations ---------------- */

export type DfsReply = { answer: string; citations: { url: string; title?: string }[] };

/** Plain prose for name matching. Citation pills ([1], [example.com]) are sources, not mentions, so they go. */
export function markdownToText(md: string) {
  return md
    .replace(/!\[[^\]]*\]\([^)\s]*\)/g, "")
    .replace(/\[((?:[^[\]]|\[[^\]]*\])*)\]\((https?:\/\/[^)\s]+)\)/g, (_, label: string, url: string) => {
      const t = label.replace(/^\[|\]$/g, "").trim().toLowerCase();
      let host = "";
      try {
        host = new URL(url).hostname.replace(/^www\./, "");
      } catch {}
      return /^\d+$/.test(t) || t.replace(/^www\./, "") === host ? "" : label;
    })
    .replace(/\*\*|__|`/g, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^(\s*)[*+-]\s+/gm, "$1")
    .replaceAll("\0", "");
}

function citations(list: unknown[] | null | undefined) {
  const out = new Map<string, { url: string; title?: string }>();
  for (const item of list ?? []) {
    const s = item as { url?: unknown; title?: unknown };
    if (typeof s.url !== "string") continue;
    try {
      const u = new URL(s.url);
      if (u.protocol !== "https:" && u.protocol !== "http:") continue;
      u.hash = "";
      for (const k of [...u.searchParams.keys()]) if (/^utm_|^(gclid|fbclid|msclkid)$/i.test(k)) u.searchParams.delete(k);
      const key = u.toString();
      if (!out.has(key)) out.set(key, { url: key, title: typeof s.title === "string" ? s.title : undefined });
    } catch {}
  }
  return [...out.values()].slice(0, 20);
}

const market = (country: string) => ({ location_name: getCountry(country).name, language_code: "en" });
// DataForSEO decodes %-escapes in keywords; escape literal % and +.
const keyword = (p: string) => p.replace(/%/g, "%25").replace(/\+/g, "%2B");

/** The real ChatGPT app's answer (with web search) to one question. Can take up to two minutes. */
export async function askDfsChatGPT(prompt: string, country: string): Promise<DfsReply> {
  const r = await post<{ markdown?: string | null; sources?: unknown[] | null }>(
    "/v3/ai_optimization/chat_gpt/llm_scraper/live/advanced",
    [{ keyword: keyword(prompt), ...market(country) }],
    150_000,
  );
  return { answer: r?.markdown ? markdownToText(r.markdown) : "", citations: citations(r?.sources) };
}

/** Google's AI Overview for the question, if Google shows one. Empty answer when it doesn't. */
export async function askDfsAiOverview(prompt: string, country: string): Promise<DfsReply> {
  type Item = { type?: string; markdown?: string | null; references?: unknown[] | null; items?: { references?: unknown[] | null }[] | null };
  const r = await post<{ items?: Item[] | null }>(
    "/v3/serp/google/organic/live/advanced",
    // Google renders some overviews after the page loads; DataForSEO refunds the extra when none appears.
    [{ keyword: keyword(prompt), ...market(country), depth: 10, load_async_ai_overview: true }],
    90_000,
  );
  const ov = r?.items?.find((i) => i.type === "ai_overview");
  return {
    answer: ov?.markdown ? markdownToText(ov.markdown) : "",
    citations: citations([...(ov?.references ?? []), ...(ov?.items ?? []).flatMap((i) => i.references ?? [])]),
  };
}

/* ---------------- model APIs (Claude, Perplexity) ---------------- */

type Slug = "claude" | "perplexity";
// Newest first. Checked against DataForSEO's free model catalog before any paid call,
// because a call with an unknown model name is still billed.
const PREFERRED: Record<Slug, string[]> = {
  claude: ["claude-sonnet-5", "claude-sonnet-4-6", "claude-sonnet-4-5"],
  perplexity: ["sonar-pro", "sonar", "sonar-reasoning-pro"],
};
const modelCache = new Map<Slug, { at: number; name: string | null }>();

async function modelFor(slug: Slug): Promise<string | null> {
  const hit = modelCache.get(slug);
  if (hit && Date.now() - hit.at < 6 * 3600_000) return hit.name;
  let name: string | null = null;
  try {
    const rows = await get<{ model_name?: string }>(`/v3/ai_optimization/${slug}/llm_responses/models`);
    const names = new Set(rows.map((r) => r.model_name).filter((n): n is string => !!n));
    name = PREFERRED[slug].find((n) => names.has(n)) ?? null;
  } catch {}
  modelCache.set(slug, { at: Date.now(), name });
  return name;
}

/** Claude or Perplexity answering with live web search, localised to the country. */
export async function askDfsModel(slug: Slug, prompt: string, country: string): Promise<DfsReply> {
  const model = await modelFor(slug);
  if (!model) throw new Error(`No supported ${slug} model in DataForSEO's catalog`);
  type Section = { text?: string | null; annotations?: unknown[] | null };
  const r = await post<{ items?: { type?: string; sections?: Section[] | null }[] | null }>(
    `/v3/ai_optimization/${slug}/llm_responses/live`,
    [
      {
        user_prompt: prompt,
        model_name: model,
        web_search: true,
        // Claude otherwise often answers from memory; only Claude accepts this field.
        ...(slug === "claude" ? { force_web_search: true } : {}),
        max_output_tokens: 1024,
        web_search_country_iso_code: country.toUpperCase(),
      },
    ],
    90_000,
  );
  const sections = (r?.items ?? []).filter((i) => i.type === "message").flatMap((i) => i.sections ?? []);
  const md = sections.map((s) => s.text ?? "").filter(Boolean).join("\n\n");
  return { answer: markdownToText(md), citations: citations(sections.flatMap((s) => s.annotations ?? [])) };
}

/* ---------------- Google Maps ---------------- */

type MapsItem = {
  type?: string;
  title?: string;
  url?: string | null;
  address?: string | null;
  phone?: string | null;
  place_id?: string | null;
  cid?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  category?: string | null;
  work_hours?: unknown;
  rating?: { value?: number | null; votes_count?: number | null } | null;
};

/** Google Maps results as seen from a point (lat, lng), in rank order. ~zoom 13 covers a few km. */
export async function dfsMapsSearch(query: string, at: { latitude: number; longitude: number }, max = 20): Promise<LocalListing[]> {
  const r = await post<{ items?: MapsItem[] | null }>(
    "/v3/serp/google/maps/live/advanced",
    [{ keyword: keyword(query), location_coordinate: `${at.latitude.toFixed(6)},${at.longitude.toFixed(6)},13z`, language_code: "en", depth: Math.min(Math.max(max, 10), 100) }],
    60_000,
  );
  return (r?.items ?? [])
    .filter((i) => i.type === "maps_search" && i.title)
    .slice(0, max)
    .map((i) => ({
      id: i.place_id ?? i.cid ?? i.title!,
      name: i.title!,
      website: i.url ?? null,
      rating: i.rating?.value ?? null,
      reviews: i.rating?.votes_count ?? 0,
      address: i.address ?? null,
      mapsUrl: i.cid ? `https://maps.google.com/?cid=${i.cid}` : i.place_id ? `https://www.google.com/maps/place/?q=place_id:${i.place_id}` : null,
      hasHours: !!i.work_hours,
      phone: i.phone ?? null,
      summary: i.category ?? null,
      location: i.latitude != null && i.longitude != null ? { latitude: i.latitude, longitude: i.longitude } : null,
    }));
}
