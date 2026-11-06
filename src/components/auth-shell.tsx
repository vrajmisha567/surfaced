import Link from "next/link";
import { Check } from "lucide-react";
import { Reveal } from "./fx";
import { Logo, Mark } from "./ui";

/**
 * Two-column frame for log in, sign up and password pages:
 * the form on paper at left, a dark brand panel at right (desktop only).
 */
export function AuthShell({
  title,
  serif,
  sub,
  children,
  footer,
}: {
  title: string;
  serif?: string;
  sub?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.05fr]">
      <main className="relative flex flex-col px-5 py-6 sm:px-10">
        <div aria-hidden className="grid-paper absolute inset-0 [mask-image:radial-gradient(ellipse_70%_60%_at_30%_0%,#000_20%,transparent_80%)]" />
        <div className="relative flex items-center justify-between">
          <Logo />
          <Link href="/" className="text-sm text-muted hover:text-ink">
            ← Back to site
          </Link>
        </div>
        <div className="relative mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-12">
          <Reveal>
            <h1 className="text-[32px] font-semibold leading-[1.1] tracking-[-0.03em]">
              {title} {serif && <span className="serif text-[1.08em]">{serif}</span>}
            </h1>
            {sub && <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{sub}</p>}
            <div className="mt-8">{children}</div>
            {footer && <div className="mt-8 text-center text-sm text-ink-2">{footer}</div>}
          </Reveal>
        </div>
        <p className="label relative text-center">No one can guarantee AI rankings. We show you the evidence.</p>
      </main>

      <aside className="relative hidden overflow-hidden bg-night text-white lg:flex lg:flex-col lg:justify-between lg:p-14">
        <div aria-hidden className="grid-paper absolute inset-0 opacity-30 invert [mask-image:radial-gradient(ellipse_80%_70%_at_70%_30%,#000_10%,transparent_75%)]" />
        <div aria-hidden className="fx-glow absolute -right-32 -top-32 h-[560px] w-[560px] rounded-full bg-[radial-gradient(circle,rgba(19,133,95,.35),transparent_62%)] blur-2xl" />
        <div aria-hidden className="fx-glow absolute -bottom-48 -left-24 h-[480px] w-[480px] rounded-full bg-[radial-gradient(circle,rgba(95,211,165,.12),transparent_62%)] blur-2xl [animation-delay:-9s]" />

        <div className="relative">
          <Mark size={56} dark />
        </div>

        <div className="relative max-w-md">
          <div className="text-[44px] font-semibold leading-[1.05] tracking-[-0.03em]">
            When customers ask AI, <span className="serif text-[1.08em] text-[#a7f0d2]">be the name it gives.</span>
          </div>
          <ul className="mt-8 space-y-3 text-[15px] text-[#c9d1de]">
            {[
              "Every audit you run, saved in one place",
              "See exactly what ChatGPT, Gemini and Maps say about you",
              "Track your fixes and your weekly progress",
            ].map((t) => (
              <li key={t} className="flex items-start gap-3">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent/30 text-[#5fd3a5]">
                  <Check size={13} strokeWidth={3} />
                </span>
                {t}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex items-center gap-3 text-xs text-[#8a96ab]">
          <span className="font-mono uppercase tracking-[0.08em]">ChatGPT · Gemini · Perplexity · Claude · Google Maps</span>
        </div>
      </aside>
    </div>
  );
}
