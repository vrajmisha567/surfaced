import "server-only";
import type { CrawlerAccess } from "@/lib/types";
import { fetchText } from "./fetch";

/** Crawlers that feed AI answers. Blocking these makes a business invisible to that engine. */
export const AI_BOTS = [
  { ua: "GPTBot", engine: "ChatGPT (training)" },
  { ua: "OAI-SearchBot", engine: "ChatGPT search" },
  { ua: "ChatGPT-User", engine: "ChatGPT browsing" },
  { ua: "PerplexityBot", engine: "Perplexity" },
  { ua: "ClaudeBot", engine: "Claude" },
  { ua: "Claude-SearchBot", engine: "Claude search" },
  { ua: "Google-Extended", engine: "Gemini" },
  { ua: "Bingbot", engine: "Copilot / Bing" },
];

type Group = { agents: string[]; disallow: string[]; allow: string[] };

function parseRobots(txt: string): Group[] {
  const groups: Group[] = [];
  let cur: Group | null = null;
  let lastWasAgent = false;
  for (const rawLine of txt.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*/, "").trim();
    if (!line) continue;
    const idx = line.indexOf(":");
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const val = line.slice(idx + 1).trim();
    if (key === "user-agent") {
      if (!cur || !lastWasAgent) {
        cur = { agents: [], disallow: [], allow: [] };
        groups.push(cur);
      }
      cur.agents.push(val.toLowerCase());
      lastWasAgent = true;
    } else {
      lastWasAgent = false;
      if (!cur) continue;
      if (key === "disallow") cur.disallow.push(val);
      if (key === "allow") cur.allow.push(val);
    }
  }
  return groups;
}

function blocksRoot(groups: Group[], ua: string) {
  const lower = ua.toLowerCase();
  const specific = groups.filter((g) => g.agents.includes(lower));
  const applicable = specific.length ? specific : groups.filter((g) => g.agents.includes("*"));
  return applicable.some((g) => g.disallow.includes("/") && !g.allow.includes("/"));
}

export async function checkCrawlers(siteUrl: string): Promise<CrawlerAccess> {
  const origin = new URL(siteUrl).origin;
  const [robots, llms, sitemap] = await Promise.all([
    fetchText(`${origin}/robots.txt`),
    fetchText(`${origin}/llms.txt`),
    fetchText(`${origin}/sitemap.xml`),
  ]);

  const robotsFound = robots.ok && !/<html/i.test(robots.text);
  const groups = robotsFound ? parseRobots(robots.text) : [];
  const blocked: string[] = [];
  const allowed: string[] = [];
  for (const bot of AI_BOTS) {
    (blocksRoot(groups, bot.ua) ? blocked : allowed).push(bot.ua);
  }
  const sitemapInRobots = /sitemap:/i.test(robots.text);

  return {
    robotsFound,
    blocked,
    allowed,
    llmsTxt: llms.ok && llms.text.trim().length > 20 && !/<html/i.test(llms.text),
    sitemap: (sitemap.ok && /<urlset|<sitemapindex/i.test(sitemap.text)) || sitemapInRobots,
  };
}
