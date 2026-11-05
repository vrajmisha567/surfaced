import "server-only";
import type { Client, EngineId, TrackerRun } from "@/lib/types";
import { db } from "@/lib/db";
import { enabledEngines } from "@/lib/ai/engines";
import { runMatrix } from "@/lib/ai/visibility";
import { promptsFor } from "@/lib/categories";

/** ISO week label, e.g. 2026-W45. */
export function isoWeek(d = new Date()) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y = t.getUTCFullYear();
  const week = Math.ceil(((t.getTime() - Date.UTC(y, 0, 1)) / 864e5 + 1) / 7);
  return `${y}-W${String(week).padStart(2, "0")}`;
}

export function clientPrompts(c: Client) {
  return c.prompts.length ? c.prompts : promptsFor(c.category, c.suburb, 5);
}

export async function trackClient(c: Client) {
  const engines = enabledEngines();
  if (!engines.length) throw new Error("No AI engine keys configured");
  const week = isoWeek();
  const answers = await runMatrix(engines, clientPrompts(c), { name: c.name, website: c.website }, c.competitors);
  await db.runs.createMany(
    answers.map((a) => ({
      client_id: c.id,
      week,
      engine: a.engine,
      prompt: a.prompt,
      mentioned: a.mentioned,
      position: a.position,
      competitors_mentioned: a.competitorsMentioned,
      others_named: a.othersNamed,
      answer: a.answer.slice(0, 6000),
      citations: a.citations,
      error: a.error ?? null,
    })),
  );
  return { week, count: answers.length, mentioned: answers.filter((a) => a.mentioned).length };
}

export type WeekStat = {
  week: string;
  total: number;
  mentioned: number;
  rate: number;
  shareOfVoice: number;
  competitor: Record<string, number>;
  byEngine: Partial<Record<EngineId, { total: number; mentioned: number }>>;
};

/** Aggregate runs per week: mention rate and share of voice vs named competitors. */
export function weeklyStats(runs: TrackerRun[], competitors: string[]): WeekStat[] {
  const byWeek = new Map<string, TrackerRun[]>();
  for (const r of runs) if (!r.error) byWeek.set(r.week, [...(byWeek.get(r.week) ?? []), r]);
  return [...byWeek.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, rs]) => {
      const mentioned = rs.filter((r) => r.mentioned).length;
      const competitor: Record<string, number> = {};
      for (const c of competitors) competitor[c] = rs.filter((r) => r.competitors_mentioned.includes(c)).length;
      const totalMentions = mentioned + Object.values(competitor).reduce((s, n) => s + n, 0);
      const byEngine: WeekStat["byEngine"] = {};
      for (const r of rs) {
        const e = (byEngine[r.engine] ??= { total: 0, mentioned: 0 });
        e.total++;
        if (r.mentioned) e.mentioned++;
      }
      return {
        week,
        total: rs.length,
        mentioned,
        rate: rs.length ? mentioned / rs.length : 0,
        shareOfVoice: totalMentions ? mentioned / totalMentions : 0,
        competitor,
        byEngine,
      };
    });
}

export function latestWeekRuns(runs: TrackerRun[]) {
  const last = runs.reduce((m, r) => (r.week > m ? r.week : m), "");
  return runs.filter((r) => r.week === last);
}
