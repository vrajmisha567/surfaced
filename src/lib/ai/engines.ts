import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/lib/env";
import type { EngineId } from "@/lib/types";
import { getCountry, type Place } from "@/lib/locale";
import { geocodeCity, searchLocal, type LocalListing } from "@/lib/places";
import { coreName, hostOf, norm } from "@/lib/names";
import { askDfsAiOverview, askDfsChatGPT, askDfsModel, dataforseoEnabled, dataforseoEngines } from "./dataforseo";

/** How an answer was sourced: a live web search, live Google Maps results, or the model's memory. */
export type Grounding = "web" | "maps" | "none";
export type EngineReply = { answer: string; citations: { url: string; title?: string }[]; grounded?: boolean; grounding?: Grounding };

export const engineLabels: Record<EngineId, string> = {
  chatgpt: "ChatGPT",
  gemini: "Gemini",
  perplexity: "Perplexity",
  claude: "Claude",
  ollama: "Open model",
  ai_overview: "Google AI Overviews",
};

export function enabledEngines(): EngineId[] {
  const dfs = dataforseoEnabled() ? dataforseoEngines() : new Set<string>();
  const out: EngineId[] = [];
  if (env.openai || dfs.has("chatgpt")) out.push("chatgpt");
  if (env.gemini) out.push("gemini");
  if (dfs.has("ai_overview")) out.push("ai_overview");
  if (env.perplexity || dfs.has("perplexity")) out.push("perplexity");
  if (env.anthropic || dfs.has("claude")) out.push("claude");
  if (env.ollama) out.push("ollama");
  return out;
}

/** True when this engine's answers come from DataForSEO (no direct API key for it). */
function viaDataforseo(engine: EngineId) {
  if (!dataforseoEnabled() || !dataforseoEngines().has(engine)) return false;
  return engine === "ai_overview" || (engine === "chatgpt" && !env.openai) || (engine === "perplexity" && !env.perplexity) || (engine === "claude" && !env.anthropic);
}

/** Where the person asking is, so web-search engines localise results. */
export type Loc = { city: string; country: string; countryName: string; region?: string; timezone?: string };

const ADELAIDE: Loc = { city: "Adelaide", region: "South Australia", country: "AU", countryName: "Australia", timezone: "Australia/Adelaide" };

export function locFor(place?: Place): Loc {
  if (!place) return ADELAIDE;
  if (place.country === "AU" && place.city.toLowerCase() === "adelaide") return ADELAIDE;
  return { city: place.city || place.area, country: place.country, countryName: getCountry(place.country).name };
}

/** user_location for OpenAI and Anthropic web search; only the fields we actually know. */
function userLocation(l: Loc) {
  return { type: "approximate" as const, city: l.city, country: l.country, ...(l.region ? { region: l.region } : {}), ...(l.timezone ? { timezone: l.timezone } : {}) };
}

const where = (l: Loc) => [l.city, l.region, l.countryName].filter(Boolean).join(", ");

