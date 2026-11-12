import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomBytes, randomUUID } from "node:crypto";
import { env } from "@/lib/env";
import type { AuditRecord, AuditSummary, Client, Prospect, TrackerRun } from "@/lib/types";

/**
 * Storage. Uses Supabase when SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set,
 * otherwise a JSON file in .data/ so the app runs locally with zero setup.
 * All access is server-side; Supabase tables have RLS on with no public policies.
 */

type Tables = {
  audits: AuditRecord;
  prospects: Prospect;
  clients: Client;
  tracker_runs: TrackerRun;
};
type TableName = keyof Tables;

let sb: SupabaseClient | null = null;
function supabase() {
  if (!env.supabaseUrl || !env.supabaseServiceKey) return null;
  sb ??= createClient(env.supabaseUrl, env.supabaseServiceKey, { auth: { persistSession: false } });
  return sb;
}

export const usingSupabase = () => !!supabase();

/* ---------------- file store ---------------- */
// On Vercel only /tmp is writable, and it's per-instance and temporary: fine for a demo, not for real data.
const FILE = process.env.VERCEL ? path.join("/tmp", "surfaced.json") : path.join(process.cwd(), ".data", "surfaced.json");
type FileDb = { [K in TableName]: Tables[K][] };
let lock: Promise<unknown> = Promise.resolve();

async function readFile(): Promise<FileDb> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8")) as FileDb;
  } catch {
    return { audits: [], prospects: [], clients: [], tracker_runs: [] };
  }
}
async function mutate<T>(fn: (db: FileDb) => T): Promise<T> {
  const run = lock.then(async () => {
    const db = await readFile();
    const out = fn(db);
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    await fs.writeFile(FILE, JSON.stringify(db, null, 2));
    return out;
  });
  lock = run.catch(() => undefined);
  return run;
}

/* ---------------- generic helpers ---------------- */
type ListOpts<T> = { where?: Partial<T>; order?: keyof T; desc?: boolean; limit?: number };

async function list<K extends TableName>(table: K, opts: ListOpts<Tables[K]> = {}): Promise<Tables[K][]> {
  const s = supabase();
  if (s) {
    let q = s.from(table).select("*");
    for (const [k, v] of Object.entries(opts.where ?? {})) q = q.eq(k, v as string);
    q = q.order(String(opts.order ?? "created_at"), { ascending: !(opts.desc ?? true) });
    if (opts.limit) q = q.limit(opts.limit);
    const { data, error } = await q;
    if (error) throw new Error(`${table}.list: ${error.message}`);
    return (data ?? []) as Tables[K][];
  }
  const db = await readFile();
  let rows = db[table] as Tables[K][];
  for (const [k, v] of Object.entries(opts.where ?? {})) rows = rows.filter((r) => (r as Record<string, unknown>)[k] === v);
  const key = (opts.order ?? "created_at") as keyof Tables[K];
  const dir = opts.desc ?? true ? -1 : 1;
  rows = [...rows].sort((a, b) => (String(a[key]) < String(b[key]) ? -dir : String(a[key]) > String(b[key]) ? dir : 0));
  return opts.limit ? rows.slice(0, opts.limit) : rows;
}

async function get<K extends TableName>(table: K, id: string): Promise<Tables[K] | null> {
  const s = supabase();
  if (s) {
    const { data, error } = await s.from(table).select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(`${table}.get: ${error.message}`);
    return data as Tables[K] | null;
  }
  const db = await readFile();
  return ((db[table] as Tables[K][]).find((r) => (r as { id: string }).id === id) ?? null) as Tables[K] | null;
}

async function insert<K extends TableName>(table: K, row: Omit<Tables[K], "id" | "created_at"> & Partial<Pick<Tables[K], "id" | "created_at">>): Promise<Tables[K]> {
  const full = { id: randomUUID(), created_at: new Date().toISOString(), ...row } as Tables[K];
  const s = supabase();
  if (s) {
    const { data, error } = await s.from(table).insert(full).select("*").single();
    if (error) throw new Error(`${table}.insert: ${error.message}`);
    return data as Tables[K];
  }
  await mutate((db) => {
    (db[table] as Tables[K][]).push(full);
  });
  return full;
}

async function insertMany<K extends TableName>(table: K, rows: Omit<Tables[K], "id" | "created_at">[]): Promise<void> {
  if (!rows.length) return;
  const now = new Date().toISOString();
  const full = rows.map((r) => ({ id: randomUUID(), created_at: now, ...r })) as Tables[K][];
  const s = supabase();
  if (s) {
    const { error } = await s.from(table).insert(full);
    if (error) throw new Error(`${table}.insertMany: ${error.message}`);
    return;
  }
  await mutate((db) => {
    (db[table] as Tables[K][]).push(...full);
  });
}

async function update<K extends TableName>(table: K, id: string, patch: Partial<Tables[K]>): Promise<Tables[K] | null> {
  const s = supabase();
  if (s) {
    const { data, error } = await s.from(table).update(patch as never).eq("id", id).select("*").maybeSingle();
    if (error) throw new Error(`${table}.update: ${error.message}`);
    return data as Tables[K] | null;
  }
  return mutate((db) => {
    const rows = db[table] as Tables[K][];
    const i = rows.findIndex((r) => (r as { id: string }).id === id);
    if (i < 0) return null;
    rows[i] = { ...rows[i], ...patch };
    return rows[i];
  });
}

async function remove(table: TableName, id: string) {
  const s = supabase();
  if (s) {
    const { error } = await s.from(table).delete().eq("id", id);
    if (error) throw new Error(`${table}.remove: ${error.message}`);
    return;
  }
  await mutate((db) => {
    (db[table] as { id: string }[]) = (db[table] as { id: string }[]).filter((r) => r.id !== id);
  });
}

