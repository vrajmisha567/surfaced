import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/app", "/c/", "/report/", "/api/", "/console", "/account", "/auth/"] },
      { userAgent: ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "PerplexityBot", "ClaudeBot", "Claude-SearchBot", "Google-Extended"], allow: "/", disallow: ["/app", "/c/", "/report/", "/api/"] },
    ],
    sitemap: `${site.url}/sitemap.xml`,
  };
}
