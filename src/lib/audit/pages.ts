import "server-only";
import type { Extracted } from "@/lib/types";
import { extract } from "./extract";
import { fetchPage } from "./fetch";

/*
  Many small business sites keep their address on /contact, FAQs on /faq and their
  service list on /services. Reading only the homepage marks them as "missing" things
  they actually have, so we also read up to four key inner pages and merge what we find.
  (OpenSEO crawls whole sites; for a local business these few pages carry the signals.)
*/

const KINDS: { kind: string; re: RegExp }[] = [
  { kind: "contact", re: /contact|get-in-touch|find-us|location|visit-us|book/i },
  { kind: "about", re: /about|our-story|who-we-are|team/i },
  { kind: "faq", re: /faq|questions|help/i },
  { kind: "services", re: /services?|treatments?|menu|what-we-do|pricing|prices/i },
  { kind: "areas", re: /areas?|suburbs?|service-area|locations/i },
];

const SKIP = /\.(pdf|jpe?g|png|gif|webp|svg|zip|docx?|xlsx?|mp4|mp3)(\?|$)|\/(wp-admin|wp-login|cart|checkout|account|login|feed|tag|category|author|page\/\d)/i;
/** Legal pages match "services" or "contact" words but carry none of the signals. */
const LEGAL = /privacy|terms|policy|agreement|disclaimer|cookie|conditions|legal/i;

export type KeyPage = { kind: string; url: string };

/** Picks up to `max` distinct key pages from the homepage's internal links, best match per kind first. */
export function pickKeyPages(links: string[], homeUrl: string, max = 4): KeyPage[] {
  const home = new URL(homeUrl);
  const seen = new Set([home.origin + home.pathname.replace(/\/$/, "")]);
  const picks: KeyPage[] = [];
  for (const { kind, re } of KINDS) {
    if (picks.length >= max) break;
    const candidates = links
      .filter((u) => {
        try {
          const p = new URL(u);
          return p.hostname === home.hostname && !SKIP.test(p.pathname) && !LEGAL.test(p.pathname) && re.test(p.pathname);
        } catch {
          return false;
        }
      })
      .map((u) => u.split("?")[0].replace(/\/$/, ""))
      // Shortest path first: /contact beats /blog/how-to-contact-us.
      .sort((a, b) => new URL(a).pathname.length - new URL(b).pathname.length);
    const pick = candidates.find((u) => !seen.has(u));
    if (pick) {
      seen.add(pick);
      picks.push({ kind, url: pick });
    }
  }
  return picks;
}

const uniq = <T,>(xs: T[]) => [...new Set(xs)];

/**
 * Fetches the key pages (in parallel, short timeout, failures ignored) and folds their
 * contact details, schema, FAQs and trust signals into the homepage's extraction.
 * Homepage-only measures (title, word count, headings, speed) are left untouched.
 */
export async function withKeyPages(home: Extracted, countryCode: string): Promise<Extracted> {
  const pages = pickKeyPages(home.internalLinks, home.finalUrl);
  if (!pages.length) return { ...home, pagesChecked: [{ kind: "home", url: home.finalUrl }], homePhones: home.phones };

  const results = await Promise.all(
    pages.map(async (p) => {
      try {
        const page = await Promise.race([
          fetchPage(p.url),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 9000)),
        ]);
        if (page.status >= 400) return null;
        return { ...p, x: extract(page.html, page.finalUrl, page.ms, page.renderer, countryCode) };
      } catch {
        return null;
      }
    }),
  );
  const got = results.filter((r): r is KeyPage & { x: Extracted } => !!r);
  const all = [home, ...got.map((g) => g.x)];

  return {
    ...home,
    phones: uniq(all.flatMap((x) => x.phones)),
    emails: uniq(all.flatMap((x) => x.emails)),
    addresses: uniq(all.flatMap((x) => x.addresses)),
    postcodes: uniq(all.flatMap((x) => x.postcodes)),
    schemaTypes: uniq(all.flatMap((x) => x.schemaTypes)),
    schemaBusiness: home.schemaBusiness ?? got.find((g) => g.x.schemaBusiness)?.x.schemaBusiness ?? null,
    sameAs: uniq(all.flatMap((x) => x.sameAs)),
    socialLinks: uniq(all.flatMap((x) => x.socialLinks)),
    hasFaq: all.some((x) => x.hasFaq),
    questionHeadings: uniq(all.flatMap((x) => x.questionHeadings)).slice(0, 15),
    hasReviewsMention: all.some((x) => x.hasReviewsMention),
    hasBizId: all.some((x) => x.hasBizId ?? x.hasAbn),
    bizIdLabel: home.bizIdLabel ?? got.find((g) => g.x.bizIdLabel)?.x.bizIdLabel,
    homePhones: home.phones,
    pagesChecked: [{ kind: "home", url: home.finalUrl }, ...got.map(({ kind, url }) => ({ kind, url }))],
  };
}