async function postJson<T>(url: string, body: unknown, headers: Record<string, string>, timeoutMs = 60000): Promise<T> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: ctrl.signal,
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`${res.status} ${text.slice(0, 200)}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(t);
  }
}

/* ---------- ChatGPT: OpenAI Responses API with web search ---------- */
type OpenAIResponse = {
  output?: {
    type: string;
    content?: { type: string; text?: string; annotations?: { type: string; url?: string; title?: string }[] }[];
  }[];
};

async function askChatGPT(prompt: string, loc: Loc): Promise<EngineReply> {
  const json = await postJson<OpenAIResponse>(
    "https://api.openai.com/v1/responses",
    {
      model: env.openaiModel,
      input: prompt,
      tools: [{ type: "web_search", user_location: userLocation(loc) }],
    },
    { authorization: `Bearer ${env.openai}` },
  );
  let answer = "";
  const citations: EngineReply["citations"] = [];
  for (const item of json.output ?? []) {
    if (item.type !== "message") continue;
    for (const c of item.content ?? []) {
      if (c.type === "output_text" && c.text) answer += c.text;
      for (const a of c.annotations ?? []) if (a.type === "url_citation" && a.url) citations.push({ url: a.url, title: a.title });
    }
  }
  return { answer, citations };
}

/* ---------- Gemini: generateContent with Google Search grounding ---------- */
type GeminiResponse = {
  candidates?: {
    content?: { parts?: { text?: string }[] };
    groundingMetadata?: { groundingChunks?: { web?: { uri?: string; title?: string } }[] };
  }[];
};

/** postJson throws "<status> <body>"; pull the status back out. */
const httpStatus = (e: unknown) => Number((e instanceof Error ? e.message : String(e)).match(/^(\d{3})\b/)?.[1] ?? 0);

// Search grounding has no free-tier quota on many keys. Once it's refused, skip it for the rest of this instance.
let geminiSearchBlocked = false;
// Free-tier limits differ per model, so step down to lighter models when one is busy (503) or rate-limited (429).
const GEMINI_FALLBACK_MODELS = ["gemini-flash-lite-latest", "gemini-3.1-flash-lite"];

async function geminiCall(model: string, text: string, search: boolean) {
  return postJson<GeminiResponse>(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      contents: [{ role: "user", parts: [{ text }] }],
      ...(search ? { tools: [{ google_search: {} }] } : {}),
    },
    { "x-goog-api-key": env.gemini! },
  );
}

/**
 * Without Google Search grounding, Gemini answers local questions from memory and names a
 * different list from the Gemini app, which searches live. So we give it what the app sees for
 * local questions: the live Google Maps results for that exact question, in Google's order.
 */
async function mapsGroundedPrompt(prompt: string, loc: Loc, given?: LocalListing[]): Promise<{ text: string; listings: LocalListing[] } | null> {
  if (!env.googlePlaces) return null;
  // Search from the city centre. Without a point, Google uses the server's location (Sydney on Vercel).
  // Audits pass in the Maps results they already fetched from the city centre: no extra searches.
  let listings = given?.slice(0, 8) ?? [];
  if (!listings.length) {
    const city = await geocodeCity(loc.city, loc.countryName, loc.country).catch(() => null);
    const near = city ? { center: city.center, radius: 4000 } : undefined;
    listings = await searchLocal(prompt, { country: loc.country, near }, 8).catch(() => []);
  }
  if (!listings.length) return null;
  const lines = listings.map((l, i) =>
    [
      `${i + 1}. ${l.name}`,
      l.rating ? `${l.rating.toFixed(1)} stars from ${l.reviews} Google reviews` : "no Google rating yet",
      l.address,
      l.website ? `website ${hostOf(l.website)}` : null,
      l.summary,
    ]
      .filter(Boolean)
      .join(" | "),
  );
  const text = [
    `I'm in ${where(loc)}. ${prompt}`,
    "",
    "Live Google Maps results for this search, in Google's ranking order:",
    ...lines,
    "",
    "Answer the way Gemini answers a local search: recommend 3 to 5 specific businesses, strongest first, with one line on why each stands out. Base it on these Google Maps results (ranking, star rating and number of reviews) plus anything you reliably know. Bold each business name, written exactly as listed.",
  ].join("\n");
  return { text, listings };
}

/** The listings the answer actually named, so citations point only at businesses that were recommended. */
function namedListings(answer: string, listings: LocalListing[]) {
  const a = ` ${norm(answer)} `;
  return listings
    .filter((l) => {
      const core = coreName(l.name);
      return a.includes(` ${norm(l.name)} `) || (core.length >= 5 && a.includes(` ${core} `));
    })
    .map((l) => ({ url: l.website ?? l.mapsUrl ?? "", title: l.name }))
    .filter((c) => c.url);
}

