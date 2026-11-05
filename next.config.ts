import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Nearly every route here is per-request (audits, dashboards, client portals),
  // so the classic dynamic rendering model is the simpler fit.
  cacheComponents: false,
};

export default nextConfig;
