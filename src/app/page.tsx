"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  Brain,
  DoorOpen,
  Search,
  AlertTriangle,
  Webhook,
  Wallet,
  FlaskConical,
} from "lucide-react";
import { ledger, ApiError } from "@/lib/api";
import { asArray, asRecord } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { JsonBlock } from "@/components/ui/json-block";

const QUICK = [
  { href: "/simulator", label: "Txn simulator", icon: FlaskConical, blurb: "Configurable multi-txn filter matrix" },
  { href: "/review", label: "Customer review", icon: Search, blurb: "Paste CUST after sim" },
  { href: "/transactions-ingest", label: "Fire webhook", icon: Webhook, blurb: "Single event" },
  { href: "/failed-transactions", label: "Failed ingest", icon: AlertTriangle, blurb: "Replay skips" },
  { href: "/digestion-rules", label: "Digestion rules", icon: Brain, blurb: "Formulas live" },
  { href: "/ingest-policy", label: "Ingest policy", icon: DoorOpen, blurb: "Door / auto-wallet" },
  { href: "/wallets", label: "Wallets", icon: Wallet, blurb: "Onboard / lookup" },
];

export default function DashboardPage() {
  const [health, setHealth] = useState<unknown>(null);
  const [policy, setPolicy] = useState<unknown>(null);
  const [rules, setRules] = useState<unknown>(null);
  const [openFails, setOpenFails] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setError(null);
    try {
      const [h, p, r, f] = await Promise.all([
        ledger.get("/actuator/health"),
        ledger.get("/ingest-policy").catch(() => null),
        ledger.get("/digestion-rules?enabledOnly=true").catch(() => null),
        ledger.get("/integrations/failed-transactions?status=OPEN&page=1&size=50").catch(() => null),
      ]);
      setHealth(h);
      setPolicy(p);
      setRules(r);
      setOpenFails(asArray(f).length);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const pol = asRecord(policy);
  const ruleCount = asArray(rules).length;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Review desk for local ledger-engine. No auth. Proxy: /api/ledger → LEDGER_ENGINE_URL."
      />

      {error ? (
        <div className="mb-4">
          <Alert variant="error">
            Cannot reach engine: {error}. Start ledger-engine on <code>localhost:8080</code>, then{" "}
            <code>./scripts/upstream-sim.sh</code>, open <strong>Customer review</strong>.
          </Alert>
        </div>
      ) : null}

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardBody className="flex items-center gap-3">
            <Activity className="h-5 w-5 text-emerald-600" />
            <div>
              <div className="text-xs text-zinc-500">Engine</div>
              <div className="text-lg font-semibold">
                {health && typeof health === "object" && "status" in (health as object)
                  ? String((health as { status: string }).status)
                  : "—"}
              </div>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="text-xs text-zinc-500">Ingest enabled</div>
            <div className="text-lg font-semibold">
              {pol ? String(pol.isEnabled) : "—"}
            </div>
            <div className="text-xs text-zinc-400">
              auto-wallet: {pol ? String(pol.isAutoCreateWallet) : "—"}
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="text-xs text-zinc-500">Enabled digestion rules</div>
            <div className="text-2xl font-semibold tabular-nums">{ruleCount || "—"}</div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="text-xs text-zinc-500">OPEN failed ingest (page)</div>
            <div className="text-2xl font-semibold tabular-nums">
              {openFails == null ? "—" : openFails}
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="mb-4 flex justify-end">
        <Button variant="secondary" onClick={() => void refresh()}>
          Refresh
        </Button>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {QUICK.map((q) => {
          const Icon = q.icon;
          return (
            <Link
              key={q.href}
              href={q.href}
              className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50/40"
            >
              <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-zinc-900">{q.label}</div>
                <div className="text-xs text-zinc-500">{q.blurb}</div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Health" description="GET /actuator/health" />
          <CardBody>
            <JsonBlock value={health ?? { status: "unknown" }} maxHeight={200} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Ingest policy" description="GET /ingest-policy" />
          <CardBody>
            <JsonBlock value={policy ?? {}} maxHeight={200} />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
