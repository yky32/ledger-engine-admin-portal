import type { NextConfig } from "next";

const ledgerUrl =
  process.env.LEDGER_ENGINE_URL?.replace(/\/$/, "") || "http://localhost:8080";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/ledger/:path*",
        destination: `${ledgerUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
