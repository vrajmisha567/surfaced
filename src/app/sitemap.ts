import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: site.url, changeFrequency: "weekly", priority: 1 },
    { url: `${site.url}/stats`, changeFrequency: "daily", priority: 0.7 },
    { url: `${site.url}/open`, changeFrequency: "daily", priority: 0.5 },
    { url: `${site.url}/llms.txt`, changeFrequency: "monthly", priority: 0.3 },
  ];
}
