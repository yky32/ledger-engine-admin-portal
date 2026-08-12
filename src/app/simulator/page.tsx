"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { ledger, ApiError } from "@/lib/api";
import { asArray, asRecord, nowIso } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { JsonBlock } from "@/components/ui/json-block";
import { Alert } from "@/components/ui/alert";

type Counts = {
  purchaseOk: number;
  purchaseUsd: number;
  purchaseJpy: number;
  tooSmall: number;
  tooOld: number;
  signup: number;
  redeem: number;
  duplicate: number;
};

type LogRow = {
  n: number;
  eventType: string;
  amount: number;
  currency: string;
  tag: string;
  eventId: string;
  status: string;
  points?: string;
  reason?: string;
  ok: boolean;
};

const DEFAULT_COUNTS: Counts = {
  purchaseOk: 5,
  purchaseUsd: 2,
  purchaseJpy: 2,
  tooSmall: 1,
  tooOld: 1,
  signup: 1,
  redeem: 1,
  duplicate: 1,
};

function randCust(): string {
  return `01A${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`;
}

function daysAgoIso(days: number): string {
  const d = new Date(Date.now() - days * 864e5);
  return d.toISOString().replace(/\.\d{3}Z$/, "Z");
}

function randAmount(min: number, max: number, fixed: number): number {
  if (min > 0 && max >= min) {
    return Math.floor(min + Math.random() * (max - min + 1));
  }
  return fixed;
}

/**
 * In-browser upstream simulator — same matrix as scripts/upstream-sim.sh suite.
 * Engine must already be running (portal cannot restart Java).
 */
