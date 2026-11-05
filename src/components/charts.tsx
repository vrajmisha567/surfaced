"use client";

import { useEffect, useRef, useState } from "react";

/** Measure the container so SVG text renders at true pixel size instead of being scaled. */
function useWidth<T extends HTMLElement>(fallback = 300) {
  const ref = useRef<T>(null);
  const [w, setW] = useState(fallback);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

/** Nudge label y-positions apart so end labels never overlap. */
function spreadLabels(ys: number[], gap = 13) {
  const order = ys.map((y, i) => ({ y, i })).sort((a, b) => a.y - b.y);
  for (let k = 1; k < order.length; k++) if (order[k].y - order[k - 1].y < gap) order[k].y = order[k - 1].y + gap;
  const out = [...ys];
  order.forEach(({ y, i }) => (out[i] = y));
  return out;
}

/** Validated categorical order (light surface #fffefb): client first, then up to 3 competitors. */
export const SERIES = ["#0e8a5f", "#2a78d6", "#eb6834", "#6250d6"];

export type Series = { name: string; values: (number | null)[] };

/**
 * Weekly line chart, one y-axis (0-100%), crosshair + tooltip on hover,
 * legend always shown for 2+ series, direct end labels for up to 4.
 */
export function TrendChart({ weeks, series, height = 240, format = (v: number) => `${Math.round(v * 100)}%` }: { weeks: string[]; series: Series[]; height?: number; format?: (v: number) => string }) {
  const [hover, setHover] = useState<number | null>(null);
  const [ref, W] = useWidth<HTMLDivElement>();
  const H = height;
  const pad = { l: 40, r: W < 480 ? 96 : 124, t: 12, b: 28 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const n = weeks.length;
  const x = (i: number) => pad.l + (n <= 1 ? iw / 2 : (i / (n - 1)) * iw);
  const y = (v: number) => pad.t + ih - v * ih;
  const shown = series.slice(0, 4);
  const lastIdxs = shown.map((s) => s.values.map((v) => v !== null).lastIndexOf(true));
  const labelYs = spreadLabels(shown.map((s, si) => (lastIdxs[si] >= 0 ? y(s.values[lastIdxs[si]]!) + 4 : -100)));
  const maxChars = Math.floor((pad.r - 14) / 6);

  if (!n) return null;

  return (
    <div className="relative w-full min-w-0 overflow-hidden" ref={ref}>
      {shown.length > 1 && (
        <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2">
          {shown.map((s, i) => (
            <span key={s.name} className="inline-flex items-center gap-1.5">
              <span className="inline-block h-[3px] w-3.5 rounded-full" style={{ background: SERIES[i] }} />
              {s.name}
            </span>
          ))}
        </div>
      )}
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block" role="img" aria-label="Weekly mention rate" onMouseLeave={() => setHover(null)}>
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="#e2ddd2" strokeWidth={1} />
            <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" className="fill-muted" fontSize={11}>
              {Math.round(t * 100)}%
            </text>
          </g>
        ))}
        {weeks.map((w, i) =>
          n <= 8 || i % Math.ceil(n / 8) === 0 || i === n - 1 ? (
            <text key={w} x={x(i)} y={H - 8} textAnchor="middle" className="fill-muted" fontSize={11}>
              {w.replace(/^\d{4}-/, "")}
            </text>
          ) : null,
        )}
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + ih} stroke="#98a2b3" strokeWidth={1} strokeDasharray="3 3" />}
        {shown.map((s, si) => {
          const pts = s.values.map((v, i) => (v === null ? null : [x(i), y(v)] as const));
          const d = pts.reduce((acc, p, i) => (p ? acc + `${acc && pts[i - 1] ? "L" : "M"}${p[0]},${p[1]}` : acc), "");
          const lastIdx = lastIdxs[si];
          return (
            <g key={s.name}>
              <path d={d} fill="none" stroke={SERIES[si]} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              {pts.map((p, i) =>
                p && (n <= 12 || i === hover || i === lastIdx) ? (
                  <circle key={i} cx={p[0]} cy={p[1]} r={i === hover ? 5 : 4} fill={SERIES[si]} stroke="#fffefb" strokeWidth={2} />
                ) : null,
              )}
              {lastIdx >= 0 && (
                <text x={x(lastIdx) + 10} y={labelYs[si]} fontSize={11} className="fill-ink-2">
                  {s.name.length > maxChars ? s.name.slice(0, maxChars - 1) + "…" : s.name}
                </text>
              )}
            </g>
          );
        })}
        {weeks.map((w, i) => (
          <rect
            key={w}
            x={x(i) - (n <= 1 ? iw / 2 : iw / (n - 1) / 2)}
            y={pad.t}
            width={n <= 1 ? iw : iw / (n - 1)}
            height={ih}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
          />
        ))}
      </svg>
      {hover !== null && (
        <div
          className="pointer-events-none absolute z-10 min-w-40 rounded-lg border border-line bg-card px-3 py-2 text-xs shadow-lg"
          style={{ left: `${(x(hover) / W) * 100}%`, top: 24, transform: x(hover) > W * 0.6 ? "translateX(calc(-100% - 12px))" : "translateX(12px)" }}
        >
          <div className="label mb-1">{weeks[hover]}</div>
          {shown.map((s, si) => (
            <div key={s.name} className="flex items-center justify-between gap-4 py-0.5">
              <span className="inline-flex items-center gap-1.5 text-ink-2">
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: SERIES[si] }} />
                {s.name}
              </span>
              <span className="tabular font-medium text-ink">{s.values[hover] === null ? "—" : format(s.values[hover]!)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Horizontal bars for share of voice; 2px surface gap between bars, values in ink. */
export function ShareBars({ rows }: { rows: { name: string; value: number; isClient?: boolean }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...rows.map((r) => r.value), 0.0001);
  return (
    <div className="space-y-2.5">
      {rows.map((r, i) => (
        <div key={r.name} className="group" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
          <div className="mb-1 flex justify-between text-[13px]">
            <span className={r.isClient ? "font-medium text-ink" : "text-ink-2"}>{r.name}</span>
            <span className="tabular text-ink">{Math.round(r.value * 100)}%</span>
          </div>
          <div className="h-2 rounded-full bg-paper-2">
            <div
              className="h-full rounded-full transition-opacity"
              style={{ width: `${Math.max(1.5, (r.value / max) * 100)}%`, background: SERIES[i] ?? "#98a2b3", opacity: hover === null || hover === i ? 1 : 0.45 }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
