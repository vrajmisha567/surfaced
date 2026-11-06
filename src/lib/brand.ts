/** The Surfaced "Wave" mark as SVG markup, for icons and images rendered outside React components. */
export const brand = { ink: "#101828", green: "#13855f", mint: "#5fd3a5", paper: "#f5f3ee" };

export const WAVE_TOP = "M19 23A10 10 0 0 1 39 23";
export const WAVE_BOTTOM = "M9 27A10 10 0 0 0 29 27";

/** The mark in a 48×48 box; `box` adds padding around it (e.g. "-4 -4 56 56"). */
export function waveSvg(top: string, bottom: string, opts: { box?: string; bg?: string; radius?: number } = {}) {
  const box = opts.box ?? "0 0 48 48";
  const [x, y, w, h] = box.split(" ").map(Number);
  const bg = opts.bg ? `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${opts.radius ?? 0}" fill="${opts.bg}"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box}">${bg}<path d="${WAVE_TOP}" fill="none" stroke="${top}" stroke-width="7" stroke-linecap="round"/><path d="${WAVE_BOTTOM}" fill="none" stroke="${bottom}" stroke-width="7" stroke-linecap="round"/></svg>`;
}

export const svgDataUri = (svg: string) => `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