async function askGemini(prompt: string, loc: Loc, mapsListings?: LocalListing[]): Promise<EngineReply> {
  let json: GeminiResponse | null = null;
  let grounding: Grounding = geminiSearchBlocked ? "none" : "web";
  let maps: Awaited<ReturnType<typeof mapsGroundedPrompt>> = null;
  const models = [...new Set([env.geminiModel, ...GEMINI_FALLBACK_MODELS])];
  for (const [i, model] of models.entries()) {
    try {
      if (grounding === "web") {
        try {
          json = await geminiCall(model, prompt, true);
        } catch (e) {
          if (httpStatus(e) !== 429) throw e;
          geminiSearchBlocked = true;
          grounding = "none";
        }
      }
      if (!json) {
        maps ??= await mapsGroundedPrompt(prompt, loc, mapsListings);
        if (maps) grounding = "maps";
        json = await geminiCall(model, maps?.text ?? `I'm in ${where(loc)}. ${prompt}`, false);
      }
      break;
    } catch (e) {
      const busy = httpStatus(e) === 429 || httpStatus(e) === 503;
      if (!busy || i === models.length - 1) throw e;
    }
  }
  const cand = json?.candidates?.[0];
  const answer = (cand?.content?.parts ?? []).map((p) => p.text ?? "").join("");
  const citations =
    grounding === "maps" && maps
      ? namedListings(answer, maps.listings)
      : (cand?.groundingMetadata?.groundingChunks ?? []).map((g) => ({ url: g.web?.uri ?? "", title: g.web?.title })).filter((c) => c.url);
  return { answer, citations, grounded: grounding !== "none", grounding };
}

/* ---------- Perplexity: Sonar chat completions ---------- */
type PerplexityResponse = {
  choices?: { message?: { content?: string } }[];
  citations?: string[];
  search_results?: { url: string; title?: string }[];
};

async function askPerplexity(prompt: string, loc: Loc): Promise<EngineReply> {
  const json = await postJson<PerplexityResponse>(
    "https://api.perplexity.ai/chat/completions",
    {
      model: env.perplexityModel,
      messages: [{ role: "user", content: prompt }],
      web_search_options: { user_location: { country: loc.country, city: loc.city, ...(loc.region ? { region: loc.region } : {}) } },
    },
    { authorization: `Bearer ${env.perplexity}` },
  );
  const answer = json.choices?.[0]?.message?.content ?? "";
  const citations = json.search_results?.length
    ? json.search_results.map((s) => ({ url: s.url, title: s.title }))
    : (json.citations ?? []).map((url) => ({ url }));
  return { answer, citations };
}

/* ---------- Claude: Messages API with the web search server tool ---------- */
let anthropic: Anthropic | null = null;
function claudeClient() {
  anthropic ??= new Anthropic({ apiKey: env.anthropic, timeout: 90_000, maxRetries: 1 });
  return anthropic;
}

async function askClaude(prompt: string, loc: Loc): Promise<EngineReply> {
  const client = claudeClient();
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: prompt }];
  let answer = "";
  const citations: EngineReply["citations"] = [];

  // Web search can return pause_turn on long searches; resume a couple of times.
  for (let turn = 0; turn < 3; turn++) {
    const res = await client.beta.messages.create({
      model: env.anthropicModel,
      max_tokens: 8000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low" },
      tools: [
        {
          type: "web_search_20260209",
          name: "web_search",
          max_uses: 4,
          user_location: userLocation(loc),
        },
      ],
      messages,
    });

    if (res.stop_reason === "refusal") throw new Error("Claude declined this prompt");

    for (const block of res.content) {
      if (block.type === "text") {
        answer += block.text;
        for (const c of block.citations ?? []) {
          if (c.type === "web_search_result_location") citations.push({ url: c.url, title: c.title ?? undefined });
        }
      } else if (block.type === "web_search_tool_result" && Array.isArray(block.content)) {
        for (const r of block.content) if (r.type === "web_search_result") citations.push({ url: r.url, title: r.title });
      }
    }

    if (res.stop_reason !== "pause_turn") break;
    messages.push({ role: "assistant", content: res.content });
  }

  const seen = new Set<string>();
  return { answer, citations: citations.filter((c) => (seen.has(c.url) ? false : (seen.add(c.url), true))) };
}

/* ---------- Ollama Cloud: web search, then an open model answers from those results ---------- */
type ChatCompletion = { choices?: { message?: { content?: string } }[] };
type OllamaSearch = { results?: { title?: string; url: string; content?: string }[] };

const ollamaHeaders = () => ({ authorization: `Bearer ${env.ollama}` });

