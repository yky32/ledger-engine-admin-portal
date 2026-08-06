"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, BookOpen, Wallet, ArrowLeftRight } from "lucide-react";
import { ledger, ApiError } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { JsonBlock } from "@/components/ui/json-block";
import { NAV } from "@/lib/nav";

type Dashboard = {
  walletCount?: number;
  accountCount?: number;
  movementCount?: number;
  openMovementCount?: number;
};

export default function DashboardPage() {
  const [dash, setDash] = useState<Dashboard | null>(null);
  const [health, setHealth] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [d, h] = await Promise.all([
          ledger.get<Dashboard>("/dashboards").catch(() => null),
          ledger.get("/actuator/health").catch(() => null),
        ]);
        setDash(d);
        setHealth(h);
      } catch (e) {
        setError(e instanceof ApiError ? e.message : String(e));
      }
    })();
  }, []);

  const metrics = [
    { label: "Wallets", value: dash?.walletCount, icon: Wallet },
    { label: "Accounts", value: dash?.accountCount, icon: BookOpen },
    { label: "Movements", value: dash?.movementCount, icon: ArrowLeftRight },
    { label: "Open movements", value: dash?.openMovementCount, icon: Activity },
  ];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Direct admin UI for ledger-engine. No login — all calls go through /api/ledger → LEDGER_ENGINE_URL."
      />

      {error ? (
        <div className="mb-4">
          <Alert variant="error">
            Cannot reach engine: {error}. Start ledger-engine on{" "}
            <code>localhost:8080</code> (or set <code>LEDGER_ENGINE_URL</code>).
          </Alert>
        </div>
      ) : null}

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <Card key={m.label}>
              <CardBody className="flex items-center gap-3">
                <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs text-zinc-500">{m.label}</div>
                  <div className="text-2xl font-semibold tabular-nums">
                    {m.value ?? "—"}
                  </div>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Resources" description="Open a module to list / create / update" />
          <CardBody className="grid gap-2 sm:grid-cols-2">
            {NAV.filter((n) => n.href !== "/").map((n) => {
              const Icon = n.icon;
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 transition hover:border-emerald-300 hover:bg-emerald-50/50"
                >
                  <Icon className="h-4 w-4 text-zinc-400" />
                  {n.label}
                </Link>
              );
            })}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Engine health"
            description="GET /actuator/health"
            actions={
              <Button
                variant="secondary"
                onClick={() =>
                  void ledger.get("/actuator/health").then(setHealth).catch((e) =>
                    setError(String(e.message || e)),
                  )
                }
              >
                Ping
              </Button>
            }
          />
          <CardBody>
            <JsonBlock value={health ?? { status: "unknown" }} maxHeight={280} />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
