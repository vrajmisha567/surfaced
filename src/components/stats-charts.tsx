"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";

const ACCENT = "#0e8a5f";

function useWidth<T extends HTMLElement>(fallback = 300) {
  const ref = useRef<T>(null);
  const [w, setW] = useState(fallback);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(260, Math.round(e.contentRect.width))));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

function niceMax(v: number) {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= v) return m * p;
  return 10 * p;
}

const fmtDay = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en", { day: "numeric", month: "short", timeZone: "UTC" });

/** One bar per day, hover for the exact value. Rounded data end, 2px gaps. */
export function DailyBars({
  data,
  currency,
  height = 200,
  ranges,
  empty = "Nothing yet",
}: {
  data: { day: string; value: number }[];
  /** Format values as money in this currency (e.g. "AUD"); plain counts otherwise. */
  currency?: string;
  height?: number;
  /** Optional range switcher, in days (e.g. [30, 90, 365]). */
  ranges?: number[];
  empty?: string;
}) {
  const [range, setRange] = useState(ranges?.[0] ?? data.length);
  const format = (v: number) =>
    currency ? new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(v) : v.toLocaleString("en");
  const [hover, setHover] = useState<number | null>(null);
  const [ref, W] = useWidth<HTMLDivElement>();
  const rows = data.slice(-range);
  const total = rows.reduce((a, r) => a + r.value, 0);
  const max = niceMax(Math.max(...rows.map((r) => r.value), 0));
  const pad = { l: 44, r: 8, t: 10, b: 24 };
  const iw = W - pad.l - pad.r;
  const ih = height - pad.t - pad.b;
  const step = iw / rows.length;
  const bw = Math.max(1, step - (rows.length > 120 ? 1 : 2));
  const y = (v: number) => pad.t + ih - (v / max) * ih;
  const ticks = [0, max / 2, max];
  const labelEvery = Math.ceil(rows.length / Math.max(2, Math.floor(iw / 70)));

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-ink-2">
          <span className="tabular font-semibold text-ink">{format(total)}</span> in the last {range} days
        </div>
        {ranges && (
          <div className="flex rounded-lg border border-line bg-paper p-0.5 text-xs">
            {ranges.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setRange(d)}
                className={clsx("rounded-md px-2.5 py-1 transition-colors", d === range ? "bg-card font-medium text-ink shadow-sm" : "text-muted hover:text-ink")}
              >
                {d === 365 ? "1 year" : `${d} days`}
              </button>
            ))}
          </div>
        )}
      </div>
      <div ref={ref} className="relative w-full min-w-0 overflow-hidden" onMouseLeave={() => setHover(null)}>
        <svg width={W} height={height} role="img" aria-label={`Daily chart, ${format(total)} in the last ${range} days`}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className="stroke-line" strokeDasharray={t === 0 ? undefined : "2 4"} />
              <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" fontSize="11" className="tabular fill-faint">
                {format(t)}
              </text>
            </g>
          ))}
          {rows.map((r, i) => {
            const x = pad.l + i * step + (step - bw) / 2;
            const h = Math.max(0, ih - (y(r.value) - pad.t));
            return (
              <g key={r.day} onMouseEnter={() => setHover(i)}>
                <rect x={pad.l + i * step} y={pad.t} width={step} height={ih} fill="transparent" />
                {r.value > 0 && <rect x={x} y={y(r.value)} width={bw} height={h} rx={Math.min(3, bw / 2)} fill={ACCENT} opacity={hover === null || hover === i ? 1 : 0.45} />}
                {i % labelEvery === 0 && (
                  <text x={x + bw / 2} y={height - 6} textAnchor="middle" fontSize="11" className="fill-faint">
                    {fmtDay(r.day)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        {hover !== null && rows[hover] && (
          <div
            className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-lg border border-line bg-card px-3 py-2 text-xs shadow-lg"
            style={{ left: Math.min(Math.max(pad.l + hover * step + step / 2, 70), W - 70) }}
          >
            <div className="text-muted">{fmtDay(rows[hover].day)}</div>
            <div className="tabular mt-0.5 font-semibold">{format(rows[hover].value)}</div>
          </div>
        )}
        {total === 0 && <div className="absolute inset-0 grid place-items-center text-sm text-muted">{empty}</div>}
      </div>
    </div>
  );
}

/** Dots on two 0–100 axes with a least-squares line. Hover a dot for its values. */
export function Scatter({
  points,
  xLabel,
  yLabel,
  height = 300,
}: {
  points: { x: number; y: number }[];
  xLabel: string;
  yLabel: string;
  height?: number;
}) {
  const [ref, W] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const pad = { l: 44, r: 12, t: 12, b: 40 };
  const iw = W - pad.l - pad.r;
  const ih = height - pad.t - pad.b;
  const x = (v: number) => pad.l + (v / 100) * iw;
  const y = (v: number) => pad.t + ih - (v / 100) * ih;

  // Least-squares fit.
  let fit: [number, number] | null = null;
  if (points.length >= 3) {
    const mx = points.reduce((a, p) => a + p.x, 0) / points.length;
    const my = points.reduce((a, p) => a + p.y, 0) / points.length;
    const sxx = points.reduce((a, p) => a + (p.x - mx) ** 2, 0);
    if (sxx) {
      const b = points.reduce((a, p) => a + (p.x - mx) * (p.y - my), 0) / sxx;
      fit = [my - b * mx, b];
    }
  }
  const clamp = (v: number) => Math.max(0, Math.min(100, v));

  return (
    <div ref={ref} className="relative w-full min-w-0 overflow-hidden" onMouseLeave={() => setHover(null)}>
      <svg width={W} height={height} role="img" aria-label={`Scatter of ${yLabel} against ${xLabel}, ${points.length} audits`}>
        {[0, 25, 50, 75, 100].map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className="stroke-paper-2" />
            <line x1={x(t)} x2={x(t)} y1={pad.t} y2={pad.t + ih} className="stroke-paper-2" />
            <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" fontSize="11" className="fill-faint">
              {t}
            </text>
            <text x={x(t)} y={pad.t + ih + 16} textAnchor="middle" fontSize="11" className="fill-faint">
              {t}
            </text>
          </g>
        ))}
        <text x={pad.l + iw / 2} y={height - 4} textAnchor="middle" fontSize="11" className="fill-muted">
          {xLabel} →
        </text>
        <text x={12} y={pad.t + ih / 2} textAnchor="middle" fontSize="11" className="fill-muted" transform={`rotate(-90 12 ${pad.t + ih / 2})`}>
          {yLabel} →
        </text>
        {fit && (
          <line x1={x(0)} y1={y(clamp(fit[0]))} x2={x(100)} y2={y(clamp(fit[0] + fit[1] * 100))} className="stroke-ink" strokeWidth={1.5} strokeDasharray="5 5" opacity={0.5} />
        )}
        {points.map((p, i) => (
          <g key={i} onMouseEnter={() => setHover(i)}>
            <circle cx={x(p.x)} cy={y(p.y)} r={12} fill="transparent" />
            <circle cx={x(p.x)} cy={y(p.y)} r={hover === i ? 6 : 4.5} fill={ACCENT} fillOpacity={0.75} className="stroke-card" strokeWidth={2} />
          </g>
        ))}
      </svg>
      {hover !== null && points[hover] && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-line bg-card px-3 py-2 text-xs shadow-lg"
          style={{ left: x(points[hover].x), top: y(points[hover].y) - 10 }}
        >
          <div>
            {xLabel}: <b className="tabular">{points[hover].x}</b>
          </div>
          <div>
            {yLabel}: <b className="tabular">{points[hover].y}</b>
          </div>
        </div>
      )}
    </div>
  );
}