export default function SimulatorPage() {
  const [cust, setCust] = useState(randCust);
  const [amount, setAmount] = useState(200);
  const [amountMin, setAmountMin] = useState(0);
  const [amountMax, setAmountMax] = useState(0);
  const [counts, setCounts] = useState<Counts>({ ...DEFAULT_COUNTS });
  const [doBootstrap, setDoBootstrap] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<LogRow[]>([]);
  const [wallet, setWallet] = useState<unknown>(null);
  const [fails, setFails] = useState<unknown>(null);
  const [lastGoodEventId, setLastGoodEventId] = useState("");

  const summary = useMemo(() => {
    const s = { EARNED: 0, BURNED: 0, SKIPPED: 0, DUPLICATE: 0, OTHER: 0 };
    for (const r of log) {
      if (r.status in s) s[r.status as keyof typeof s]++;
      else s.OTHER++;
    }
    return s;
  }, [log]);

  const setCount = (k: keyof Counts, v: string) => {
    const n = Math.max(0, Math.min(100, Number(v) || 0));
    setCounts((c) => ({ ...c, [k]: n }));
  };

  const fire = useCallback(
    async (
      n: number,
      eventType: string,
      amt: number,
      currency: string,
      tag: string,
      occurredAt: string,
      eventIdOverride?: string,
    ): Promise<LogRow> => {
      const eventId =
        eventIdOverride ||
        `sim-${Date.now()}-${n}-${Math.floor(Math.random() * 9999)}`;
      try {
        const res = await ledger.post("/integrations/webhooks/transactions", {
          eventId,
          associatedIdentifier: cust.trim(),
          eventType,
          amount: amt,
          currency,
          occurredAt,
          metadata: { source: "admin-portal-simulator", tag },
        });
        const data = asRecord(res) || {};
        const status = String(data.status ?? "ERR");
        const row: LogRow = {
          n,
          eventType,
          amount: amt,
          currency,
          tag,
          eventId,
          status,
          points: data.points != null ? String(data.points) : undefined,
          reason: data.reason != null ? String(data.reason) : undefined,
          ok: true,
        };
        if (status === "EARNED" || status === "BURNED") {
          setLastGoodEventId(eventId);
        }
        return row;
      } catch (e) {
        return {
          n,
          eventType,
          amount: amt,
          currency,
          tag,
          eventId,
          status: "ERR",
          reason: e instanceof ApiError ? e.message : String(e),
          ok: false,
        };
      }
    },
    [cust],
  );

  const bootstrap = useCallback(async () => {
    await ledger.put("/ingest-policy", {
      isEnabled: true,
      isAutoCreateWallet: true,
      autoWalletSettlementCurrency: "HKD",
      autoWalletEnsureCurrency: "LP",
      autoWalletAssociatedFrom: "CRM",
      autoWalletNamePrefix: "Auto ",
    });
    // upsert rules by list+create if missing is heavy; create best-effort
    const existing = asArray<Record<string, unknown>>(
      await ledger.get("/digestion-rules"),
    );
    const codes = new Set(existing.map((r) => String(r.code ?? "")));
    const ensure = async (body: Record<string, unknown>) => {
      const code = String(body.code);
      if (codes.has(code)) {
        const row = existing.find((r) => String(r.code) === code);
        if (row?.id != null) {
          await ledger.put(`/digestion-rules/${row.id}`, body);
        }
        return;
      }
      try {
        await ledger.post("/digestion-rules", body);
      } catch {
        /* ignore conflict */
      }
    };
    await ensure({
      code: "PURCHASE_DEFAULT",
      name: "Purchase earn 1%",
      eventType: "PURCHASE",
      operation: "EARN",
      isEnabled: true,
      priority: 10,
      minAmount: 0.01,
      eligibleCurrencies: ["HKD", "USD"],
      maxAgeDays: 7,
      pointCurrency: "LP",
      formula: "RATE:0.01",
    });
    await ensure({
      code: "SIGNUP_DEFAULT",
      name: "Signup fixed LP",
      eventType: "SIGNUP",
      operation: "EARN",
      isEnabled: true,
      priority: 20,
      minAmount: 0,
      pointCurrency: "LP",
      formula: "FIXED:100",
    });
    await ensure({
      code: "REDEEM_DEFAULT",
      name: "Redeem burn",
      eventType: "REDEEM",
      operation: "BURN",
      isEnabled: true,
      priority: 30,
      minAmount: 1,
      pointCurrency: "LP",
      formula: "AMOUNT",
    });
  }, []);

  const runSuite = useCallback(async () => {
    if (!cust.trim()) {
      setError("CUST / associatedIdentifier required");
      return;
    }
    setRunning(true);
    setError(null);
    setLog([]);
    setWallet(null);
    setFails(null);
    let n = 0;
    const rows: LogRow[] = [];
    const push = (row: LogRow) => {
      rows.push(row);
      setLog([...rows]);
    };
    try {
      if (doBootstrap) {
        await bootstrap();
      }
      const amt = () =>
        randAmount(amountMin, amountMax, amount);

      for (let i = 0; i < counts.purchaseOk; i++) {
        n++;
        push(await fire(n, "PURCHASE", amt(), "HKD", "ok-hkd", nowIso()));
      }
      for (let i = 0; i < counts.purchaseUsd; i++) {
        n++;
        push(await fire(n, "PURCHASE", amt(), "USD", "ok-usd", nowIso()));
      }
      for (let i = 0; i < counts.purchaseJpy; i++) {
        n++;
        push(await fire(n, "PURCHASE", 50, "JPY", "filter-currency", nowIso()));
      }
      for (let i = 0; i < counts.tooSmall; i++) {
        n++;
        push(await fire(n, "PURCHASE", 0, "HKD", "filter-amount", nowIso()));
      }
      for (let i = 0; i < counts.tooOld; i++) {
        n++;
        push(
          await fire(n, "PURCHASE", 100, "HKD", "filter-age", daysAgoIso(30)),
        );
      }
      for (let i = 0; i < counts.signup; i++) {
        n++;
        push(await fire(n, "SIGNUP", 0, "LP", "signup", nowIso()));
      }
      for (let i = 0; i < counts.redeem; i++) {
        n++;
        push(await fire(n, "REDEEM", 1, "LP", "redeem", nowIso()));
      }
      // duplicate last good from rows
      const good = [...rows].reverse().find((r) => r.status === "EARNED" || r.status === "BURNED");
      if (counts.duplicate > 0 && good) {
        for (let i = 0; i < counts.duplicate; i++) {
          n++;
          push(
            await fire(
              n,
              good.eventType,
              good.amount,
              good.currency,
              "duplicate",
              nowIso(),
              good.eventId,
            ),
          );
        }
      }

      const [w, f] = await Promise.all([
        ledger.get(
          `/wallets/${encodeURIComponent(cust.trim())}?currencies=LP,HKD`,
        ),
        ledger.get(
          `/integrations/failed-transactions?associatedIdentifier=${encodeURIComponent(cust.trim())}&status=OPEN&page=1&size=50`,
        ),
      ]);
      setWallet(w);
      setFails(f);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  }, [
    amount,
    amountMax,
    amountMin,
    bootstrap,
    counts,
    cust,
    doBootstrap,
    fire,
  ]);

  const walletData = asRecord(wallet);
  const accounts = Array.isArray(walletData?.accounts)
    ? (walletData!.accounts as Record<string, unknown>[])
    : [];

  return (
    <div>
      <PageHeader
        title="Transaction simulator"
        description="Play upstream POS in the browser — configurable counts + filter matrix (same idea as ./scripts/upstream-sim.sh suite). Engine must already be running."
      />

      <Alert variant="info">
        Portal <strong>cannot</strong> restart Java / ddl=create. For full greenfield wipe, run{" "}
        <code>./scripts/upstream-sim.sh</code> once, or restart engine yourself, then use this page for
        repeatable matrix runs.
      </Alert>

      {error ? (
        <div className="mt-4">
          <Alert variant="error">{error}</Alert>
        </div>
      ) : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Customer & amount" />
          <CardBody className="grid gap-3">
            <Field label="associatedIdentifier (CUST)">
              <div className="flex gap-2">
                <Input
                  className="font-mono"
                  value={cust}
                  onChange={(e) => setCust(e.target.value)}
                />
                <Button type="button" variant="secondary" onClick={() => setCust(randCust())}>
                  New
                </Button>
              </div>
            </Field>
            <div className="grid grid-cols-3 gap-2">
              <Field label="AMOUNT">
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                />
              </Field>
              <Field label="AMOUNT_MIN (0=off)">
                <Input
                  type="number"
                  value={amountMin}
                  onChange={(e) => setAmountMin(Number(e.target.value))}
                />
              </Field>
              <Field label="AMOUNT_MAX">
                <Input
                  type="number"
                  value={amountMax}
                  onChange={(e) => setAmountMax(Number(e.target.value))}
                />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm text-zinc-700">
              <input
                type="checkbox"
                checked={doBootstrap}
                onChange={(e) => setDoBootstrap(e.target.checked)}
              />
              Bootstrap ingest-policy + default digestion rules before run
            </label>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Counts (filter matrix)" description="0 = skip that bucket" />
          <CardBody className="grid grid-cols-2 gap-2">
            {(
              [
                ["purchaseOk", "PURCHASE HKD (EARNED)"],
                ["purchaseUsd", "PURCHASE USD (EARNED)"],
                ["purchaseJpy", "PURCHASE JPY (SKIP currency)"],
                ["tooSmall", "amount=0 (SKIP)"],
                ["tooOld", "age 30d (SKIP)"],
                ["signup", "SIGNUP FIXED"],
                ["redeem", "REDEEM 1 LP"],
                ["duplicate", "DUPLICATE last good"],
              ] as const
            ).map(([k, label]) => (
              <Field key={k} label={label}>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={counts[k]}
                  onChange={(e) => setCount(k, e.target.value)}
                />
              </Field>
            ))}
          </CardBody>
        </Card>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={() => void runSuite()} disabled={running}>
          {running ? "Running…" : "Run simulator suite"}
        </Button>
        <Button
          variant="secondary"
          disabled={running}
          onClick={() => {
            setCounts({ ...DEFAULT_COUNTS });
            setAmount(200);
            setAmountMin(0);
            setAmountMax(0);
          }}
        >
          Reset defaults
        </Button>
        <Link
          href={`/review`}
          className="inline-flex items-center rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-800 hover:bg-zinc-50"
          onClick={() => {
            try {
              sessionStorage.setItem("ledger-review-cust", cust.trim());
            } catch {
              /* ignore */
            }
          }}
        >
          Open Customer review →
        </Link>
      </div>

      {log.length > 0 ? (
        <Card className="mt-4">
          <CardHeader
            title="Results"
            description={`EARNED ${summary.EARNED} · BURNED ${summary.BURNED} · SKIPPED ${summary.SKIPPED} · DUPLICATE ${summary.DUPLICATE} · OTHER ${summary.OTHER}`}
          />
          <CardBody className="overflow-x-auto">
            <p className="mb-2 font-mono text-xs text-zinc-600">
              CUST=<strong>{cust}</strong>
              {lastGoodEventId ? ` · lastGoodEventId=${lastGoodEventId}` : ""}
            </p>
            <table className="w-full min-w-[800px] text-left text-xs">
              <thead className="border-b text-zinc-500">
                <tr>
                  <th className="py-1 pr-2">#</th>
                  <th className="py-1 pr-2">tag</th>
                  <th className="py-1 pr-2">type</th>
                  <th className="py-1 pr-2">amt</th>
                  <th className="py-1 pr-2">ccy</th>
                  <th className="py-1 pr-2">status</th>
                  <th className="py-1 pr-2">pts</th>
                  <th className="py-1">eventId / reason</th>
                </tr>
              </thead>
              <tbody>
                {log.map((r) => (
                  <tr key={`${r.n}-${r.eventId}`} className="border-b border-zinc-100">
                    <td className="py-1 pr-2 tabular-nums">{r.n}</td>
                    <td className="py-1 pr-2">{r.tag}</td>
                    <td className="py-1 pr-2">{r.eventType}</td>
                    <td className="py-1 pr-2 tabular-nums">{r.amount}</td>
                    <td className="py-1 pr-2">{r.currency}</td>
                    <td
                      className={`py-1 pr-2 font-medium ${
                        r.status === "EARNED" || r.status === "BURNED"
                          ? "text-emerald-700"
                          : r.status === "SKIPPED"
                            ? "text-amber-700"
                            : r.status === "DUPLICATE"
                              ? "text-sky-700"
                              : "text-red-600"
                      }`}
                    >
                      {r.status}
                    </td>
                    <td className="py-1 pr-2 tabular-nums">{r.points ?? "—"}</td>
                    <td className="max-w-[280px] truncate py-1 font-mono" title={r.reason || r.eventId}>
                      {r.reason || r.eventId}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      ) : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Wallet after run" />
          <CardBody>
            {accounts.length ? (
              <div className="mb-3 grid gap-2 sm:grid-cols-2">
                {accounts.map((a, i) => (
                  <div key={String(a.id ?? i)} className="rounded-lg border border-zinc-100 p-2 text-sm">
                    <div className="text-xs text-zinc-500">{String(a.currency)}</div>
                    <div>
                      ledger{" "}
                      <strong className="tabular-nums">
                        {String(a.ledgerBalance ?? "—")}
                      </strong>
                    </div>
                    <div>
                      available{" "}
                      <strong className="tabular-nums">
                        {String(a.availableBalance ?? "—")}
                      </strong>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
            <JsonBlock value={wallet ?? { hint: "Run suite" }} maxHeight={240} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="OPEN fails for CUST" />
          <CardBody>
            <JsonBlock value={fails ?? { hint: "Run suite" }} maxHeight={280} />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