async function ollamaChat(messages: { role: "system" | "user"; content: string }[]): Promise<string> {
  const json = await postJson<ChatCompletion>(
    "https://ollama.com/v1/chat/completions",
    { model: env.ollamaModel, messages },
    ollamaHeaders(),
    90_000,
  );
  // Some reasoning models wrap their scratch work in <think> tags; drop it.
  return (json.choices?.[0]?.message?.content ?? "").replace(/<think>[\s\S]*?<\/think>/g, "").trim();
}

/**
 * This mimics how AI search assistants work (search, read, answer) using an open model.
 * It's a useful signal, not a reading of ChatGPT or Gemini themselves.
 */
async function askOllama(prompt: string, loc: Loc): Promise<EngineReply> {
  const search = await postJson<OllamaSearch>(
    "https://ollama.com/api/web_search",
    { query: `${prompt} ${where(loc)}`, max_results: 8 },
    ollamaHeaders(),
    30_000,
  );
  const results = (search.results ?? []).filter((r) => r.url);
  const sources = results
    .map((r, i) => `[${i + 1}] ${r.title ?? r.url}\n${r.url}\n${(r.content ?? "").slice(0, 1200)}`)
    .join("\n\n");

  const answer = await ollamaChat([
    {
      role: "system",
      content:
        `You are an AI search assistant answering a user in ${where(loc)}. ` +
        "Answer the way a search assistant would: recommend specific local businesses by name, with a line on why each is a good pick. " +
        "Use only the web results provided. Bold each business name. Cite sources as [n]. If the results don't support a recommendation, say so.",
    },
    { role: "user", content: `Question: ${prompt}\n\nWeb results:\n${sources || "(no results)"}` },
  ]);
  return { answer, citations: results.map((r) => ({ url: r.url, title: r.title })) };
}

/** mapsListings: Google Maps results the caller already has, used to ground Gemini without searching again. */
export async function askEngine(engine: EngineId, prompt: string, place?: Place, mapsListings?: LocalListing[]): Promise<EngineReply> {
  const loc = locFor(place);
  if (viaDataforseo(engine)) {
    // Real ChatGPT and Google answers with web search, so they count as grounded.
    const reply =
      engine === "chatgpt"
        ? await askDfsChatGPT(prompt, loc.country)
        : engine === "ai_overview"
          ? await askDfsAiOverview(prompt, loc.country)
          : await askDfsModel(engine === "claude" ? "claude" : "perplexity", prompt, loc.country);
    return { ...reply, grounded: true, grounding: "web" };
  }
  switch (engine) {
    case "ai_overview":
      throw new Error("Google AI Overviews need DataForSEO");
    case "chatgpt":
      return askChatGPT(prompt, loc);
    case "gemini":
      return askGemini(prompt, loc, mapsListings);
    case "perplexity":
      return askPerplexity(prompt, loc);
    case "claude":
      return askClaude(prompt, loc);
    case "ollama":
      return askOllama(prompt, loc);
  }
}

/**
 * Plain text generation for FAQ copy and outreach drafts.
 * Uses Claude if configured, then OpenAI, then Ollama; returns null so callers can fall back to templates.
 */
export async function writeText(system: string, prompt: string): Promise<string | null> {
  try {
    if (env.anthropic) {
      const res = await claudeClient().beta.messages.create({
        model: env.anthropicModel,
        max_tokens: 4000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "low" },
        system,
        messages: [{ role: "user", content: prompt }],
      });
      if (res.stop_reason === "refusal") return null;
      const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
      return text || null;
    }
    if (env.openai) {
      const json = await postJson<OpenAIResponse>(
        "https://api.openai.com/v1/responses",
        { model: env.openaiModel, instructions: system, input: prompt },
        { authorization: `Bearer ${env.openai}` },
      );
      const text = (json.output ?? [])
        .flatMap((o) => o.content ?? [])
        .map((c) => (c.type === "output_text" ? c.text ?? "" : ""))
        .join("")
        .trim();
      return text || null;
    }
    if (env.ollama) {
      const text = await ollamaChat([
        { role: "system", content: system },
        { role: "user", content: prompt },
      ]);
      return text || null;
    }
  } catch (e) {
    console.error("writeText failed", e);
  }
  return null;
}
