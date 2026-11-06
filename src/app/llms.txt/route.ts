import { plans, site } from "@/lib/site";
import { categories } from "@/lib/categories";

// Practise what we preach: Surfaced publishes its own llms.txt.
export function GET() {
  const body = [
    `# ${site.name}`,
    "",
    `> ${site.description}`,
    "",
    "## What we do",
    "- Free AI visibility audit: checks whether ChatGPT, Gemini, Perplexity and Claude name a business for local questions, checks the business's Google Maps rank and reviews, and scores five site factors.",
    "- Fix Pack: installs LocalBusiness schema, FAQ answers, llms.txt, AI crawler access and directory listings.",
    "- Weekly tracking: re-asks the same questions and reports share of voice against local competitors.",
    "",
    "## Pricing (AUD)",
    ...plans.map((p) => `- ${p.name}: $${p.price}${p.interval === "month" ? "/month" : " one-off"}. ${p.blurb}`),
    "",
    "## Who we work with",
    `- Local businesses in any city and country: ${categories.map((c) => c.plural.toLowerCase()).join(", ")}.`,
    "",
    "## Links",
    `- [Free audit](${site.url}/#audit)`,
    `- [Pricing](${site.url}/#pricing)`,
    `- Contact: ${site.contactEmail}`,
    "",
  ].join("\n");
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8" } });
}
