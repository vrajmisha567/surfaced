"use client";

/*
  Motion effects for the marketing site, in the style of the 21st.dev / Magic UI
  community components (text rotate, number ticker, border beam, blur reveal,
  spotlight card). Written for this codebase's tokens; every effect respects
  prefers-reduced-motion.
*/

import { Fragment, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { AnimatePresence, animate, motion, useInView, useReducedMotion } from "motion/react";
import { ScoreBar, ScoreRing } from "./ui";

const EASE = [0.21, 0.47, 0.32, 0.98] as const;

/** Cycles through words, sliding each letter up into place. */
export function TextRotate({ words, interval = 2600, className }: { words: string[]; interval?: number; className?: string }) {
  const [i, setI] = useState(0);
  const reduce = useReducedMotion();
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % words.length), interval);
    return () => clearInterval(t);
  }, [words.length, interval]);
  const word = words[i];
  return (
    <span className={clsx("relative inline-flex", className)}>
      <span className="sr-only">{words.join(", ")}</span>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={word} aria-hidden className="inline-flex whitespace-pre">
          {[...word].map((ch, k) => (
            <span key={k} className="-mb-[0.14em] inline-block overflow-hidden pb-[0.14em]">
              <motion.span
                className="inline-block"
                initial={reduce ? { opacity: 0 } : { y: "105%" }}
                animate={reduce ? { opacity: 1 } : { y: 0 }}
                exit={reduce ? { opacity: 0 } : { y: "-105%" }}
                transition={reduce ? { duration: 0.2 } : { type: "spring", damping: 28, stiffness: 340, delay: k * 0.022 }}
              >
                {ch}
              </motion.span>
            </span>
          ))}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/**
 * Words of a heading fade up out of a blur, one after another, on load.
 * Pure CSS (.fx-enter), so it starts at first paint instead of waiting for JavaScript:
 * the JS-driven version left the top of the hero blank until hydration finished.
 */
export function RevealWords({ text, className, delay = 0, stagger = 0.06 }: { text: string; className?: string; delay?: number; stagger?: number }) {
  const words = text.split(" ");
  return (
    <span className={className}>
      {words.map((w, k) => (
        <Fragment key={k}>
          <span className="fx-enter inline-block" style={{ animationDelay: `${delay + k * stagger}s` }}>
            {w}
          </span>
          {k < words.length - 1 ? " " : ""}
        </Fragment>
      ))}
    </span>
  );
}

/** Above-the-fold block that blur-fades in on load, in CSS (see RevealWords for why). */
export function Enter({ children, className, delay = 0, as: Tag = "div" }: { children: React.ReactNode; className?: string; delay?: number; as?: "div" | "span" }) {
  return (
    <Tag className={clsx("fx-enter", Tag === "span" && "inline-block", className)} style={{ animationDelay: `${delay}s` }}>
      {children}
    </Tag>
  );
}

/** Blur-fade a block in the first time it scrolls into view. */
export function Reveal({ children, className, delay = 0, y = 16 }: { children: React.ReactNode; className?: string; delay?: number; y?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y, filter: "blur(6px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "0px 0px -80px 0px" }}
      transition={{ duration: 0.7, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

/** Counts up to a number when it scrolls into view. */
export function NumberTicker({ value, suffix = "", className }: { value: number; suffix?: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();
  // The real number is in the HTML (for search engines, no-JS visitors and screenshots).
  // Only numbers that are still below the fold get reset to 0 and counted up when they scroll in.
  useEffect(() => {
    const el = ref.current;
    if (!el || reduce) return;
    const box = el.getBoundingClientRect();
    if (box.top < window.innerHeight && box.bottom > 0) return;
    el.textContent = `0${suffix}`;
    let run: ReturnType<typeof animate> | undefined;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        run = animate(0, value, { duration: 1.4, ease: EASE, onUpdate: (v) => (el.textContent = `${Math.round(v)}${suffix}`) });
      },
      { rootMargin: "0px 0px -40px 0px" },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      run?.stop();
      el.textContent = `${value}${suffix}`;
    };
  }, [value, suffix, reduce]);
  return (
    <span ref={ref} className={clsx("tabular", className)} aria-label={`${value}${suffix}`}>
      {value}
      {suffix}
    </span>
  );
}

/**
 * A short streak of light that travels around a card's border.
 * Put it inside a `relative` element with rounded corners.
 */
export function BorderBeam({
  size = 140,
  duration = 9,
  delay = 0,
  from = "#13855f",
  to = "#7be0b8",
  width = 1,
}: {
  size?: number;
  duration?: number;
  delay?: number;
  from?: string;
  to?: string;
  width?: number;
}) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit] border-transparent [mask-clip:padding-box,border-box] [mask-composite:intersect] [mask-image:linear-gradient(transparent,transparent),linear-gradient(#000,#000)]"
      style={{ borderWidth: width, borderStyle: "solid" }}
    >
      <div
        className="fx-beam absolute aspect-square"
        style={{
          width: size,
          offsetPath: `rect(0 auto auto 0 round ${size}px)`,
          background: `linear-gradient(to left, ${from}, ${to}, transparent)`,
          animationDuration: `${duration}s`,
          animationDelay: `-${delay}s`,
        }}
      />
    </div>
  );
}

/** Card with a soft accent glow that follows the cursor. */
export function SpotlightCard({ children, className, dark }: { children: React.ReactNode; className?: string; dark?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={ref}
      onMouseMove={(e) => {
        const r = ref.current?.getBoundingClientRect();
        if (!r) return;
        ref.current!.style.setProperty("--sx", `${e.clientX - r.left}px`);
        ref.current!.style.setProperty("--sy", `${e.clientY - r.top}px`);
      }}
      className={clsx("group/spot relative overflow-hidden", className)}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover/spot:opacity-100"
        style={{
          background: dark
            ? "radial-gradient(420px circle at var(--sx) var(--sy), rgba(95,211,165,.14), transparent 45%)"
            : "radial-gradient(420px circle at var(--sx) var(--sy), rgba(19,133,95,.09), transparent 45%)",
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}

/** The sample report card: the score ring and bars fill when it scrolls into view. */
export function SampleScores({ score, bars }: { score: number; bars: readonly (readonly [string, number])[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -60px 0px" });
  const reduce = useReducedMotion();
  const on = inView || !!reduce;
  return (
    <div ref={ref} className="fx-ring mt-6 flex items-center gap-6">
      <ScoreRing score={on ? score : 0} size={120} stroke={8} />
      <div className="flex-1 space-y-3">
        {bars.map(([l, s], k) => (
          <div key={l}>
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-ink-2">{l}</span>
              <span className="tabular">{s}</span>
            </div>
            <div className="fx-bars" style={{ ["--d" as string]: `${150 + k * 90}ms` }}>
              <ScoreBar score={on ? s : 0} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