/* ---------------- domain API ---------------- */
export const db = {
  audits: {
    list: (limit = 100) => list("audits", { limit }),
    get: (id: string) => get("audits", id),
    create: (row: Omit<AuditRecord, "id" | "created_at">) => insert("audits", row),
    forClient: (clientId: string) => list("audits", { where: { client_id: clientId }, order: "created_at", desc: false }),
    /** A customer's audits: run while signed in, or sent to their email. Newest first, without the heavy result. */
    forAccount: async (userId: string, email: string) => {
      type Row = Pick<AuditRecord, "id" | "created_at" | "url" | "business_name" | "suburb" | "city" | "country" | "category" | "overall_score" | "user_id">;
      const cols = "id,created_at,url,business_name,suburb,city,country,category,overall_score,user_id";
      const s = supabase();
      let rows: Row[];
      if (s) {
        const [a, b] = await Promise.all([
          s.from("audits").select(cols).eq("user_id", userId).order("created_at", { ascending: false }).limit(200),
          s.from("audits").select(cols).ilike("email", email.replace(/[%_\\]/g, (c) => `\\${c}`)).order("created_at", { ascending: false }).limit(200),
        ]);
        if (a.error) throw new Error(`audits.forAccount: ${a.error.message}`);
        rows = [...(a.data ?? []), ...(b.data ?? [])] as Row[];
      } else {
        const all = await list("audits", {});
        rows = all.filter((r) => r.user_id === userId || (r.email ?? "").toLowerCase() === email.toLowerCase());
      }
      const seen = new Set<string>();
      return rows.filter((r) => !seen.has(r.id) && seen.add(r.id)).sort((x, y) => (x.created_at < y.created_at ? 1 : -1));
    },
    /** Attach an unclaimed audit to an account (from a report's "save to my account" link). */
    claim: async (id: string, userId: string) => {
      const a = await get("audits", id);
      if (!a || a.user_id) return false;
      await update("audits", id, { user_id: userId } as Partial<AuditRecord>);
      return true;
    },
    /** Slim rows for the public stats page: no answers, page text or contact details. */
    summaries: async (limit = 5000): Promise<AuditSummary[]> => {
      const s = supabase();
      if (s) {
        const { data, error } = await s
          .from("audits")
          .select(
            "created_at,category,city,country,business_name,overall_score,visibility:result->visibility,readiness:result->readiness,pillars:result->pillars,mentionRate:result->ai->mentionRate,aiMeasured:result->ai->measured,top3:result->local->top3,spots:result->local->spots,mapsRank:result->local->rank",
          )
          .order("created_at", { ascending: false })
          .limit(limit);
        if (error) throw new Error(`audits.summaries: ${error.message}`);
        return (data ?? []) as unknown as AuditSummary[];
      }
      const rows = await list("audits", { limit });
      return rows.map((r) => ({
        created_at: r.created_at,
        category: r.category,
        city: r.city,
        country: r.country,
        business_name: r.business_name,
        overall_score: r.overall_score,
        visibility: r.result.visibility ?? null,
        readiness: r.result.readiness ?? null,
        pillars: r.result.pillars,
        mentionRate: r.result.ai?.mentionRate ?? null,
        aiMeasured: r.result.ai?.measured ?? false,
        top3: r.result.local?.top3 ?? null,
        spots: r.result.local?.spots ?? null,
        mapsRank: r.result.local?.rank ?? null,
      }));
    },
  },
  prospects: {
    list: () => list("prospects", { limit: 500 }),
    get: (id: string) => get("prospects", id),
    create: (row: Omit<Prospect, "id" | "created_at">) => insert("prospects", row),
    update: (id: string, patch: Partial<Prospect>) => update("prospects", id, patch),
    remove: (id: string) => remove("prospects", id),
  },
  clients: {
    list: () => list("clients"),
    get: (id: string) => get("clients", id),
    byToken: async (token: string) => {
      if (!/^[a-f0-9]{32}$/.test(token)) return null;
      const rows = await list("clients", { where: { share_token: token }, limit: 1 });
      return rows[0] ?? null;
    },
    create: (row: Omit<Client, "id" | "created_at" | "share_token">) => insert("clients", { ...row, share_token: randomBytes(16).toString("hex") }),
    update: (id: string, patch: Partial<Client>) => update("clients", id, patch),
  },
  /**
   * Shared cache for paid lookups (Google Maps searches). Supabase only; without it callers
   * just use their in-memory cache. Never throws: a cache failure must not break an audit.
   */
  cache: {
    get: async <T>(key: string, maxAgeMs: number): Promise<T | null> => {
      const s = supabase();
      if (!s) return null;
      try {
        const since = new Date(Date.now() - maxAgeMs).toISOString();
        const { data } = await s.from("places_cache").select("data").eq("key", key).gte("created_at", since).maybeSingle();
        return (data?.data as T) ?? null;
      } catch {
        return null;
      }
    },
    set: async (key: string, value: unknown): Promise<void> => {
      const s = supabase();
      if (!s) return;
      try {
        await s.from("places_cache").upsert({ key, data: value, created_at: new Date().toISOString() });
        // Now and then, drop entries nothing will read again (the longest TTL is 30 days).
        if (Math.random() < 0.02) await s.from("places_cache").delete().lt("created_at", new Date(Date.now() - 31 * 86_400_000).toISOString());
      } catch {
        /* ignore */
      }
    },
  },
  runs: {
    forClient: (clientId: string) => list("tracker_runs", { where: { client_id: clientId }, order: "created_at", desc: false, limit: 5000 }),
    createMany: (rows: Omit<TrackerRun, "id" | "created_at">[]) => insertMany("tracker_runs", rows),
  },
};
