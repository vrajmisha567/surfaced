import "server-only";
import { env } from "@/lib/env";

const UA =
  "Mozilla/5.0 (compatible; SurfacedAudit/1.0; +https://surfaced.au/bot) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36";

export function normaliseUrl(raw: string): string {
  let u = raw.trim();
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  const parsed = new URL(u);
  if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Only http(s) URLs are supported");
  assertPublicHost(parsed.hostname);
  parsed.hash = "";
  return parsed.toString();
}

/** Block obvious SSRF targets: we only audit public websites. */
function assertPublicHost(host: string) {
  const h = host.toLowerCase();
  if (
    h === "localhost" ||
    h.endsWith(".localhost") ||
    h.endsWith(".local") ||
    h.endsWith(".internal") ||
    /^127\./.test(h) ||
    /^10\./.test(h) ||
    /^192\.168\./.test(h) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(h) ||
    /^169\.254\./.test(h) ||
    /^0\./.test(h) ||
    h === "[::1]" ||
    !h.includes(".")
  ) {
    throw new Error("That address isn't a public website");
  }
}

async function timedFetch(url: string, ms: number, init?: RequestInit) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, {
      ...init,
      signal: ctrl.signal,
      redirect: "follow",
      headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml,*/*;q=0.8", ...(init?.headers ?? {}) },
      cache: "no-store",
    });
  } finally {
    clearTimeout(t);
  }
}

export type FetchedPage = {
  url: string;
  finalUrl: string;
  html: string;
  status: number;
  ms: number;
  renderer: "fetch" | "firecrawl";
};

export async function fetchPage(url: string): Promise<FetchedPage> {
  const start = Date.now();
  const res = await timedFetch(url, 15000);
  const html = await res.text();
  const ms = Date.now() - start;
  const finalUrl = res.url || url;
  assertPublicHost(new URL(finalUrl).hostname);

  // Sites built as client-rendered SPAs ship almost no text in raw HTML.
  // If that happens and Firecrawl is configured, render it properly.
  const visibleText = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<[^>]+>/g, " ").replace(/\s+/g, " ");
  if (env.firecrawl && visibleText.length < 400) {
    const rendered = await firecrawl(finalUrl).catch(() => null);
    if (rendered) return { url, finalUrl, html: rendered, status: res.status, ms, renderer: "firecrawl" };
  }
  return { url, finalUrl, html, status: res.status, ms, renderer: "fetch" };
}

async function firecrawl(url: string): Promise<string | null> {
  const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: { authorization: `Bearer ${env.firecrawl}`, "content-type": "application/json" },
    body: JSON.stringify({ url, formats: ["rawHtml"], onlyMainContent: false }),
    cache: "no-store",
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { data?: { rawHtml?: string } };
  return json.data?.rawHtml ?? null;
}

export async function fetchText(url: string, ms = 8000): Promise<{ ok: boolean; status: number; text: string }> {
  try {
    const res = await timedFetch(url, ms, { headers: { accept: "text/plain,*/*" } });
    const text = res.ok ? await res.text() : "";
    return { ok: res.ok, status: res.status, text };
  } catch {
    return { ok: false, status: 0, text: "" };
  }
}
