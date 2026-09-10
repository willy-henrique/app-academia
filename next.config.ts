import type { NextConfig } from "next";

import { buildSecurityHeaders } from "./src/config/security-headers";

const isProduction = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: process.cwd(),
  images: {
    // Mídia de exercício e avatares vivem no Storage do próprio projeto.
    formats: ["image/avif", "image/webp"],
    remotePatterns: [{ protocol: "https", hostname: "firebasestorage.googleapis.com" }],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: buildSecurityHeaders(isProduction),
      },
    ];
  },
};

export default nextConfig;
