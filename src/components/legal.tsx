import { SiteFooter, SiteHeader } from "./site-chrome";
import { Label } from "./ui";

/** Shared frame for the privacy policy and terms: readable column, numbered sections. */
export function LegalPage({ title, updated, intro, children }: { title: string; updated: string; intro: React.ReactNode; children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <article className="mx-auto max-w-3xl px-5 py-16 sm:py-20">
          <Label>Last updated {updated}</Label>
          <h1 className="mt-3 text-[40px] font-semibold leading-[1.08] tracking-[-0.03em]">{title}</h1>
          <div className="mt-5 text-[17px] leading-relaxed text-ink-2">{intro}</div>
          <div className="legal mt-10 space-y-10 border-t border-line pt-10">{children}</div>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}

export function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-3 sm:grid-cols-[3rem_1fr]">
      <span className="font-mono text-sm text-accent">{String(n).padStart(2, "0")}</span>
      <div>
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-ink-2 [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-2 [&_b]:font-medium [&_b]:text-ink [&_li]:pl-1 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
          {children}
        </div>
      </div>
    </section>
  );
}
