import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export — no SSR, safe to deploy without environment vars at build time.
  // Auth (Clerk) happens client-side via NEXT_PUBLIC_ vars.
  output: "export",
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
