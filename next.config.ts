import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Nearly every route here is per-request (audits, dashboards, client portals),
  // so the classic dynamic rendering model is the simpler fit.
  cacheComponents: false,
  // The stats and open-revenue pages became sections of the home page.
  async redirects() {
    return [
      { source: "/stats", destination: "/#stats", permanent: false },
      { source: "/open", destination: "/#open", permanent: false },
    ];
  },
};

export default nextConfig;
