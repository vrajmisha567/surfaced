import "server-only";
import type { AuditInput, AuditResult, Pillar } from "@/lib/types";
import { promptsFor } from "@/lib/categories";
import { placeOf } from "@/lib/locale";
import { enabledEngines } from "@/lib/ai/engines";
import { rivalsFrom, runMatrix } from "@/lib/ai/visibility";
import { fetchPage, normaliseUrl } from "./fetch";
import { extract } from "./extract";
import { checkCrawlers } from "./robots";
import { gradeFor, pillarMeta, scoreAi, scoreContent, scoreCrawl, scoreEntity, scoreLocal, scoreNap, scoreSchema, scoreSummary } from "./score";
import { checkLocal } from "./local";
import { withKeyPages } from "./pages";
import { checkPageSpeed } from "./pagespeed";

export async function runAudit(raw: AuditInput, opts: { aiPrompts?: number } = {}): Promise<AuditResult> {
  const t0 = Date.now();
  const url = normaliseUrl(raw.url);
  const place = placeOf(raw);
  const input: AuditInput = { ...raw, url, suburb: place.area, city: place.city, country: place.country };

  const engines = enabledEngines();
  const prompts = promptsFor(input.category, place, opts.aiPrompts ?? 3);
  const measured = engines.length > 0;

  // Google Maps first (one or two quick lookups): it tells the AI step the business's listing name,
  // so "Kinetic Rehab" typed in the form still matches "Kinetic Rehabilitation + Performance" in answers.
  const localAndAnswers = (async () => {
    const check = await checkLocal({ name: input.businessName, website: url, category: input.category }, place);
    const local = check.presence;
    const aliases = local?.found && local.name ? [local.name] : [];
    const answers = measured
      ? await runMatrix(engines, prompts, { name: input.businessName, website: url, aliases }, input.competitors ?? [], place, check.centre)
      : [];
    return { local, localError: check.error, answers };
  })();

  const [page, crawler, { local, localError, answers }, speed] = await Promise.all([
    fetchPage(url).catch((e: unknown) => e as Error),
    checkCrawlers(url).catch(() => null),
    localAndAnswers,
    checkPageSpeed(url),
  ]);

  const pillars: Pillar[] = [scoreAi(answers, measured), scoreLocal(local, localError)];
  let extracted = null;
  let fetchError: string | undefined;

  if (page instanceof Error) {
    const code = (page.cause as { code?: string } | undefined)?.code;
    fetchError =
      page.name === "AbortError" || page.message.includes("abort")
        ? "The site took too long to respond (over 15 seconds)."
        : code === "ENOTFOUND"
          ? "That domain doesn't resolve. Check the address, or the site may be offline."
          : code === "ECONNREFUSED" || code === "ECONNRESET"
            ? "The server refused the connection."
            : code?.startsWith("CERT") || code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE"
              ? "The site's SSL certificate is invalid. Browsers will show a security warning too."
              : `Couldn't load the site: ${page.message}`;
    for (const key of ["schema", "nap", "content", "entity", "crawl"] as const) {
      pillars.push({
        key,
        ...pillarMeta[key],
        score: 0,
        checks: [{ id: `${key}-unreachable`, label: "Site reachable", status: "fail", detail: fetchError, fix: "Make sure the site loads publicly over HTTPS.", weight: 1 }],
      });
    }
  } else {
    const home = { ...extract(page.html, page.finalUrl, page.ms, page.renderer, place.country), botBlocked: page.botBlocked };
    extracted = await withKeyPages(home, place.country);
    const cr = crawler ?? { robotsFound: false, blocked: [], allowed: [], llmsTxt: false, sitemap: false };
    pillars.push(scoreSchema(extracted, input), scoreNap(extracted, input), scoreContent(extracted, input), scoreEntity(extracted, input), scoreCrawl(extracted, cr, speed));
  }

  const ok = answers.filter((a) => !a.error);
  const { overall, visibility, readiness } = scoreSummary(pillars);
  return {
    input,
    overall,
    visibility,
    readiness,
    local,
    speed,
    grade: gradeFor(overall),
    pillars,
    extracted,
    crawler,
    ai: {
      measured,
      engines,
      prompts,
      answers,
      mentionRate: ok.length ? ok.filter((a) => a.mentioned).length / ok.length : null,
      topRivals: rivalsFrom(answers),
    },
    fetchError,
    ranAt: new Date().toISOString(),
    durationMs: Date.now() - t0,
  };
}
