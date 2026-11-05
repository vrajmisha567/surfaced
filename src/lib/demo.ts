import "server-only";
import { db } from "@/lib/db";
import { promptsFor } from "@/lib/categories";
import { isoWeek } from "@/lib/tracker";
import type { EngineId, FixItem } from "@/lib/types";

/**
 * Creates a clearly-labelled sample client with 10 weeks of synthetic tracking data,
 * so the dashboard can be shown (portfolio, sales calls) before real clients exist.
 */
export async function seedDemoClient() {
  const name = "Sample Plumbing Co (demo data)";
  const existing = (await db.clients.list()).find((c) => c.name === name);
  if (existing) return existing;

  const competitors = ["Parade Plumbing", "Eastside Plumbers", "Kent Town Gas & Water"];
  const prompts = promptsFor("plumber", "Norwood", 5);
  const fixes: FixItem[] = [
    ["schema-local", "Add a Plumber (LocalBusiness) JSON-LD block with name, address, phone, hours and service area.", "schema", true],
    ["crawl-ai-bots", "Remove Disallow rules for GPTBot, OAI-SearchBot, PerplexityBot, ClaudeBot and Google-Extended.", "crawl", true],
    ["content-faq", "Add 5-8 FAQs locals actually ask.", "content", true],
    ["crawl-llms", "Publish an llms.txt summarising your business, services and key pages.", "crawl", true],
    ["entity-gbp", "Link your Google Business Profile from the site and from sameAs schema.", "entity", true],
    ["nap-address", "Show your full street address in the footer.", "nap", true],
    ["entity-reviews", "Show recent Google reviews on the homepage.", "entity", false],
    ["content-services", "Give each main service its own page with pricing guidance and FAQs.", "content", false],
    ["entity-abn", "Show your ABN in the footer.", "entity", false],
  ].map(([id, title, pillar, done]) => ({ id: id as string, title: title as string, pillar: pillar as FixItem["pillar"], done: done as boolean, done_at: done ? new Date().toISOString() : null }));

  const client = await db.clients.create({
    name,
    website: "https://example.com",
    suburb: "Norwood",
    category: "plumber",
    contact_name: null,
    contact_email: null,
    plan: "visibility",
    status: "active",
    monthly_value: 0,
    competitors,
    prompts,
    fixes,
    stripe_customer_id: null,
    baseline_audit_id: null,
  });

  const engines: EngineId[] = ["chatgpt", "gemini", "perplexity", "claude"];
  // Deterministic pseudo-random so the demo looks the same every time.
  let seed = 7;
  const rand = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  const rows = [];
  for (let w = 9; w >= 0; w--) {
    const week = isoWeek(new Date(Date.now() - w * 7 * 864e5));
    const progress = (9 - w) / 9; // client improves over time
    for (const prompt of prompts)
      for (const engine of engines) {
        const mentioned = rand() < 0.08 + progress * 0.5;
        const compsHit = competitors.filter((_, i) => rand() < [0.55, 0.35, 0.2][i] - progress * [0.15, 0.1, 0.05][i]);
        rows.push({
          client_id: client.id,
          week,
          engine,
          prompt,
          mentioned,
          position: mentioned ? 1 + Math.floor(rand() * 3) : null,
          competitors_mentioned: compsHit,
          others_named: compsHit,
          answer: "(demo data)",
          citations: [],
          error: null,
        });
      }
  }
  await db.runs.createMany(rows);
  return client;
}
