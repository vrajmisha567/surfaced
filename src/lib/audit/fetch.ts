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

/** The bits of a response we use; fetch's Response and the HTTP/1.1 fallback both provide them. */
type SimpleResponse = { ok: boolean; status: number; url: string; text: () => Promise<string> };

/** A plain browser user agent, used only when a site's firewall refuses our named crawler. */
const BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

async function timedFetch(url: string, ms: number, init?: { headers?: Record<string, string> }): Promise<SimpleResponse> {
  const headers = { "user-agent": UA, accept: "text/html,application/xhtml+xml,*/*;q=0.8", ...(init?.headers ?? {}) };
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { signal: ctrl.signal, redirect: "follow", headers, cache: "no-store" });
  } catch (e) {
    // Some servers break Node's HTTP/2 handling (NGHTTP2_PROTOCOL_ERROR) but serve HTTP/1.1 fine, like browsers see.
    const code = (e as { cause?: { code?: string } }).cause?.code ?? "";
    if (code.startsWith("ERR_HTTP2")) return http1Get(url, ms, headers);
    throw e;
  } finally {
    clearTimeout(t);
  }
}

const MAX_BYTES = 3_000_000;

/** Plain HTTP/1.1 GET with redirects, decompression, a size cap and the same public-host check on every hop. */
async function http1Get(url: string, ms: number, headers: Record<string, string>, hops = 0): Promise<SimpleResponse> {
  const [{ request: httpsRequest }, { request: httpRequest }, zlib] = await Promise.all([import("node:https"), import("node:http"), import("node:zlib")]);
  const u = new URL(url);
  assertPublicHost(u.hostname);
  return new Promise((resolve, reject) => {
    const req = (u.protocol === "http:" ? httpRequest : httpsRequest)(
      u,
      { method: "GET", headers: { ...headers, "accept-encoding": "gzip, deflate, br" }, timeout: ms },
      (res) => {
        const status = res.statusCode ?? 0;
        const location = res.headers.location;
        if (status >= 300 && status < 400 && location) {
          res.resume();
          if (hops >= 5) return reject(new Error("Too many redirects"));
          return resolve(http1Get(new URL(location, u).toString(), ms, headers, hops + 1));
        }
        const enc = String(res.headers["content-encoding"] ?? "");
        const stream = enc.includes("br") ? res.pipe(zlib.createBrotliDecompress()) : enc.includes("gzip") ? res.pipe(zlib.createGunzip()) : enc.includes("deflate") ? res.pipe(zlib.createInflate()) : res;
        const chunks: Buffer[] = [];
        let size = 0;
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          const body = Buffer.concat(chunks).toString("utf8");
          resolve({ ok: status >= 200 && status < 300, status, url: u.toString(), text: async () => body });
        };
        stream.on("data", (c: Buffer) => {
          if (done) return;
          chunks.push(c);
          size += c.length;
          // Big pages: the first 3 MB has everything an audit reads.
          if (size > MAX_BYTES) {
            finish();
            req.destroy();
          }
        });
        stream.on("error", (e) => (done ? undefined : reject(e)));
        stream.on("end", finish);
      },
    );
    req.on("timeout", () => req.destroy(Object.assign(new Error("The operation was aborted"), { name: "AbortError" })));
    req.on("error", reject);
    req.end();
  });
}

export type FetchedPage = {
  url: string;
  finalUrl: string;
  html: string;
  status: number;
  ms: number;
  renderer: "fetch" | "firecrawl";
  /** The site refused our named crawler but served a normal browser. AI crawlers likely hit the same wall. */
  botBlocked: boolean;
};

/** Connection resets and 403/429/503 to bots are how firewalls (Cloudflare, Wordfence...) turn crawlers away. */
const looksBlocked = (status: number) => status === 403 || status === 429 || status === 503;

export async function fetchPage(url: string): Promise<FetchedPage> {
  const start = Date.now();
  let botBlocked = false;
  let res: SimpleResponse;
  try {
    res = await timedFetch(url, 15000);
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    const dns = (e as { cause?: { code?: string } }).cause?.code === "ENOTFOUND";
    if (dns) throw e;
    // Refused the crawler outright: see whether a browser gets in.
    res = await timedFetch(url, 15000, { headers: { "user-agent": BROWSER_UA } }).catch(() => {
      throw e;
    });
    botBlocked = true;
  }
  if (!botBlocked && looksBlocked(res.status)) {
    const retry = await timedFetch(url, 15000, { headers: { "user-agent": BROWSER_UA } }).catch(() => null);
    if (retry?.ok) {
      res = retry;
      botBlocked = true;
    }
  }
  const html = await res.text();
  const ms = Date.now() - start;
  const finalUrl = res.url || url;
  assertPublicHost(new URL(finalUrl).hostname);

  // Sites built as client-rendered SPAs ship almost no text in raw HTML.
  // If that happens and Firecrawl is configured, render it properly.
  const visibleText = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<[^>]+>/g, " ").replace(/\s+/g, " ");
  if (env.firecrawl && visibleText.length < 400) {
    const rendered = await firecrawl(finalUrl).catch(() => null);
    if (rendered) return { url, finalUrl, html: rendered, status: res.status, ms, renderer: "firecrawl", botBlocked };
  }
  return { url, finalUrl, html, status: res.status, ms, renderer: "fetch", botBlocked };
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
