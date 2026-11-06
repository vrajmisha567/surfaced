import { Check, Minus, X } from "lucide-react";
import type { AuditResult, EngineId } from "@/lib/types";
import { getCategory } from "@/lib/categories";
import { Card, Label, ScoreBar, ScoreRing, StatusPill, scoreWord } from "./ui";
import { longPlace, placeOf, shortPlace } from "@/lib/locale";

const engineName: Record<EngineId, string> = { chatgpt: "ChatGPT", gemini: "Gemini", perplexity: "Perplexity", claude: "Claude", ollama: "Open model" };

export function ReportView({ r, id, createdAt }: { r: AuditResult; id: string; createdAt: string }) {
  const cat = getCategory(r.input.category);
  const host = (() => {
    try {
      return new URL(r.input.url).hostname.replace(/^www\./, "");
    } catch {
      return r.input.url;
    }
  })();
  const ok = r.ai.answers.filter((a) => !a.error);
  const hits = ok.filter((a) => a.mentioned);
  // Engines were on but none answered (outage, no credits): report it as not run, not as "0 of 0".
  const ran = r.ai.measured && ok.length > 0;
  const priority = r.pillars
    .flatMap((p) => p.checks.filter((c) => c.status === "fail" && c.fix).map((c) => ({ ...c, pillar: p.label })))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 5);

  const local = r.local;
  const where = shortPlace(placeOf(r.input));
  const mapsPart = !local
    ? null
    : local.rank
      ? `ranks #${local.rank} on Google Maps for “${local.query}”`
      : local.found
        ? `isn't in the Google Maps top 20 for “${local.query}”`
        : "has no Google Maps listing we could match to this name and website";
  const aiPart = !ran
    ? null
    : hits.length
      ? `was named in ${hits.length} of ${ok.length} AI answers`
      : `wasn't named in any of ${ok.length} AI answers about ${cat.plural.toLowerCase()} in ${where}`;
  const rival = r.ai.topRivals[0];
  const verdict =
    mapsPart || aiPart
      ? `${r.input.businessName} ${[mapsPart, aiPart].filter(Boolean).join(", and ")}.${rival && hits.length < ok.length / 2 ? ` ${rival.name} was named ${rival.count} time${rival.count === 1 ? "" : "s"}.` : ""}`
      : `Your site scores ${r.overall}/100 on the factors AI engines use to decide which ${cat.plural.toLowerCase()} to recommend.`;
  const split = r.visibility !== undefined;
  let section = 0;
  const next = () => String(++section).padStart(2, "0");

  return (
    <div className="space-y-8">
      {/* Summary */}
      <Card className="overflow-hidden">
        <div className="grid gap-8 p-6 sm:p-8 md:grid-cols-[auto_1fr] md:items-center">
          <ScoreRing score={r.overall} />
          <div>
            <Label>
              AI visibility report · {new Date(createdAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })} · #{id.slice(0, 8)}
            </Label>
            <h1 className="mt-2 text-[30px] font-semibold leading-tight tracking-tight">{r.input.businessName}</h1>
            <div className="mt-1 text-sm text-muted">
              {host} · {cat.label} · {longPlace(placeOf(r.input))}
            </div>
            <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-ink-2">{verdict}</p>
            {r.fetchError && <p className="mt-3 rounded-md bg-bad-soft px-3 py-2 text-sm text-bad">{r.fetchError}</p>}
          </div>
        </div>
        <div className="grid grid-cols-2 border-t border-line md:grid-cols-4 md:divide-x md:divide-line">
          {split ? (
            <>
              <Stat label="Visible now" value={r.visibility == null ? "—" : `${r.visibility}/100`} hint="AI answers + Google Maps" />
              <Stat label="Site readiness" value={r.readiness == null ? "—" : `${r.readiness}/100`} hint="What keeps you there" />
              <Stat label="Named by AI" value={ran ? `${hits.length} / ${ok.length}` : r.ai.measured ? "No reply" : "Not run"} />
              <Stat label="Google Maps" value={!local ? "—" : local.rank ? `#${local.rank}` : local.found ? "Not top 20" : "No listing"} />
            </>
          ) : (
            <>
              <Stat label="Overall grade" value={`${r.grade} · ${scoreWord(r.overall)}`} />
              <Stat label="Named by AI" value={ran ? `${hits.length} / ${ok.length}` : r.ai.measured ? "No reply" : "Not run"} />
              <Stat label="Engines checked" value={r.ai.measured ? r.ai.engines.map((e) => engineName[e]).join(", ") : "—"} small />
              <Stat label="Most-named rival" value={r.ai.topRivals[0]?.name ?? "—"} small />
            </>
          )}
        </div>
      </Card>

      {/* AI answers */}
      {r.ai.measured && (
        <section>
          <SectionHead
            n={next()}
            title="What AI assistants said"
            sub={`We asked ${r.ai.engines.map((e) => engineName[e]).join(", ")} the questions people type. Named = your business appeared in the answer.`}
          />
          <Card className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-line text-left">
                  <th className="label px-5 py-3 font-normal">Question</th>
                  {r.ai.engines.map((e) => (
                    <th key={e} className="label px-3 py-3 text-center font-normal">{engineName[e]}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {r.ai.prompts.map((p) => (
                  <tr key={p}>
                    <td className="px-5 py-3.5 text-ink-2">“{p}”</td>
                    {r.ai.engines.map((e) => {
                      const a = r.ai.answers.find((x) => x.prompt === p && x.engine === e);
                      return (
                        <td key={e} className="px-3 py-3.5 text-center">
                          {!a || a.error ? (
                            <span className="inline-flex items-center gap-1 text-xs text-muted" title={a?.error}><Minus size={13} /> No reply</span>
                          ) : a.mentioned ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-good-soft px-1.5 py-0.5 text-xs font-medium text-good"><Check size={13} /> Named{a.position ? ` #${a.position}` : ""}</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-md bg-bad-soft px-1.5 py-0.5 text-xs font-medium text-bad"><X size={13} /> Not named</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          {ok.some((a) => a.grounding === "maps") && (
            <p className="mt-3 text-xs leading-relaxed text-muted">
              Gemini answered each question from the live Google Maps results for it, the same local data the Gemini app leans on for
              “best {cat.label.toLowerCase()} in {placeOf(r.input).city}” questions. Answers can still vary a little each time they're asked.
            </p>
          )}
          {ok.some((a) => a.grounded === false && a.grounding !== "maps") && (
            <p className="mt-3 text-xs leading-relaxed text-muted">
              Some answers came from the engine's own knowledge, without a live web search. They show what the model already
              believes about local {cat.plural.toLowerCase()}, which can lag behind recent changes to your site.
            </p>
          )}

          <div className="mt-4 grid gap-3">
            {ok.slice(0, 12).map((a, i) => (
              <details key={i} className="group rounded-xl border border-line bg-card">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-3.5 text-sm">
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="label w-20 shrink-0">{engineName[a.engine]}</span>
                    <span className="truncate text-ink-2">{a.prompt}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-3">
                    {a.othersNamed.length > 0 && <span className="hidden text-xs text-muted sm:inline">{a.othersNamed.length} businesses named</span>}
                    <span className="font-mono text-muted transition-transform group-open:rotate-45">+</span>
                  </span>
                </summary>
                <div className="border-t border-line px-5 py-4">
                  {a.othersNamed.length > 0 && (
                    <div className="mb-3 flex flex-wrap items-center gap-1.5">
                      <span className="label mr-1">Named</span>
                      {a.othersNamed.map((n) => (
                        <span key={n} className="rounded-md border border-line bg-paper px-2 py-0.5 text-xs">{n}</span>
                      ))}
                    </div>
                  )}
                  <p className="whitespace-pre-line text-[13px] leading-relaxed text-ink-2">{a.answer.slice(0, 1800)}{a.answer.length > 1800 ? "…" : ""}</p>
                  {a.citations.length > 0 && (
                    <div className="mt-3 text-xs text-muted">
                      Sources: {a.citations.slice(0, 5).map((c) => { try { return new URL(c.url).hostname.replace(/^www\./, ""); } catch { return c.url; } }).join(" · ")}
                    </div>
                  )}
                </div>
              </details>
            ))}
          </div>
        </section>
      )}

      {/* Google Maps */}
      {local && (
        <section>
          <SectionHead n={next()} title="Google Maps" sub={`What Google shows for “${local.query}”. Gemini and Google's AI lean on this for local questions.`} />
          <Card className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-line text-left">
                  <th className="label px-5 py-3 font-normal">Rank</th>
                  <th className="label px-3 py-3 font-normal">Business</th>
                  <th className="label px-3 py-3 text-right font-normal">Rating</th>
                  <th className="label px-5 py-3 text-right font-normal">Reviews</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {local.leaders.map((l, i) => {
                  const you = local.rank === i + 1;
                  return (
                    <tr key={l.name} className={you ? "bg-good-soft" : ""}>
                      <td className="px-5 py-3 font-mono text-muted">#{i + 1}</td>
                      <td className="px-3 py-3">
                        {l.name}
                        {you && <span className="label ml-2 text-good">You</span>}
                      </td>
                      <td className="tabular px-3 py-3 text-right">{l.rating ? l.rating.toFixed(1) : "—"}</td>
                      <td className="tabular px-5 py-3 text-right">{l.reviews.toLocaleString()}</td>
                    </tr>
                  );
                })}
                {!(local.rank && local.rank <= 3) && (
                  <tr className="bg-paper">
                    <td className="px-5 py-3 font-mono text-muted">{local.rank ? `#${local.rank}` : "—"}</td>
                    <td className="px-3 py-3">
                      {local.name ?? r.input.businessName}
                      <span className="label ml-2">You{local.found ? (local.rank ? "" : " · not in top 20") : " · no listing found"}</span>
                    </td>
                    <td className="tabular px-3 py-3 text-right">{local.rating ? local.rating.toFixed(1) : "—"}</td>
                    <td className="tabular px-5 py-3 text-right">{(local.reviews ?? 0).toLocaleString()}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>
        </section>
      )}

      {/* Priority fixes */}
      {priority.length > 0 && (
        <section>
          <SectionHead n={next()} title="Fix these first" sub="Ranked by how much each one affects whether AI engines can find and trust you." />
          <Card className="divide-y divide-line">
            {priority.map((c, i) => (
              <div key={c.id} className="grid grid-cols-[2rem_1fr] gap-3 px-5 py-4 sm:grid-cols-[2rem_1fr_10rem]">
                <span className="font-mono text-sm text-accent">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <div className="font-medium">{c.fix}</div>
                  <div className="mt-0.5 text-sm text-muted">{c.detail}</div>
                </div>
                <div className="label hidden text-right sm:block">{c.pillar}</div>
              </div>
            ))}
          </Card>
        </section>
      )}

      {/* Pillars */}
      <section>
        <SectionHead
          n={next()}
          title="Every check, by area"
          sub={
            split
              ? "Visible now = AI answers and Google Maps (75% of your score). Site readiness = the five site areas that keep you there (25%)."
              : "Each area is weighted by how much it matters to AI recommendations."
          }
        />
        <div className="grid gap-4 lg:grid-cols-2">
          {r.pillars.map((p) => (
            <Card key={p.key} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-medium">{p.label}</div>
                  <div className="mt-0.5 text-sm text-muted">{p.summary}</div>
                </div>
                <div className="tabular text-2xl font-semibold">{p.score ?? "—"}</div>
              </div>
              <ScoreBar score={p.score} className="mt-3" />
              <ul className="mt-4 divide-y divide-line">
                {p.checks.map((c) => (
                  <li key={c.id} className="py-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm">{c.label}</span>
                      <StatusPill status={c.status} />
                    </div>
                    <div className="mt-0.5 text-xs text-muted">{c.detail}</div>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, small, hint }: { label: string; value: string; small?: boolean; hint?: string }) {
  return (
    <div className="px-6 py-4">
      <Label>{label}</Label>
      <div className={`mt-1.5 font-semibold ${small ? "text-sm" : "tabular text-lg"}`}>{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted">{hint}</div>}
    </div>
  );
}

function SectionHead({ n, title, sub }: { n: string; title: string; sub: string }) {
  return (
    <div className="mb-4 flex items-baseline gap-4">
      <span className="font-mono text-sm text-accent">{n}</span>
      <div>
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        <p className="mt-0.5 text-sm text-muted">{sub}</p>
      </div>
    </div>
  );
}
