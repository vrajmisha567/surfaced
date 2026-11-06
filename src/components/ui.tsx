import Link from "next/link";
import clsx from "clsx";
import { Check as CheckIcon, AlertTriangle, X, Info } from "lucide-react";
import type { CheckStatus } from "@/lib/types";

/**
 * The Surfaced "Wave" mark: an S drawn as a wave, the green half riding above the surface.
 * Geometry lives in a 48×48 box; keep it in sync with src/app/icon.svg and public/brand/.
 */
export const WAVE_TOP = "M19 23A10 10 0 0 1 39 23";
export const WAVE_BOTTOM = "M9 27A10 10 0 0 0 29 27";

export function Mark({ size = 24, dark, className }: { size?: number; dark?: boolean; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 1 48 48" aria-hidden className={className}>
      <path d={WAVE_TOP} fill="none" stroke={dark ? "#5fd3a5" : "#13855f"} strokeWidth="7" strokeLinecap="round" />
      <path d={WAVE_BOTTOM} fill="none" stroke={dark ? "#ffffff" : "#101828"} strokeWidth="7" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ className, dark }: { className?: string; dark?: boolean }) {
  return (
    <Link
      href="/"
      aria-label="Surfaced home"
      className={clsx("group inline-flex items-center gap-1.5 font-semibold", dark ? "text-white" : "text-ink", className)}
    >
      <Mark size={28} dark={dark} className="transition-transform duration-500 group-hover:-translate-y-px" />
      <span className="text-[19px] leading-none tracking-[-0.045em]">surfaced</span>
    </Link>
  );
}

type BtnProps = { variant?: "primary" | "secondary" | "ghost" | "dark"; size?: "sm" | "md" | "lg"; className?: string };

const btn = ({ variant = "primary", size = "md", className }: BtnProps) =>
  clsx(
    "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap",
    size === "sm" && "h-8 px-3 text-[13px]",
    size === "md" && "h-10 px-4 text-sm",
    size === "lg" && "h-12 px-5 text-[15px]",
    variant === "primary" && "bg-accent text-white hover:bg-accent-ink",
    variant === "dark" && "bg-ink text-white hover:bg-night-2",
    variant === "secondary" && "border border-line-2 bg-card text-ink hover:bg-paper-2",
    variant === "ghost" && "text-ink-2 hover:bg-paper-2",
    className,
  );

export function Button(props: React.ButtonHTMLAttributes<HTMLButtonElement> & BtnProps) {
  const { variant, size, className, ...rest } = props;
  return <button {...rest} className={btn({ variant, size, className })} />;
}

export function LinkButton(props: React.ComponentProps<typeof Link> & BtnProps) {
  const { variant, size, className, ...rest } = props;
  return <Link {...rest} className={btn({ variant, size, className })} />;
}

export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...rest} className={clsx("rounded-xl border border-line bg-card", className)}>
      {children}
    </div>
  );
}

export function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={clsx("label", className)}>{children}</div>;
}

const statusMeta: Record<CheckStatus, { label: string; cls: string; Icon: typeof CheckIcon }> = {
  pass: { label: "Pass", cls: "bg-good-soft text-good", Icon: CheckIcon },
  warn: { label: "Improve", cls: "bg-warn-soft text-warn", Icon: AlertTriangle },
  fail: { label: "Missing", cls: "bg-bad-soft text-bad", Icon: X },
  info: { label: "Note", cls: "bg-paper-2 text-ink-2", Icon: Info },
};

/** Status always ships icon + word, never colour alone. */
export function StatusPill({ status, className }: { status: CheckStatus; className?: string }) {
  const m = statusMeta[status];
  return (
    <span className={clsx("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium", m.cls, className)}>
      <m.Icon size={12} strokeWidth={2.5} aria-hidden />
      {m.label}
    </span>
  );
}

export function scoreWord(score: number) {
  if (score >= 85) return "Strong";
  if (score >= 70) return "Good";
  if (score >= 55) return "Fair";
  if (score >= 40) return "Weak";
  return "Poor";
}

/** Single-value gauge. One colour; the number and word carry the meaning. */
export function ScoreRing({ score, size = 168, stroke = 10, label, dark }: { score: number | null; size?: number; stroke?: number; label?: string; dark?: boolean }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = score === null ? 0 : Math.max(0, Math.min(100, score)) / 100;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" role="img" aria-label={score === null ? "Not measured" : `Score ${score} out of 100`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className={dark ? "stroke-night-line" : "stroke-paper-2"} />
        {score !== null && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${circ * pct} ${circ}`}
            className="stroke-accent-2 transition-[stroke-dasharray] duration-700"
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className={clsx("tabular font-semibold tracking-tight", dark ? "text-white" : "text-ink")} style={{ fontSize: size * 0.3, lineHeight: 1 }}>
          {score === null ? "—" : score}
        </div>
        <div className={clsx("mt-1 text-xs", dark ? "text-faint" : "text-muted")}>{label ?? (score === null ? "not measured" : `/100 · ${scoreWord(score)}`)}</div>
      </div>
    </div>
  );
}

/** Horizontal score bar: thin track, rounded data end. */
export function ScoreBar({ score, className }: { score: number | null; className?: string }) {
  return (
    <div className={clsx("h-1.5 w-full rounded-full bg-paper-2", className)} role="img" aria-label={score === null ? "Not measured" : `${score} out of 100`}>
      {score !== null && <div className="h-full rounded-full bg-accent-2" style={{ width: `${Math.max(2, score)}%` }} />}
    </div>
  );
}

export function StatTile({ label, value, sub, className }: { label: string; value: React.ReactNode; sub?: React.ReactNode; className?: string }) {
  return (
    <Card className={clsx("p-4", className)}>
      <Label>{label}</Label>
      <div className="tabular mt-2 text-[28px] font-semibold leading-none tracking-tight">{value}</div>
      {sub && <div className="mt-2 text-xs text-muted">{sub}</div>}
    </Card>
  );
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-ink-2">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export const inputCls =
  "h-10 w-full rounded-lg border border-line-2 bg-card px-3 text-sm text-ink placeholder:text-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15";

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line-2 px-6 py-12 text-center">
      <div className="font-medium">{title}</div>
      {children && <div className="mx-auto mt-2 max-w-md text-sm text-muted">{children}</div>}
    </div>
  );
}
