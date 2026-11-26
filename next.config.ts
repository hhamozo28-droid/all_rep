import type { NextConfig } from "next";

const publicBase = (process.env.LESSONS_PUBLIC_BASE
  || process.env.B2_PUBLIC_BASE
  || process.env.R2_PUBLIC_BASE
  || "").replace(/\/$/, "");

const nextConfig: NextConfig = {
  async headers() {
    const privateLinkHeaders = [
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "Cache-Control", value: "private, no-store" },
    ];
    return [
      { source: "/dl/:path*", headers: privateLinkHeaders },
      { source: "/api/dl/:path*", headers: privateLinkHeaders },
    ];
  },
  async rewrites() {
    if (!publicBase) return [];
    return [
      { source: "/lessons/:code/:file", destination: `${publicBase}/:code/:file` },
    ];
  },
};

export default nextConfig;
