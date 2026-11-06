import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, ExternalLink, KeyRound, LogOut, Plus } from "lucide-react";
import { signOut } from "@/app/auth/actions";
import { Reveal } from "@/components/fx";
import { Card, Label, LinkButton, Logo, ScoreRing, scoreWord } from "@/components/ui";
import { getCategory } from "@/lib/categories";
import { db } from "@/lib/db";
import { placeLabel } from "@/lib/locale";
import { plans } from "@/lib/site";
import { currentAccount } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your account", robots: { index: false } };

const UUID = /^[0-9a-f-]{36}$/;

export default async function AccountPage({ searchParams }: PageProps<"/account">) {
  const sp = await searchParams;
  const me = await currentAccount();
  if (!me) redirect(`/login?next=${encodeURIComponent(sp.claim ? `/account?claim=${sp.claim}` : "/account")}`);

  // "Save this report to my account" links land here with ?claim=<audit id>.
  let claimed = false;
  if (typeof sp.claim === "string" && UUID.test(sp.claim)) claimed = await db.audits.claim(sp.claim, me.id).catch(() => false);

  const [audits, clients] = await Promise.all([db.audits.forAccount(me.id, me.email).catch(() => []), db.clients.list().catch(() => [])]);
  const myPlans = clients.filter((c) => c.status !== "cancelled" && (c.contact_email ?? "").toLowerCase() === me.email.toLowerCase());
  const businesses = new Set(audits.map((a) => a.url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/.*$/, ""))).size;
  const best = audits.length ? Math.max(...audits.map((a) => a.overall_score)) : null;
  const latest = audits[0] ?? null;
  const firstName = (me.name ?? me.email.split("@")[0]).split(" ")[0];
  const initial = (me.name ?? me.email).trim()[0]?.toUpperCase() ?? "?";

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-line/70 bg-paper/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Logo />
          <div className="flex items-center gap-3">
            <LinkButton href="/#audit" size="sm" className="fx-sheen">
              <Plus size={14} /> New audit
            </LinkButton>
            {me.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={me.avatar} alt="" referrerPolicy="no-referrer" className="h-8 w-8 rounded-full border border-line object-cover" />
            ) : (
              <span className="grid h-8 w-8 place-items-center rounded-full bg-ink text-sm font-semibold text-white">{initial}</span>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-12">
        <Reveal>
          <Label>Your account</Label>
          <h1 className="mt-3 text-[38px] font-semibold leading-[1.08] tracking-[-0.03em]">
            Hi {firstName}, <span className="serif text-[1.08em]">here&apos;s where you stand.</span>
          </h1>
        </Reveal>

        {(claimed || sp.updated === "password") && (
          <p className="mt-6 rounded-lg border border-accent/25 bg-accent-soft px-4 py-3 text-sm text-accent-ink">
            {claimed ? "Report saved to your account." : "Your new password is saved."}
          </p>
        )}

        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            ["Audits", String(audits.length), audits.length === 1 ? "report saved" : "reports saved"],
            ["Businesses", String(businesses), "checked so far"],
            ["Latest score", latest ? `${latest.overall_score}` : "—", latest ? `${scoreWord(latest.overall_score)} · ${new Date(latest.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}` : "Run your first audit"],
            ["Best score", best == null ? "—" : String(best), "out of 100"],
          ].map(([l, v, s]) => (
            <Card key={l} className="p-5">
              <Label>{l}</Label>
              <div className="tabular mt-3 text-[34px] font-semibold leading-none tracking-tight">{v}</div>
              <div className="mt-2 text-xs text-muted">{s}</div>
            </Card>
          ))}
        </div>

        <div className="mt-4 grid gap-4 [&>*]:min-w-0 lg:grid-cols-[1fr_320px]">
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-6 py-4">
              <div className="font-semibold tracking-tight">Your audits</div>
              <Link href="/#audit" className="inline-flex items-center gap-1 text-sm text-accent hover:underline">
                Run another <ArrowRight size={14} />
              </Link>
            </div>
            {audits.length === 0 ? (
              <div className="px-6 py-14 text-center">
                <div className="font-medium">Run your first audit</div>
                <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted">See whether ChatGPT, Gemini and Google Maps name your business. It takes about 45 seconds and is saved here automatically.</p>
                <LinkButton href="/#audit" className="fx-sheen mt-6">
                  Run a free audit <ArrowRight size={15} />
                </LinkButton>
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {audits.map((a) => (
                  <li key={a.id}>
                    <Link href={`/report/${a.id}`} className="group flex items-center gap-4 px-6 py-4 transition-colors hover:bg-paper">
                      <ScoreRing score={a.overall_score} size={48} stroke={5} label=" " />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{a.business_name}</div>
                        <div className="mt-0.5 truncate text-sm text-muted">
                          {getCategory(a.category).label} · {placeLabel(a)} · {a.url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
                        </div>
                      </div>
                      <div className="hidden text-right text-xs text-muted sm:block">
                        {new Date(a.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                      </div>
                      <ArrowRight size={16} className="text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <div className="space-y-4">
            {myPlans.map((c) => (
              <Card key={c.id} className="border-ink bg-night p-6 text-white">
                <div className="label !text-faint">Your plan</div>
                <div className="mt-2 text-xl font-semibold tracking-tight">{plans.find((p) => p.id === c.plan)?.name ?? "Pilot"}</div>
                <p className="mt-1 text-sm text-[#a9b4c6]">{c.name}: weekly tracking and fixes.</p>
                <a href={`/c/${c.share_token}`} className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-[#5fd3a5] hover:underline">
                  Open your dashboard <ExternalLink size={14} />
                </a>
              </Card>
            ))}

            <Card className="p-6">
              <div className="flex items-center gap-3">
                {me.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={me.avatar} alt="" referrerPolicy="no-referrer" className="h-11 w-11 rounded-full border border-line object-cover" />
                ) : (
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-ink font-semibold text-white">{initial}</span>
                )}
                <div className="min-w-0">
                  <div className="truncate font-medium">{me.name ?? firstName}</div>
                  <div className="truncate text-sm text-muted">{me.email}</div>
                </div>
              </div>
              <div className="label mt-4">Signed in with {me.provider === "google" ? "Google" : "email and password"}</div>
              <div className="mt-5 space-y-1 border-t border-line pt-4 text-sm">
                {me.provider !== "google" && (
                  <Link href="/account/password" className="flex items-center gap-2 rounded-md px-2 py-2 text-ink-2 hover:bg-paper-2 hover:text-ink">
                    <KeyRound size={15} /> Change password
                  </Link>
                )}
                <form action={signOut}>
                  <button className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-ink-2 hover:bg-paper-2 hover:text-ink">
                    <LogOut size={15} /> Sign out
                  </button>
                </form>
              </div>
            </Card>

            {myPlans.length === 0 && (
              <Card className="p-6">
                <div className="font-semibold tracking-tight">Want us to fix it?</div>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-2">The Fix Pack installs everything your report flags. Monthly plans track you every week.</p>
                <Link href="/#pricing" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline">
                  See plans <ArrowRight size={14} />
                </Link>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
