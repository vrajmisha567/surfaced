import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/lib/env";
import type { EngineId } from "@/lib/types";

export type EngineReply = { answer: string; citations: { url: string; title?: string }[] };

export const engineLabels: Record<EngineId, string> = {
  chatgpt: "ChatGPT",
  gemini: "Gemini",
  perplexity: "Perplexity",
  claude: "Claude",
  ollama: "Open model",
};

export function enabledEngines(): EngineId[] {
  const out: EngineId[] = [];
  if (env.openai) out.push("chatgpt");
  if (env.gemini) out.push("gemini");
  if (env.perplexity) out.push("perplexity");
  if (env.anthropic) out.push("claude");
  if (env.ollama) out.push("ollama");
  return out;
}

const LOCATION = { city: "Adelaide", region: "South Australia", country: "AU", timezone: "Australia/Adelaide" };

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

async function askChatGPT(prompt: string): Promise<EngineReply> {
  const json = await postJson<OpenAIResponse>(
    "https://api.openai.com/v1/responses",
    {
      model: env.openaiModel,
      input: prompt,
      tools: [{ type: "web_search", user_location: { type: "approximate", ...LOCATION } }],
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

async function askGemini(prompt: string): Promise<EngineReply> {
  const json = await postJson<GeminiResponse>(
    `https://generativelanguage.googleapis.com/v1beta/models/${env.geminiModel}:generateContent`,
    { contents: [{ role: "user", parts: [{ text: prompt }] }], tools: [{ google_search: {} }] },
    { "x-goog-api-key": env.gemini! },
  );
  const cand = json.candidates?.[0];
  const answer = (cand?.content?.parts ?? []).map((p) => p.text ?? "").join("");
  const citations = (cand?.groundingMetadata?.groundingChunks ?? [])
    .map((g) => ({ url: g.web?.uri ?? "", title: g.web?.title }))
    .filter((c) => c.url);
  return { answer, citations };
}

/* ---------- Perplexity: Sonar chat completions ---------- */
type PerplexityResponse = {
  choices?: { message?: { content?: string } }[];
  citations?: string[];
  search_results?: { url: string; title?: string }[];
};

async function askPerplexity(prompt: string): Promise<EngineReply> {
  const json = await postJson<PerplexityResponse>(
    "https://api.perplexity.ai/chat/completions",
    {
      model: env.perplexityModel,
      messages: [{ role: "user", content: prompt }],
      web_search_options: { user_location: { country: "AU", city: "Adelaide", region: "South Australia" } },
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

async function askClaude(prompt: string): Promise<EngineReply> {
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
          user_location: { type: "approximate", ...LOCATION },
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
async function askOllama(prompt: string): Promise<EngineReply> {
  const search = await postJson<OllamaSearch>(
    "https://ollama.com/api/web_search",
    { query: `${prompt} ${LOCATION.city} ${LOCATION.region}`, max_results: 8 },
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
        `You are an AI search assistant answering a user in ${LOCATION.city}, ${LOCATION.region}, Australia. ` +
        "Answer the way a search assistant would: recommend specific local businesses by name, with a line on why each is a good pick. " +
        "Use only the web results provided. Bold each business name. Cite sources as [n]. If the results don't support a recommendation, say so.",
    },
    { role: "user", content: `Question: ${prompt}\n\nWeb results:\n${sources || "(no results)"}` },
  ]);
  return { answer, citations: results.map((r) => ({ url: r.url, title: r.title })) };
}

export async function askEngine(engine: EngineId, prompt: string): Promise<EngineReply> {
  switch (engine) {
    case "chatgpt":
      return askChatGPT(prompt);
    case "gemini":
      return askGemini(prompt);
    case "perplexity":
      return askPerplexity(prompt);
    case "claude":
      return askClaude(prompt);
    case "ollama":
      return askOllama(prompt);
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
