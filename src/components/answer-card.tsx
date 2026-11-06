"use client";

import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { BorderBeam } from "./fx";

// Illustrative only: fictional businesses, shown to explain what an AI answer looks like.
const examples = [
  {
    engine: "ChatGPT",
    city: "London, UK",
    q: "Who's a reliable plumber in Camden for a burst pipe?",
    pre: "For urgent burst-pipe repairs in Camden, ",
    name: "Kestrel Plumbing Co.",
    post: " is frequently recommended. They list 24/7 call-outs, show their Gas Safe registration, and have 180+ reviews mentioning same-day fixes.",
    stats: ["Named in 9 of 12 answers", "Rank #1 in 6", "Cited source: own FAQ page"],
  },
  {
    engine: "Perplexity",
    city: "Austin, US",
    q: "Best dentist in Austin for nervous patients?",
    pre: "Locals often mention ",
    name: "Bluebell Dental Studio",
    post: ". Their site explains sedation options in plain language, and reviews highlight a calm, unhurried approach.",
    stats: ["Named in 7 of 12 answers", "4 engines know them", "Cited: Yelp, own site"],
  },
  {
    engine: "Gemini",
    city: "Melbourne, AU",
    q: "Dog-friendly cafe in Fitzroy for breakfast?",
    pre: "Try ",
    name: "Harbour Lane Espresso",
    post: ". It has water bowls out front, a shaded courtyard and an all-day breakfast menu with vegan options.",
    stats: ["Named in 8 of 12 answers", "Rank #1 on Gemini", "Cited: Google Business Profile"],
  },
];

export function AnswerCard() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const next = setTimeout(() => setI((x) => (x + 1) % examples.length), 7500);
    return () => clearTimeout(next);
  }, [i]);
  // Keyed by example so typing state resets on each rotation.
  return <Example key={i} i={i} />;
}

function Example({ i }: { i: number }) {
  const ex = examples[i];
  const [typed, setTyped] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTyped((n) => (n >= ex.q.length ? n : n + 1)), 28);
    return () => clearInterval(t);
  }, [ex.q.length]);

  const done = typed >= ex.q.length;

  return (
    <div className="relative rounded-2xl border border-night-line bg-night p-6 text-white shadow-[0_40px_100px_-30px_rgba(11,18,32,.6)] sm:p-7">
      <BorderBeam size={180} duration={10} from="#13855f" to="#a7f0d2" />
      <div className="flex items-center justify-between">
        <div className="label flex items-center gap-2 !text-faint">
          <span className="relative flex h-1.5 w-1.5">
            <span className="fx-ping absolute inline-flex h-full w-full rounded-full bg-[#5fd3a5]" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#5fd3a5]" />
          </span>
          {ex.engine} · {ex.city}
        </div>
        <div className="flex gap-1">
          {examples.map((_, k) => (
            <span key={k} className={`h-1 w-4 rounded-full ${k === i ? "bg-accent-2" : "bg-night-line"}`} />
          ))}
        </div>
      </div>
      <p className={`mt-3 min-h-[3.2em] text-[17px] font-medium leading-snug ${done ? "" : "caret"}`}>{ex.q.slice(0, typed)}</p>
      <div className={`mt-4 text-[15px] leading-relaxed text-[#c9d1de] transition-opacity duration-500 ${done ? "opacity-100" : "opacity-0"}`}>
        {ex.pre}
        <span className="mx-0.5 inline-flex items-center gap-1 rounded-md border border-accent-2/60 bg-accent/25 px-1.5 py-0.5 font-semibold text-white">
          <ShieldCheck size={13} className="text-[#5fd3a5]" aria-hidden />
          {ex.name}
        </span>
        {ex.post}
      </div>
      <div className={`mt-5 flex flex-wrap gap-2 transition-opacity delay-200 duration-500 ${done ? "opacity-100" : "opacity-0"}`}>
        {ex.stats.map((s) => (
          <span key={s} className="rounded-md border border-night-line bg-night-2 px-2 py-1 font-mono text-[11px] uppercase tracking-wider text-[#c9d1de]">
            {s}
          </span>
        ))}
      </div>
      <div className="label mt-6 border-t border-night-line pt-4 !text-[#6b7891]">Illustrative example · fictional business · what “being the answer” looks like</div>
    </div>
  );
}
