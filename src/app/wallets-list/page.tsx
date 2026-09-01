"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader, Card, Badge, Empty, JsonBlock, ApiPath } from "@/components/ui/kit";
import { ActionBar } from "@/components/ui/action";
import { EngineStatusBanner } from "@/components/layout/engine-status-banner";
import { FlowStrip } from "@/components/layout/flow-strip";
import { engine } from "@/lib/engine";
import { errMsg, shortId } from "@/lib/format";
import { rememberOwnerId } from "@/lib/owner-memory";
import type { WalletView } from "@/lib/types";

export default function WalletsQueryListPage() {
  const [rows, setRows] = useState<WalletView[]>([]);
  const [ownerId, setOwnerId] = useState("");
  const [selected, setSelected] = useState<WalletView | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calledPath, setCalledPath] = useState("/wallets");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const oid = ownerId.trim();
      if (oid) {
        const path = `/wallets/${encodeURIComponent(oid)}`;
        setCalledPath(path);
        const r = await engine.getWallet(oid);
        const w = r.data as WalletView;
        setRows(w ? [w] : []);
        setSelected(w ?? null);
      } else {
        setCalledPath("/wallets");
        const r = await engine.listWallets();
        const list = Array.isArray(r.data) ? r.data : r.data ? [r.data] : [];
        setRows(list);
      }
    } catch (e) {
      setRows([]);
      setSelected(null);
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [ownerId]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSelect = async (row: WalletView) => {
    setSelected(row);
    const oid = row.ownerId;
    if (!oid) return;
    rememberOwnerId(oid);
    try {
      setCalledPath(`/wallets/${encodeURIComponent(oid)}`);
      const r = await engine.getWallet(oid);
      setSelected((r.data as WalletView) ?? row);
    } catch {
      // keep list row
    }
  };

  return (
    <div>
      <FlowStrip active="ops" />
      <EngineStatusBanner />
      <PageHeader
        title="Wallets"
        description="Query list — GET /wallets (all) or GET /wallets/{ownerId}. Click a row to load accounts."
        api={[
          { method: "GET", path: "/wallets" },
          { method: "GET", path: "/wallets/{ownerId}" },
        ]}
        actions={
          <Link href="/wallets" className="btn-secondary text-xs">
            Onboard →
          </Link>
        }
      />

      <Card className="mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="field min-w-[220px]">
            <span className="field-label">ownerId (optional)</span>
            <input
              className="field-input font-mono"
              value={ownerId}
              onChange={(e) => setOwnerId(e.target.value)}
              placeholder="01A47158227"
            />
          </label>
          <ActionBar loading={loading} error={error}>
            <button type="button" className="btn-primary" onClick={() => void load()}>
              Query
            </button>
          </ActionBar>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card
          title={`Wallets (${rows.length})`}
          className="lg:col-span-3"
          right={<ApiPath method="GET" path={calledPath} />}
        >
          {rows.length === 0 ? (
            <Empty>{loading ? "Loading…" : "No wallets"}</Empty>
          ) : (
            <div className="table-wrap max-h-[640px] overflow-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>walletId</th>
                    <th>ownerId</th>
                    <th>settle</th>
                    <th>status</th>
                    <th>vanity</th>
                    <th>name</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr
                      key={r.walletId ?? r.ownerId ?? i}
                      className={
                        selected?.ownerId === r.ownerId ? "cursor-pointer bg-emerald-50" : "cursor-pointer"
                      }
                      onClick={() => void onSelect(r)}
                    >
                      <td className="font-mono text-[10px]">
                        {r.walletId != null ? shortId(String(r.walletId), 8) : "—"}
                      </td>
                      <td className="font-mono text-xs font-medium">{r.ownerId}</td>
                      <td>{r.settlementCurrency || "—"}</td>
                      <td>
                        <Badge tone={r.status === "ACTIVE" ? "ok" : "neutral"}>{r.status || "—"}</Badge>
                      </td>
                      <td className="font-mono text-[10px]">{r.vanityCode || "—"}</td>
                      <td className="max-w-[140px] truncate">{r.name || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card
          title={selected?.ownerId ? `Wallet · ${selected.ownerId}` : "Row JSON"}
          className="lg:col-span-2"
          right={
            selected?.ownerId ? (
              <Link
                href={`/review?ownerId=${encodeURIComponent(selected.ownerId)}`}
                className="text-xs text-emerald-700 hover:underline"
              >
                Review →
              </Link>
            ) : null
          }
        >
          {selected ? <JsonBlock value={selected} maxHeight={480} /> : <Empty>Click a row</Empty>}
        </Card>
      </div>
    </div>
  );
}
