import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { brand, svgDataUri, waveSvg } from "@/lib/brand";

export const alt = "Surfaced: get your business named in AI answers";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Social share card: wordmark, headline and a quiet hairline grid, on paper. */
export default async function OpengraphImage() {
  const fonts = join(process.cwd(), "node_modules/geist/dist/fonts/geist-sans");
  const [semibold, regular] = await Promise.all([readFile(join(fonts, "Geist-SemiBold.ttf")), readFile(join(fonts, "Geist-Regular.ttf"))]);
  const mark = svgDataUri(waveSvg(brand.green, brand.ink, { box: "0 1 48 48" }));
  const grid = "linear-gradient(to right, rgba(16,24,40,.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(16,24,40,.05) 1px, transparent 1px)";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: brand.paper,
          backgroundImage: grid,
          backgroundSize: "56px 56px",
          fontFamily: "Geist",
          color: brand.ink,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mark} width={64} height={64} alt="" />
          <div style={{ fontSize: 46, fontWeight: 600, letterSpacing: "-0.045em" }}>surfaced</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 76, fontWeight: 600, letterSpacing: "-0.035em", lineHeight: 1.04, maxWidth: 960 }}>When customers ask AI, be the name it gives.</div>
          <div style={{ marginTop: 28, fontSize: 30, color: "#344054", fontWeight: 400 }}>AI search visibility for local businesses, worldwide.</div>
        </div>
        <div style={{ display: "flex", gap: 14, fontSize: 22, color: "#667085" }}>
          {["ChatGPT", "Gemini", "Perplexity", "Claude", "Google Maps"].map((e) => (
            <div key={e} style={{ display: "flex", border: "1px solid #d3cdbf", borderRadius: 999, padding: "8px 18px", background: "#fffefb" }}>
              {e}
            </div>
          ))}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Geist", data: semibold, weight: 600, style: "normal" },
        { name: "Geist", data: regular, weight: 400, style: "normal" },
      ],
    },
  );
}
