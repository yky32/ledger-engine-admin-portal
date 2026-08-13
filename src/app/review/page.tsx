"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader, Card, Badge, Empty, JsonBlock, Alert } from "@/components/ui/kit";
import { ActionBar } from "@/components/ui/action";
import { engine } from "@/lib/engine";
import { errMsg, money, shortId } from "@/lib/format";
import type { FailedIngest, LedgerLeg, MovementView, WalletView } from "@/lib/types";
import { FlowStrip } from "@/components/layout/flow-strip";
import { EngineStatusBanner } from "@/components/layout/engine-status-banner";

export default function ReviewPage() {
  const [ownerId, setOwnerId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wallet, setWallet] = useState<WalletView | null>(null);
  const [movements, setMovements] = useState<MovementView[]>([]);
  const [fails, setFails] = useState<FailedIngest[]>([]);
  const [asOf, setAsOf] = useState<unknown>(null);
  const [legs, setLegs] = useState<LedgerLeg[]>([]);
  const [selectedMovementId, setSelectedMovementId] = useState<number | null>(null);

  useEffect(() => {
    try {
      const s = sessionStorage.getItem("review.ownerId");
      if (s) setOwnerId(s);
    } catch {
      /* ignore */
    }
  }, []);

  const load = useCallback(async () => {
    const id = ownerId.trim();
    if (!id) {
      setError("ownerId required");
      return;
    }
    setLoading(true);
    setError(null);
    setLegs([]);
    setSelectedMovementId(null);
    try {
      const [w, m, f, a] = await Promise.all([
        engine.getWallet(id),
        engine.movements(id),
        engine.failedList({ ownerId: id, size: 50 }),
        engine.asOf(id).catch(() => ({ data: null })),
      ]);
      setWallet(w.data);
      setMovements(Array.isArray(m.data) ? m.data : []);
      setFails(Array.isArray(f.data) ? f.data : []);
      setAsOf(a.data);
    } catch (e) {
      setError(errMsg(e));
      setWallet(null);
      setMovements([]);
      setFails([]);
      setAsOf(null);
    } finally {
      setLoading(false);
    }
  }, [ownerId]);

  const loadLegs = async (movementId: number) => {
    setSelectedMovementId(movementId);
    try {
      const r = await engine.legs({ movementId });
      setLegs(Array.isArray(r.data) ? r.data : []);
    } catch (e) {
      setError(errMsg(e));
    }
  };

  return (
    <div>
      <FlowStrip active="engine" />
      <EngineStatusBanner />
      <PageHeader
        title="Customer review"
        description="Lookup by ownerId — wallet books, movements, as-of balances, failed ingest, DE legs."
        actions={
          <Link href="/simulator" className="btn-secondary text-xs">
            Open simulator
          </Link>
        }
      />

      <Card className="mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="field min-w-[220px] flex-1">
            <span className="field-label">ownerId</span>
            <input
              className="field-input font-mono"
              placeholder="01A12345678"
              value={ownerId}
              onChange={(e) => setOwnerId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load()}
            />
          </label>
          <ActionBar loading={loading} error={error}>
            <button type="button" className="btn-primary" onClick={load} disabled={loading}>
              Load
            </button>
          </ActionBar>
        </div>
      </Card>

      {wallet ? (
        <div className="mb-4 grid gap-4 lg:grid-cols-2">
          <Card title="Wallet" description={`ownerId ${wallet.ownerId || ownerId}`}>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
              <dt className="text-slate-500">walletId</dt>
              <dd className="font-mono text-xs">{wallet.walletId ?? "—"}</dd>
              <dt className="text-slate-500">status</dt>
              <dd>
                <Badge tone="ok">{wallet.status || "—"}</Badge>
              </dd>
              <dt className="text-slate-500">settlement</dt>
              <dd>{wallet.settlementCurrency || "—"}</dd>
              <dt className="text-slate-500">COA profile</dt>
              <dd className="font-mono text-xs">{wallet.coaProfileCode || "DEFAULT"}</dd>
              <dt className="text-slate-500">type / walletType</dt>
              <dd>
                {wallet.type || "—"} · {wallet.walletType || "—"}
              </dd>
              <dt className="text-slate-500">vanityCode</dt>
              <dd className="font-mono text-xs">{wallet.vanityCode || "—"}</dd>
              <dt className="text-slate-500">name</dt>
              <dd>{wallet.name || "—"}</dd>
            </dl>
            <div className="mt-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Accounts
              </div>
              {(wallet.accounts?.length ? wallet.accounts : wallet.account ? [wallet.account] : [])
                .length === 0 ? (
                <Empty>No accounts</Empty>
              ) : (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>entity</th>
                        <th>ccy</th>
                        <th>fullNumber</th>
                        <th>ledger</th>
                        <th>available</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(wallet.accounts?.length
                        ? wallet.accounts
                        : wallet.account
                          ? [wallet.account]
                          : []
                      ).map((a, i) => (
                        <tr key={a.id ?? i}>
                          <td className="font-mono text-xs">{a.entity ?? "—"}</td>
                          <td className="font-medium">{a.currency}</td>
                          <td className="font-mono text-[10px] text-slate-600">{a.fullNumber}</td>
                          <td className="font-mono text-xs">{money(a.ledgerBalance)}</td>
                          <td className="font-mono text-xs">{money(a.availableBalance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Card>

          <Card title="As-of balances" description="GET …/balances/as-of">
            {asOf ? <JsonBlock value={asOf} maxHeight={280} /> : <Empty>No as-of data</Empty>}
          </Card>
        </div>
      ) : null}

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Card
          title="Movements"
          description={`${movements.length} row(s)`}
          right={
            selectedMovementId ? (
              <Badge tone="info">legs · {selectedMovementId}</Badge>
            ) : null
          }
        >
          {movements.length === 0 ? (
            <Empty>No movements</Empty>
          ) : (
            <div className="table-wrap max-h-96 overflow-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>id</th>
                    <th>type</th>
                    <th>amt</th>
                    <th>status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {movements.map((m) => (
                    <tr key={m.id}>
                      <td className="font-mono text-[10px]">{m.id}</td>
                      <td>
                        <span className="font-medium">{m.orderType}</span>
                        <div className="text-[10px] text-slate-400">{m.currency}</div>
                      </td>
                      <td className="font-mono text-xs">{money(m.amount)}</td>
                      <td>
                        <Badge
                          tone={
                            m.status === "SETTLED"
                              ? "ok"
                              : m.status === "ERROR" || m.status === "REJECTED"
                                ? "error"
                                : "neutral"
                          }
                        >
                          {m.status}
                        </Badge>
                      </td>
                      <td>
                        {m.id != null ? (
                          <button
                            type="button"
                            className="btn-ghost text-xs"
                            onClick={() => loadLegs(m.id!)}
                          >
                            Legs
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title="Failed ingest" description={`ownerId filter · ${fails.length}`}>
          {fails.length === 0 ? (
            <Empty>No fails for this customer</Empty>
          ) : (
            <div className="table-wrap max-h-96 overflow-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>id</th>
                    <th>code</th>
                    <th>status</th>
                    <th>reason</th>
                  </tr>
                </thead>
                <tbody>
                  {fails.map((f) => (
                    <tr key={f.id}>
                      <td className="font-mono text-[10px]">{f.id}</td>
                      <td className="font-mono text-xs">{f.failureCode}</td>
                      <td>
                        <Badge tone={f.status === "OPEN" ? "warn" : "neutral"}>
                          {f.status}
                        </Badge>
                      </td>
                      <td className="max-w-[180px] truncate text-xs text-slate-600">
                        {f.reason}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-3">
            <Link href="/failed-transactions" className="text-xs text-emerald-700 underline">
              Open failed-ingest desk →
            </Link>
          </div>
        </Card>
      </div>

      <Card title="Ledger legs" description="from selected movement">
        {legs.length === 0 ? (
          <Empty>Select a movement → Legs</Empty>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>entryId</th>
                  <th>accountId</th>
                  <th>dir</th>
                  <th>amount</th>
                  <th>ccy</th>
                </tr>
              </thead>
              <tbody>
                {legs.map((e, i) => (
                  <tr key={e.entryId ?? i}>
                    <td className="font-mono text-[10px]">{e.entryId}</td>
                    <td className="font-mono text-[10px]">{e.accountId}</td>
                    <td>
                      <Badge tone={e.direction === "CREDIT" ? "ok" : "warn"}>
                        {e.direction}
                      </Badge>
                    </td>
                    <td className="font-mono text-xs">{money(e.amount)}</td>
                    <td>{e.currency}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {wallet ? (
        <div className="mt-4">
          <Alert tone="info">
            Raw wallet JSON collapsed — use browser network or legs JSON if needed.
          </Alert>
          <details className="mt-2">
            <summary className="cursor-pointer text-xs text-slate-500">wallet payload</summary>
            <div className="mt-2">
              <JsonBlock value={wallet} />
            </div>
          </details>
        </div>
      ) : null}
    </div>
  );
}
