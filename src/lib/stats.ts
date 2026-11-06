import "server-only";
import { db } from "@/lib/db";
import { getCategory } from "@/lib/categories";
import { getCountry } from "@/lib/locale";
import { pillarMeta, scoreSummary } from "@/lib/audit/score";
import type { AuditSummary, PillarKey } from "@/lib/types";

/*
  Aggregate statistics across every audit, for the public /stats page.
  Only counts, medians and shares leave this file: never a business name or URL.
*/

export const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
};

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

/** Pearson correlation; null when there's too little data to say anything. */
function pearson(pts: { x: number; y: number }[]) {
  if (pts.length < 3) return null;
  const mx = avg(pts.map((p) => p.x))!;
  const my = avg(pts.map((p) => p.y))!;
  let sxy = 0,
    sxx = 0,
    syy = 0;
  for (const p of pts) {
    sxy += (p.x - mx) * (p.y - my);
    sxx += (p.x - mx) ** 2;
    syy += (p.y - my) ** 2;
  }
  if (!sxx || !syy) return null;
  return sxy / Math.sqrt(sxx * syy);
}

const day = (iso: string) => iso.slice(0, 10);

export type AuditStats = Awaited<ReturnType<typeof buildStats>>;

function buildStats(rows: AuditSummary[]) {
  // Fill visibility/readiness for audits saved before those fields existed.
  const audits = rows.map((r) => {
    if (r.visibility != null || r.readiness != null || !r.pillars?.length) return r;
    const s = scoreSummary(r.pillars);
    return { ...r, visibility: s.visibility, readiness: s.readiness };
  });

  const n = audits.length;
  const scores = audits.map((a) => a.overall_score);
  const businesses = new Set(audits.map((a) => `${a.business_name.trim().toLowerCase()}|${(a.city ?? "").toLowerCase()}`)).size;
  const cities = new Set(audits.map((a) => `${(a.city || "").toLowerCase()}|${a.country}`).filter((c) => !c.startsWith("|"))).size;
  const countries = new Set(audits.map((a) => (a.country || "AU").toUpperCase())).size;

  // AI: only audits where an engine actually answered from live data.
  const aiRows = audits.filter((a) => a.mentionRate != null);
  const namedShare = aiRows.length ? aiRows.filter((a) => (a.mentionRate ?? 0) > 0).length / aiRows.length : null;
  const avgMention = avg(aiRows.map((a) => a.mentionRate!));

  // Google Maps: audits with the city grid.
  const mapsRows = audits.filter((a) => a.spots);
  const mapsTop3Share = mapsRows.length ? mapsRows.filter((a) => (a.top3 ?? 0) / a.spots! >= 0.5).length / mapsRows.length : null;

  const buckets = [
    { label: "0 – 19", min: 0, max: 19 },
    { label: "20 – 39", min: 20, max: 39 },
    { label: "40 – 59", min: 40, max: 59 },
    { label: "60 – 79", min: 60, max: 79 },
    { label: "80 – 100", min: 80, max: 100 },
  ].map((b) => {
    const count = scores.filter((s) => s >= b.min && s <= b.max).length;
    return { label: b.label, count, share: n ? count / n : 0 };
  });

  const pillarKeys = Object.keys(pillarMeta) as PillarKey[];
  const pillars = pillarKeys.map((key) => {
    const vals = audits.flatMap((a) => a.pillars?.filter((p) => p.key === key && p.score != null).map((p) => p.score!) ?? []);
    return { key, label: pillarMeta[key].label, group: pillarMeta[key].group, avg: vals.length ? Math.round(avg(vals)!) : null, n: vals.length };
  });

  // Most common problems: checks that failed or need work, across audits that ran them.
  const checkMap = new Map<string, { label: string; fail: number; warn: number; total: number; pillar: PillarKey }>();
  for (const a of audits)
    for (const p of a.pillars ?? [])
      for (const c of p.checks ?? []) {
        if (c.status === "info") continue;
        // Labels like "Specific type (Physiotherapy)" name one business type; drop that for the cross-type total.
        const e = checkMap.get(c.id) ?? { label: c.label.replace(/\s*\([^)]*\)\s*$/, ""), fail: 0, warn: 0, total: 0, pillar: p.key };
        e.total++;
        if (c.status === "fail") e.fail++;
        if (c.status === "warn") e.warn++;
        checkMap.set(c.id, e);
      }
  const minRuns = Math.max(1, Math.ceil(n * 0.3));
  const problems = [...checkMap.entries()]
    .filter(([, e]) => e.total >= minRuns)
    .map(([id, e]) => ({ id, label: e.label, pillar: pillarMeta[e.pillar]?.label ?? e.pillar, failShare: e.fail / e.total, problemShare: (e.fail + e.warn) / e.total, total: e.total }))
    .sort((a, b) => b.problemShare - a.problemShare || b.failShare - a.failShare)
    .slice(0, 8);

  // Readiness vs visibility, one dot per audit.
  const scatter = audits.filter((a) => a.readiness != null && a.visibility != null).map((a) => ({ x: a.readiness!, y: a.visibility! }));
  const r = pearson(scatter);

  const group = <K extends string>(key: (a: AuditSummary) => K) => {
    const m = new Map<K, AuditSummary[]>();
    for (const a of audits) m.set(key(a), [...(m.get(key(a)) ?? []), a]);
    return [...m.entries()];
  };

  const categories = group((a) => a.category)
    .map(([id, rs]) => {
      const ai = rs.filter((a) => a.mentionRate != null);
      return {
        id,
        label: getCategory(id).plural,
        audits: rs.length,
        median: median(rs.map((a) => a.overall_score))!,
        named: ai.length ? ai.filter((a) => (a.mentionRate ?? 0) > 0).length / ai.length : null,
      };
    })
    .sort((a, b) => b.audits - a.audits || b.median - a.median)
    .slice(0, 12);

  const countryRows = group((a) => (a.country || "AU").toUpperCase())
    .map(([code, rs]) => ({
      code,
      name: getCountry(code).name,
      audits: rs.length,
      cities: new Set(rs.map((a) => (a.city || "").toLowerCase()).filter(Boolean)).size,
      median: median(rs.map((a) => a.overall_score))!,
    }))
    .sort((a, b) => b.audits - a.audits || b.median - a.median);

  // Audits per day over the last 30 days.
  const today = new Date();
  const perDay = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - (29 - i));
    const key = d.toISOString().slice(0, 10);
    return { day: key, count: audits.filter((a) => day(a.created_at) === key).length };
  });

  return {
    n,
    businesses,
    cities,
    countries,
    medianScore: median(scores),
    namedShare,
    avgMention,
    aiN: aiRows.length,
    mapsTop3Share,
    mapsN: mapsRows.length,
    buckets,
    pillars,
    problems,
    scatter,
    r,
    categories,
    countryRows,
    perDay,
    firstAudit: audits.at(-1)?.created_at ?? null,
    updatedAt: new Date().toISOString(),
  };
}

export async function getAuditStats() {
  try {
    return buildStats(await db.audits.summaries());
  } catch (e) {
    console.error("stats:", e);
    return null;
  }
}
