import type { NextConfig } from "next";

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
};

export default nextConfig;
