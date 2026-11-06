import { ImageResponse } from "next/og";
import { brand, svgDataUri, waveSvg } from "@/lib/brand";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home-screen icon: the mark on an ink tile (iOS rounds the corners itself). */
export default function AppleIcon() {
  const mark = svgDataUri(waveSvg(brand.mint, "#ffffff"));
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: brand.ink }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={mark} width={124} height={124} alt="" style={{ marginTop: -5 }} />
      </div>
    ),
    size,
  );
}
