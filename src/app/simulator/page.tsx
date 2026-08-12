"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  hold: number;
  release: number;
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
  movementId?: string;
};

const PRESETS: Record<string, { label: string; counts: Counts; amount: number; min: number; max: number }> = {
  default: {
    label: "Default matrix",
    counts: {
      purchaseOk: 5,
      purchaseUsd: 2,
      purchaseJpy: 2,
      tooSmall: 1,
      tooOld: 1,
      signup: 1,
      redeem: 1,
      hold: 1,
      release: 1,
      duplicate: 1,
    },
    amount: 200,
    min: 0,
    max: 0,
  },
  smoke: {
    label: "Quick smoke",
    counts: {
      purchaseOk: 2,
      purchaseUsd: 1,
      purchaseJpy: 1,
      tooSmall: 1,
      tooOld: 0,
      signup: 1,
      redeem: 0,
      hold: 0,
      release: 0,
      duplicate: 1,
    },
    amount: 200,
    min: 0,
    max: 0,
  },
  filterHeavy: {
    label: "Filter heavy",
    counts: {
      purchaseOk: 3,
      purchaseUsd: 2,
      purchaseJpy: 8,
      tooSmall: 3,
      tooOld: 3,
      signup: 0,
      redeem: 0,
      hold: 0,
      release: 0,
      duplicate: 1,
    },
    amount: 150,
    min: 20,
    max: 500,
  },
  volume: {
    label: "Volume earn",
    counts: {
      purchaseOk: 20,
      purchaseUsd: 5,
      purchaseJpy: 2,
      tooSmall: 0,
      tooOld: 0,
      signup: 1,
      redeem: 2,
      hold: 2,
      release: 2,
      duplicate: 2,
    },
    amount: 100,
    min: 50,
    max: 800,
  },
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
 * Full upstream simulator in UI — primary way to generate review data locally.
 * Engine must be running (portal does not restart JVM).
 */
export default function SimulatorPage() {
  const router = useRouter();
  const [cust, setCust] = useState(randCust);
  const [amount, setAmount] = useState(200);
  const [amountMin, setAmountMin] = useState(0);
  const [amountMax, setAmountMax] = useState(0);
  const [counts, setCounts] = useState<Counts>({ ...PRESETS.default.counts });
  const [doBootstrap, setDoBootstrap] = useState(true);
  const [goReviewAfter, setGoReviewAfter] = useState(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<string>("—");
  const [log, setLog] = useState<LogRow[]>([]);
  const [wallet, setWallet] = useState<unknown>(null);
  const [fails, setFails] = useState<unknown>(null);
  const [movements, setMovements] = useState<unknown>(null);
  const [lastGoodEventId, setLastGoodEventId] = useState("");
  const [lastLegs, setLastLegs] = useState<unknown>(null);

  const totalPlanned = useMemo(() => {
    return (
      counts.purchaseOk +
      counts.purchaseUsd +
      counts.purchaseJpy +
      counts.tooSmall +
      counts.tooOld +
      counts.signup +
      counts.redeem +
      counts.hold +
      counts.release +
      counts.duplicate
    );
  }, [counts]);

  const summary = useMemo(() => {
    const s = { EARNED: 0, BURNED: 0, SKIPPED: 0, DUPLICATE: 0, HOLD: 0, RELEASE: 0, OTHER: 0 };
    for (const r of log) {
      if (r.tag === "hold" && r.status !== "ERR") s.HOLD++;
      else if (r.tag === "release" && r.status !== "ERR") s.RELEASE++;
      else if (r.status in s) s[r.status as keyof typeof s]++;
      else s.OTHER++;
    }
    return s;
  }, [log]);

  const ping = useCallback(async () => {
    try {
      const h = await ledger.get<{ status?: string }>("/actuator/health");
      setHealth(String((h as { status?: string })?.status ?? "UP"));
      setError(null);
    } catch (e) {
      setHealth("DOWN");
      setError(
        e instanceof ApiError
          ? `Engine unreachable: ${e.message}`
          : "Engine unreachable — start ledger-engine on :8080",
      );
    }
  }, []);

  useEffect(() => {
    void ping();
  }, [ping]);

  const setCount = (k: keyof Counts, v: string) => {
    const n = Math.max(0, Math.min(200, Number(v) || 0));
    setCounts((c) => ({ ...c, [k]: n }));
  };

  const applyPreset = (key: string) => {
    const p = PRESETS[key];
    if (!p) return;
    setCounts({ ...p.counts });
    setAmount(p.amount);
    setAmountMin(p.min);
    setAmountMax(p.max);
  };

  const fireWebhook = useCallback(
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
          movementId: data.movementId != null ? String(data.movementId) : undefined,
        };
        if (status === "EARNED" || status === "BURNED") {
          setLastGoodEventId(eventId);
          setLastLegs(data.legs ?? res);
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
        };
      }
    },
    [cust],
  );

  const fireHoldRelease = useCallback(
    async (
      n: number,
      kind: "hold" | "release",
      amt: number,
    ): Promise<LogRow> => {
      const path = kind === "hold" ? "/wallets/holds" : "/wallets/releases";
      const eventId = `${kind}-${Date.now()}-${n}`;
      try {
        const res = await ledger.post(path, {
          associatedIdentifier: cust.trim(),
          currency: "LP",
          amount: amt,
          movementKey: eventId,
          description: `simulator ${kind}`,
        });
        const data = asRecord(res) || {};
        return {
          n,
          eventType: kind.toUpperCase(),
          amount: amt,
          currency: "LP",
          tag: kind,
          eventId,
          status: String(data.orderType ?? data.status ?? "OK"),
          movementId: data.id != null ? String(data.id) : undefined,
        };
      } catch (e) {
        return {
          n,
          eventType: kind.toUpperCase(),
          amount: amt,
          currency: "LP",
          tag: kind,
          eventId,
          status: "ERR",
          reason: e instanceof ApiError ? e.message : String(e),
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
        /* conflict ok */
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
    setMovements(null);
    setLastLegs(null);
    setProgress({ done: 0, total: totalPlanned });

    let n = 0;
    const rows: LogRow[] = [];
    const tick = (row: LogRow) => {
      rows.push(row);
      setLog([...rows]);
      setProgress({ done: rows.length, total: Math.max(totalPlanned, rows.length) });
    };

    try {
      await ping();
      if (doBootstrap) await bootstrap();

      const amt = () => randAmount(amountMin, amountMax, amount);

      for (let i = 0; i < counts.purchaseOk; i++) {
        n++;
        tick(await fireWebhook(n, "PURCHASE", amt(), "HKD", "ok-hkd", nowIso()));
      }
      for (let i = 0; i < counts.purchaseUsd; i++) {
        n++;
        tick(await fireWebhook(n, "PURCHASE", amt(), "USD", "ok-usd", nowIso()));
      }
      for (let i = 0; i < counts.purchaseJpy; i++) {
        n++;
        tick(await fireWebhook(n, "PURCHASE", 50, "JPY", "filter-currency", nowIso()));
      }
      for (let i = 0; i < counts.tooSmall; i++) {
        n++;
        tick(await fireWebhook(n, "PURCHASE", 0, "HKD", "filter-amount", nowIso()));
      }
      for (let i = 0; i < counts.tooOld; i++) {
        n++;
        tick(
          await fireWebhook(n, "PURCHASE", 100, "HKD", "filter-age", daysAgoIso(30)),
        );
      }
      for (let i = 0; i < counts.signup; i++) {
        n++;
        tick(await fireWebhook(n, "SIGNUP", 0, "LP", "signup", nowIso()));
      }
      for (let i = 0; i < counts.redeem; i++) {
        n++;
        tick(await fireWebhook(n, "REDEEM", 1, "LP", "redeem", nowIso()));
      }
      for (let i = 0; i < counts.hold; i++) {
        n++;
        tick(await fireHoldRelease(n, "hold", 1));
      }
      for (let i = 0; i < counts.release; i++) {
        n++;
        tick(await fireHoldRelease(n, "release", 1));
      }

      const good = [...rows]
        .reverse()
        .find((r) => r.status === "EARNED" || r.status === "BURNED");
      if (counts.duplicate > 0 && good) {
        for (let i = 0; i < counts.duplicate; i++) {
          n++;
          tick(
            await fireWebhook(
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

      const id = cust.trim();
      const [w, f, m] = await Promise.all([
        ledger.get(`/wallets/${encodeURIComponent(id)}?currencies=LP,HKD`),
        ledger.get(
          `/integrations/failed-transactions?associatedIdentifier=${encodeURIComponent(id)}&page=1&size=50`,
        ),
        ledger.get(`/wallets/${encodeURIComponent(id)}/movements?page=1&size=30`),
      ]);
      setWallet(w);
      setFails(f);
      setMovements(m);

      try {
        sessionStorage.setItem("ledger-review-cust", id);
      } catch {
        /* ignore */
      }

      if (goReviewAfter) {
        router.push("/review");
      }
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
    fireHoldRelease,
    fireWebhook,
    goReviewAfter,
    ping,
    router,
    totalPlanned,
  ]);

  const downloadReport = () => {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            cust,
            summary,
            lastGoodEventId,
            log,
            wallet,
            fails,
            at: new Date().toISOString(),
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `sim-report-${cust || "run"}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const copyCust = async () => {
    try {
      await navigator.clipboard.writeText(cust.trim());
    } catch {
      /* ignore */
    }
  };

  const walletData = asRecord(wallet);
  const accounts = Array.isArray(walletData?.accounts)
    ? (walletData!.accounts as Record<string, unknown>[])
    : [];

  const pct =
    progress.total > 0 ? Math.round((100 * progress.done) / progress.total) : 0;

  return (
    <div>
      <PageHeader
        title="Transaction simulator"
        description="Full upstream matrix in the UI — configure counts, run suite, review wallet / fails / legs. Engine must be up on LEDGER_ENGINE_URL."
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            health === "UP"
              ? "bg-emerald-100 text-emerald-800"
              : health === "DOWN"
                ? "bg-red-100 text-red-800"
                : "bg-zinc-100 text-zinc-600"
          }`}
        >
          engine: {health}
        </span>
        <Button variant="secondary" onClick={() => void ping()} disabled={running}>
          Ping
        </Button>
        <span className="text-xs text-zinc-500">
          For schema wipe use <code>JPA_DDL_AUTO=create</code> restart of engine (portal cannot).
        </span>
      </div>

      {error ? (
        <div className="mb-4">
          <Alert variant="error">{error}</Alert>
        </div>
      ) : null}

      <Card className="mb-4">
        <CardHeader title="Presets" description="One click load count matrix" />
        <CardBody className="flex flex-wrap gap-2">
          {Object.entries(PRESETS).map(([k, p]) => (
            <Button
              key={k}
              variant="secondary"
              disabled={running}
              onClick={() => applyPreset(k)}
            >
              {p.label}
            </Button>
          ))}
        </CardBody>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
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
                <Button type="button" variant="ghost" onClick={() => void copyCust()}>
                  Copy
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
              <Field label="MIN (0=off)">
                <Input
                  type="number"
                  value={amountMin}
                  onChange={(e) => setAmountMin(Number(e.target.value))}
                />
              </Field>
              <Field label="MAX">
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
              Bootstrap ingest-policy + digestion defaults before run
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-700">
              <input
                type="checkbox"
                checked={goReviewAfter}
                onChange={(e) => setGoReviewAfter(e.target.checked)}
              />
              After run → open Customer review
            </label>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Counts (filter matrix)"
            description={`Total events planned: ${totalPlanned}`}
          />
          <CardBody className="grid grid-cols-2 gap-2">
            {(
              [
                ["purchaseOk", "PURCHASE HKD ✓"],
                ["purchaseUsd", "PURCHASE USD ✓"],
                ["purchaseJpy", "JPY → SKIP currency"],
                ["tooSmall", "amount=0 → SKIP"],
                ["tooOld", "age 30d → SKIP"],
                ["signup", "SIGNUP FIXED 100"],
                ["redeem", "REDEEM 1 LP"],
                ["hold", "HOLD 1 LP"],
                ["release", "RELEASE 1 LP"],
                ["duplicate", "DUPLICATE last good"],
              ] as const
            ).map(([k, label]) => (
              <Field key={k} label={label}>
                <Input
                  type="number"
                  min={0}
                  max={200}
                  value={counts[k]}
                  onChange={(e) => setCount(k, e.target.value)}
                />
              </Field>
            ))}
          </CardBody>
        </Card>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button onClick={() => void runSuite()} disabled={running || health === "DOWN"}>
          {running ? `Running… ${progress.done}/${progress.total}` : "▶ Run full simulator"}
        </Button>
        <Button
          variant="secondary"
          disabled={running}
          onClick={() => applyPreset("default")}
        >
          Reset defaults
        </Button>
        <Button variant="secondary" disabled={!log.length} onClick={downloadReport}>
          Download JSON report
        </Button>
        <Link
          href="/review"
          className="inline-flex items-center rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-800 hover:bg-zinc-50"
          onClick={() => {
            try {
              sessionStorage.setItem("ledger-review-cust", cust.trim());
            } catch {
              /* ignore */
            }
          }}
        >
          Customer review →
        </Link>
        <Link
          href="/failed-transactions"
          className="inline-flex items-center rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-800 hover:bg-zinc-50"
        >
          Failed ingest →
        </Link>
      </div>

      {running || progress.done > 0 ? (
        <div className="mt-3">
          <div className="mb-1 flex justify-between text-xs text-zinc-500">
            <span>Progress</span>
            <span>
              {progress.done}/{progress.total || "—"} ({pct}%)
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      ) : null}

      {log.length > 0 ? (
        <Card className="mt-4">
          <CardHeader
            title="Results"
            description={`EARNED ${summary.EARNED} · BURNED ${summary.BURNED} · SKIPPED ${summary.SKIPPED} · DUPLICATE ${summary.DUPLICATE} · HOLD ${summary.HOLD} · RELEASE ${summary.RELEASE} · OTHER ${summary.OTHER}`}
          />
          <CardBody className="overflow-x-auto">
            <p className="mb-2 font-mono text-xs text-zinc-600">
              CUST=<strong>{cust}</strong>
              {lastGoodEventId ? ` · lastGoodEventId=${lastGoodEventId}` : ""}
            </p>
            <table className="w-full min-w-[860px] text-left text-xs">
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
                  <tr key={`${r.n}-${r.eventId}-${r.tag}`} className="border-b border-zinc-100">
                    <td className="py-1 pr-2 tabular-nums">{r.n}</td>
                    <td className="py-1 pr-2">{r.tag}</td>
                    <td className="py-1 pr-2">{r.eventType}</td>
                    <td className="py-1 pr-2 tabular-nums">{r.amount}</td>
                    <td className="py-1 pr-2">{r.currency}</td>
                    <td
                      className={`py-1 pr-2 font-medium ${
                        r.status === "EARNED" || r.status === "BURNED" || r.status === "HOLD" || r.status === "RELEASE"
                          ? "text-emerald-700"
                          : r.status === "SKIPPED"
                            ? "text-amber-700"
                            : r.status === "DUPLICATE"
                              ? "text-sky-700"
                              : r.status === "OK"
                                ? "text-emerald-700"
                                : "text-red-600"
                      }`}
                    >
                      {r.status}
                    </td>
                    <td className="py-1 pr-2 tabular-nums">{r.points ?? "—"}</td>
                    <td
                      className="max-w-[280px] truncate py-1 font-mono"
                      title={r.reason || r.eventId}
                    >
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
                  <div
                    key={String(a.id ?? i)}
                    className="rounded-lg border border-zinc-100 p-2 text-sm"
                  >
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
            <JsonBlock value={wallet ?? { hint: "Run simulator" }} maxHeight={220} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Failed ingest (this CUST)" />
          <CardBody>
            <JsonBlock value={fails ?? { hint: "Run simulator" }} maxHeight={220} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Movements (sample)" />
          <CardBody>
            <JsonBlock value={movements ?? { hint: "Run simulator" }} maxHeight={220} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Last earn legs" description="from last EARNED webhook response" />
          <CardBody>
            <JsonBlock value={lastLegs ?? { hint: "Need at least one EARNED" }} maxHeight={220} />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
