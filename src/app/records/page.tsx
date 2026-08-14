"use client";

/**
 * LedgeRX Admin — live DB records via engine GET APIs (what is actually persisted).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader, Card, Badge, JsonBlock, Empty, Alert } from "@/components/ui/kit";
import { ActionBar } from "@/components/ui/action";
import { FlowStrip } from "@/components/layout/flow-strip";
import { EngineStatusBanner } from "@/components/layout/engine-status-banner";
import { engine } from "@/lib/engine";
import { errMsg, money, shortId } from "@/lib/format";
import type {
  DigestionRule,
  FailedIngest,
  IngestPolicy,
  MovementView,
  WalletView,
} from "@/lib/types";
import {
  clearRememberedOwnerIds,
  loadRememberedOwnerIds,
  rememberOwnerId,
} from "@/lib/owner-memory";

type Tab =
  | "door"
  | "brain"
  | "wallets"
  | "movements"
  | "failed"
  | "ledger-wallets";

export default function DbRecordsPage() {
  const [tab, setTab] = useState<Tab>("door");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedAt, setLoadedAt] = useState<string | null>(null);

  const [door, setDoor] = useState<IngestPolicy | null>(null);
  const [brain, setBrain] = useState<DigestionRule[]>([]);
  const [failed, setFailed] = useState<FailedIngest[]>([]);
  const [ledgerWallets, setLedgerWallets] = useState<unknown[]>([]);
  const [ownerInput, setOwnerInput] = useState("");
  const [ownerIds, setOwnerIds] = useState<string[]>([]);
  const [walletByOwner, setWalletByOwner] = useState<Record<string, WalletView | null>>({});
  const [movementsByOwner, setMovementsByOwner] = useState<Record<string, MovementView[]>>({});
  const [rawDump, setRawDump] = useState<unknown>(null);

  useEffect(() => {
    const ids = loadRememberedOwnerIds();
    setOwnerIds(ids);
    if (ids[0]) setOwnerInput(ids[0]);
  }, []);

  const refreshConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [d, b, f, lw] = await Promise.all([
        engine.ingestPolicyGet().catch((e) => {
          throw e;
        }),
        engine.digestionRules(),
        engine.failedList({ page: 1, size: 100 }).catch(() => ({ data: [] as FailedIngest[] })),
        engine.ledgerWalletsList(1, 100).catch(() => ({ data: [] as unknown[] })),
      ]);
      setDoor((d.data as IngestPolicy) ?? null);
      const br = b.data;
      setBrain(Array.isArray(br) ? br : br ? [br] : []);
      setFailed(Array.isArray(f.data) ? f.data : []);
      setLedgerWallets(Array.isArray(lw.data) ? lw.data : []);
      setLoadedAt(new Date().toISOString());
      setRawDump({
        door: d.data,
        brain: b.data,
        failedCount: Array.isArray(f.data) ? f.data.length : 0,
        ledgerWalletsCount: Array.isArray(lw.data) ? lw.data.length : 0,
      });
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshOwners = useCallback(async (ids: string[]) => {
    if (!ids.length) {
      setWalletByOwner({});
      setMovementsByOwner({});
      return;
    }
    setLoading(true);
    setError(null);
    const wMap: Record<string, WalletView | null> = {};
    const mMap: Record<string, MovementView[]> = {};
    try {
      await Promise.all(
        ids.map(async (oid) => {
          try {
            const w = await engine.getWallet(oid);
            wMap[oid] = w.data as WalletView;
          } catch {
            wMap[oid] = null;
          }
          try {
            const m = await engine.movements(oid, { page: 1, size: 50 });
            mMap[oid] = Array.isArray(m.data) ? (m.data as MovementView[]) : [];
          } catch {
            mMap[oid] = [];
          }
        }),
      );
      setWalletByOwner(wMap);
      setMovementsByOwner(mMap);
      setLoadedAt(new Date().toISOString());
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshConfig();
  }, [refreshConfig]);

  const addOwner = () => {
    const oid = ownerInput.trim();
    if (!oid) return;
    rememberOwnerId(oid);
    const next = loadRememberedOwnerIds();
    setOwnerIds(next);
    void refreshOwners(next);
  };

  const tabs: { id: Tab; label: string; count?: number }[] = useMemo(
    () => [
      { id: "door", label: "Door (ingest_policies)" },
      { id: "brain", label: "Brain (digestion_rule)", count: brain.length },
      { id: "wallets", label: "Wallets by ownerId", count: ownerIds.length },
      { id: "movements", label: "Movements", count: Object.values(movementsByOwner).reduce((n, a) => n + a.length, 0) },
      { id: "failed", label: "Fail queue", count: failed.length },
      { id: "ledger-wallets", label: "ledger_wallets list", count: ledgerWallets.length },
    ],
    [brain.length, ownerIds.length, movementsByOwner, failed.length, ledgerWallets.length],
  );

  return (
    <div>
      <FlowStrip active="engine" />
      <EngineStatusBanner />
      <PageHeader
        title="DB records"
        description="Reload from engine APIs — shows what is persisted (not local form state)."
        actions={
          <ActionBar loading={loading} error={error}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                void refreshConfig();
                if (ownerIds.length) void refreshOwners(ownerIds);
              }}
            >
              Reload all from DB
            </button>
          </ActionBar>
        }
      />

      <Alert tone="info">
        Door/Brain/Fail/ledger-wallets load automatically. Customer wallets & movements need{" "}
        <strong>ownerId</strong> (add below — also auto-remembered from Simulator when you run).
        {loadedAt ? (
          <span className="mt-1 block font-mono text-[10px] text-slate-500">last load {loadedAt}</span>
        ) : null}
      </Alert>

      <Card className="mb-4 mt-4" title="Track ownerIds">
        <div className="flex flex-wrap gap-2">
          <input
            className="field-input font-mono max-w-xs"
            value={ownerInput}
            onChange={(e) => setOwnerInput(e.target.value)}
            placeholder="01A… ownerId"
          />
          <button type="button" className="btn-primary" onClick={addOwner}>
            Add + fetch wallet
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => void refreshOwners(ownerIds)}
            disabled={!ownerIds.length}
          >
            Refresh wallets/movements
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              clearRememberedOwnerIds();
              setOwnerIds([]);
              setWalletByOwner({});
              setMovementsByOwner({});
            }}
          >
            Clear list
          </button>
        </div>
        {ownerIds.length ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {ownerIds.map((id) => (
              <button
                key={id}
                type="button"
                className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[10px] hover:border-emerald-300"
                onClick={() => setOwnerInput(id)}
              >
                {id}
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-xs text-slate-500">No ownerIds yet — run Simulator or paste one.</p>
        )}
      </Card>

      <div className="mb-3 flex flex-wrap gap-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={
              tab === t.id
                ? "rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white"
                : "rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
            }
          >
            {t.label}
            {t.count != null ? ` (${t.count})` : ""}
          </button>
        ))}
      </div>

      {tab === "door" && (
        <Card
          title="ingest_policies row (GET /ingest-policies)"
          right={
            <Link href="/ingest-policies" className="text-xs text-emerald-700 hover:underline">
              Edit Door →
            </Link>
          }
        >
          {door ? (
            <>
              <dl className="mb-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
                <dt className="text-slate-500">id</dt>
                <dd className="font-mono text-xs sm:col-span-2">{door.id ?? "—"}</dd>
                <dt className="text-slate-500">isEnabled</dt>
                <dd>
                  <Badge tone={door.isEnabled ? "ok" : "warn"}>{String(door.isEnabled)}</Badge>
                </dd>
                <dt className="text-slate-500">auto wallet</dt>
                <dd>{String(door.isAutoCreateWallet)}</dd>
                <dt className="text-slate-500">settlement / ensure</dt>
                <dd className="font-mono text-xs">
                  {door.autoWalletSettlementCurrency} / {door.autoWalletEnsureCurrency}
                </dd>
                <dt className="text-slate-500">updateDt</dt>
                <dd className="font-mono text-[10px]">{door.updateDt ?? "—"}</dd>
              </dl>
              <JsonBlock value={door} maxHeight={320} />
            </>
          ) : (
            <Empty>No policy loaded</Empty>
          )}
        </Card>
      )}

      {tab === "brain" && (
        <Card
          title={`digestion_rule (${brain.length}) — GET /digestion-rules`}
          right={
            <Link href="/digestion-rules" className="text-xs text-emerald-700 hover:underline">
              Edit Brain →
            </Link>
          }
        >
          {brain.length === 0 ? (
            <Empty>No rules in DB</Empty>
          ) : (
            <div className="table-wrap max-h-[480px] overflow-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>id</th>
                    <th>code</th>
                    <th>event</th>
                    <th>op</th>
                    <th>pri</th>
                    <th>ccy</th>
                    <th>mcc</th>
                    <th>formula</th>
                    <th>on</th>
                  </tr>
                </thead>
                <tbody>
                  {brain.map((r) => (
                    <tr key={r.id ?? r.code}>
                      <td className="font-mono text-[10px]">{r.id != null ? shortId(String(r.id), 8) : "—"}</td>
                      <td className="font-mono text-xs font-medium">{r.code}</td>
                      <td>{r.eventType}</td>
                      <td>{r.operation}</td>
                      <td>{r.priority}</td>
                      <td className="font-mono text-[10px]">
                        {r.eligibleCurrencies?.length ? r.eligibleCurrencies.join(",") : "any"}
                      </td>
                      <td className="font-mono text-[10px]">
                        {r.eligibleMccs?.length ? r.eligibleMccs.join(",") : "any"}
                      </td>
                      <td className="max-w-[140px] truncate font-mono text-[10px]" title={JSON.stringify(r.formula)}>
                        {typeof r.formula === "object" && r.formula && "type" in r.formula
                          ? String((r.formula as { type: string }).type)
                          : JSON.stringify(r.formula)}
                      </td>
                      <td>
                        <Badge tone={r.isEnabled ? "ok" : "neutral"}>{r.isEnabled ? "on" : "off"}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {brain[0] ? (
            <details className="mt-3">
              <summary className="cursor-pointer text-xs text-slate-500">Full JSON (all rules)</summary>
              <div className="mt-2">
                <JsonBlock value={brain} maxHeight={280} />
              </div>
            </details>
          ) : null}
        </Card>
      )}

      {tab === "wallets" && (
        <div className="space-y-4">
          {ownerIds.length === 0 ? (
            <Empty>Add ownerId above</Empty>
          ) : (
            ownerIds.map((oid) => {
              const w = walletByOwner[oid];
              return (
                <Card
                  key={oid}
                  title={`Wallet · ${oid}`}
                  description="GET /wallets/{ownerId}"
                  right={
                    <Link
                      href={`/review?ownerId=${encodeURIComponent(oid)}`}
                      className="text-xs text-emerald-700 hover:underline"
                    >
                      Review →
                    </Link>
                  }
                >
                  {w === undefined ? (
                    <p className="text-xs text-slate-500">Click Refresh wallets</p>
                  ) : w === null ? (
                    <Alert tone="warn">No wallet in DB for this ownerId</Alert>
                  ) : (
                    <>
                      <dl className="mb-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                        <dt className="text-slate-500">walletId</dt>
                        <dd className="font-mono text-xs">{w.walletId ?? "—"}</dd>
                        <dt className="text-slate-500">status</dt>
                        <dd>{w.status}</dd>
                        <dt className="text-slate-500">settlement</dt>
                        <dd>{w.settlementCurrency}</dd>
                        <dt className="text-slate-500">COA profile</dt>
                        <dd className="font-mono text-xs">{w.coaProfileCode || "DEFAULT"}</dd>
                        <dt className="text-slate-500">vanity</dt>
                        <dd className="font-mono text-xs">{w.vanityCode || "—"}</dd>
                      </dl>
                      <div className="table-wrap mb-2">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>ccy</th>
                              <th>fullNumber</th>
                              <th>ledger</th>
                              <th>available</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(w.accounts?.length ? w.accounts : w.account ? [w.account] : []).map(
                              (a, i) => (
                                <tr key={a.id ?? i}>
                                  <td>{a.currency}</td>
                                  <td className="font-mono text-[10px]">{a.fullNumber}</td>
                                  <td className="font-mono text-xs">{money(a.ledgerBalance)}</td>
                                  <td className="font-mono text-xs">{money(a.availableBalance)}</td>
                                </tr>
                              ),
                            )}
                          </tbody>
                        </table>
                      </div>
                      <details>
                        <summary className="cursor-pointer text-xs text-slate-500">Raw wallet JSON</summary>
                        <div className="mt-2">
                          <JsonBlock value={w} maxHeight={240} />
                        </div>
                      </details>
                    </>
                  )}
                </Card>
              );
            })
          )}
        </div>
      )}

      {tab === "movements" && (
        <div className="space-y-4">
          {ownerIds.length === 0 ? (
            <Empty>Add ownerId</Empty>
          ) : (
            ownerIds.map((oid) => {
              const rows = movementsByOwner[oid] || [];
              return (
                <Card key={oid} title={`Movements · ${oid}`} description="GET /wallets/{ownerId}/movements">
                  {rows.length === 0 ? (
                    <Empty>No movements (or not refreshed)</Empty>
                  ) : (
                    <div className="table-wrap max-h-72 overflow-auto">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>id</th>
                            <th>key</th>
                            <th>type</th>
                            <th>amt</th>
                            <th>ccy</th>
                            <th>status</th>
                            <th>createDt</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((m) => (
                            <tr key={m.id}>
                              <td className="font-mono text-[10px]">{m.id}</td>
                              <td className="max-w-[120px] truncate font-mono text-[10px]" title={m.movementKey}>
                                {m.movementKey}
                              </td>
                              <td>{m.orderType || m.type}</td>
                              <td className="font-mono text-xs">{money(m.amount)}</td>
                              <td>{m.currency}</td>
                              <td>
                                <Badge tone="ok">{m.status || "—"}</Badge>
                              </td>
                              <td className="font-mono text-[10px]">{m.createDt}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </div>
      )}

      {tab === "failed" && (
        <Card title="failed_transaction_ingest" description="GET /integrations/failed-transactions">
          {failed.length === 0 ? (
            <Empty>Empty fail queue</Empty>
          ) : (
            <div className="table-wrap max-h-[480px] overflow-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>id</th>
                    <th>owner</th>
                    <th>event</th>
                    <th>code</th>
                    <th>status</th>
                    <th>reason</th>
                  </tr>
                </thead>
                <tbody>
                  {failed.map((f) => (
                    <tr key={f.id}>
                      <td className="font-mono text-[10px]">{f.id}</td>
                      <td className="font-mono text-[10px]">{f.ownerId}</td>
                      <td>{f.eventType}</td>
                      <td className="font-mono text-[10px]">{f.failureCode}</td>
                      <td>{f.status}</td>
                      <td className="max-w-[200px] truncate text-[10px]" title={f.reason}>
                        {f.reason}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {tab === "ledger-wallets" && (
        <Card title="GET /ledger-wallets (internal list)" description="All wallet rows if engine exposes list">
          {ledgerWallets.length === 0 ? (
            <Empty>Empty or API unavailable</Empty>
          ) : (
            <JsonBlock value={ledgerWallets} maxHeight={420} />
          )}
        </Card>
      )}

      <Card className="mt-4" title="Last config raw dump">
        {rawDump ? <JsonBlock value={rawDump} maxHeight={200} /> : <Empty>—</Empty>}
      </Card>
    </div>
  );
}
