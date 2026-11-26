import type { NextConfig } from "next";

const r2Base = process.env.R2_PUBLIC_BASE?.replace(/\/$/, "");

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
    if (!r2Base) return [];
    return [
      { source: "/lessons/:code/:file", destination: `${r2Base}/:code/:file` },
    ];
  },
};

export default nextConfig;
