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
  /** Legacy catalog pages removed — bookmark → product surfaces. */
  async redirects() {
    return [
      { source: "/rules", destination: "/digestion-rules", permanent: false },
      { source: "/rule-executions", destination: "/review", permanent: false },
      { source: "/accounts", destination: "/records", permanent: false },
      { source: "/ledger-accounts", destination: "/coa", permanent: false },
      { source: "/ledger-wallets", destination: "/wallets", permanent: false },
      { source: "/journal", destination: "/movements", permanent: false },
      { source: "/fx-rates", destination: "/configurations", permanent: false },
    ];
  },
};

export default nextConfig;
