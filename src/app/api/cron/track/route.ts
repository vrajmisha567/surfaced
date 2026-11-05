import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";
import { db } from "@/lib/db";
import { trackClient, isoWeek } from "@/lib/tracker";

export const maxDuration = 300;

/** Weekly tracker. Vercel Cron calls this with `Authorization: Bearer $CRON_SECRET`. */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${env.cronSecret ?? ""}`;
  if (!env.cronSecret || auth.length !== expected.length || !timingSafeEqual(Buffer.from(auth), Buffer.from(expected))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const week = isoWeek();
  const clients = (await db.clients.list()).filter((c) => c.status === "active" && c.plan !== "fixpack" && c.website);
  const results = [];
  for (const c of clients) {
    const already = (await db.runs.forClient(c.id)).some((r) => r.week === week);
    if (already) {
      results.push({ client: c.name, skipped: true });
      continue;
    }
    try {
      results.push({ client: c.name, ...(await trackClient(c)) });
    } catch (e) {
      results.push({ client: c.name, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return NextResponse.json({ week, results });
}
