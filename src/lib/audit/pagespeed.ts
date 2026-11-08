import "server-only";
import type { PageSpeed } from "@/lib/types";

/*
  Mobile page speed from Google PageSpeed Insights (Lighthouse lab test, plus real-visitor
  Core Web Vitals from the Chrome UX Report when the site has enough traffic).
  Free: 25,000 requests a day with an API key that allows "PageSpeed Insights API".
  OpenSEO buys the same Lighthouse data through DataForSEO; Google gives it away.
*/

const ENDPOINT = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

function key() {
  return process.env.PAGESPEED_API_KEY ?? process.env.GOOGLE_PLACES_API_KEY ?? "";
}

type Psi = {
  error?: { code: number; message: string };
  lighthouseResult?: {
    categories?: { performance?: { score: number | null } };
    audits?: Record<string, { numericValue?: number; displayValue?: string }>;
  };
  loadingExperience?: { overall_category?: string; metrics?: Record<string, { percentile: number; category: string }> };
};

/** Null when PageSpeed isn't available (no key, key not allowed, quota, timeout): the audit then skips the check. */
export async function checkPageSpeed(url: string): Promise<PageSpeed | null> {
  const k = key();
  const q = new URLSearchParams({ url, strategy: "mobile", category: "performance" });
  if (k) q.set("key", k);
  try {
    const res = await fetch(`${ENDPOINT}?${q}`, { signal: AbortSignal.timeout(45_000), cache: "no-store" });
    const j = (await res.json()) as Psi;
    if (!res.ok || j.error) {
      const msg = j.error?.message ?? `HTTP ${res.status}`;
      // 403 = key not allowed for this API, 429 = quota. Both are setup issues, not the site's fault.
      if (res.status !== 403 && res.status !== 429) console.warn("pagespeed:", msg.slice(0, 160));
      return null;
    }
    const lh = j.lighthouseResult;
    const perf = lh?.categories?.performance?.score;
    if (perf == null || !lh?.audits) return null;
    const ms = (id: string) => {
      const v = lh.audits?.[id]?.numericValue;
      return typeof v === "number" ? Math.round(v) : null;
    };
    const field = j.loadingExperience?.metrics;
    return {
      score: Math.round(perf * 100),
      lcpMs: ms("largest-contentful-paint"),
      cls: lh.audits["cumulative-layout-shift"]?.numericValue ?? null,
      tbtMs: ms("total-blocking-time"),
      fcpMs: ms("first-contentful-paint"),
      field: field
        ? {
            lcpMs: field.LARGEST_CONTENTFUL_PAINT_MS?.percentile ?? null,
            inpMs: field.INTERACTION_TO_NEXT_PAINT?.percentile ?? null,
            cls: field.CUMULATIVE_LAYOUT_SHIFT_SCORE ? field.CUMULATIVE_LAYOUT_SHIFT_SCORE.percentile / 100 : null,
            overall: j.loadingExperience?.overall_category ?? null,
          }
        : null,
    };
  } catch {
    return null;
  }
}
