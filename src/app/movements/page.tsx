"use client";

import { useState } from "react";
import { PageHeader, Card, JsonBlock } from "@/components/ui/kit";
import { ActionBar } from "@/components/ui/action";
import { EngineStatusBanner } from "@/components/layout/engine-status-banner";
import { FlowStrip } from "@/components/layout/flow-strip";
import { engine } from "@/lib/engine";
import { errMsg } from "@/lib/format";

/**
 * GET /movements?walletId= required (backend MovementEndpoint.list).
 * Prefer wallet history: GET /wallets/{ownerId}/movements
 */
export default function MovementsPage() {
  const [walletId, setWalletId] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadByWalletId = async () => {
    setLoading(true);
    setError(null);
    try {
      const id = walletId.trim();
      if (!id) throw new Error("walletId required for GET /movements");
      const r = await engine.movementsListByWalletId(id);
      setData(r.data);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  const loadByOwner = async () => {
    setLoading(true);
    setError(null);
    try {
      const oid = ownerId.trim();
      if (!oid) throw new Error("ownerId required");
      const r = await engine.movements(oid);
      setData(r.data);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <FlowStrip active="engine" />
      <EngineStatusBanner />
      <PageHeader
        title="4 · Audit — Movements"
        description="Prefer GET /wallets/{ownerId}/movements. GET /movements requires walletId query."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="By ownerId (recommended)">
          <label className="field">
            <span className="field-label">ownerId</span>
            <input
              className="field-input font-mono"
              value={ownerId}
              onChange={(e) => setOwnerId(e.target.value)}
              placeholder="01A…"
            />
          </label>
          <div className="mt-3">
            <ActionBar loading={loading} error={error}>
              <button type="button" className="btn-primary" onClick={loadByOwner}>
                Load history
              </button>
            </ActionBar>
          </div>
        </Card>
        <Card title="By walletId (GET /movements)">
          <label className="field">
            <span className="field-label">walletId</span>
            <input
              className="field-input font-mono"
              value={walletId}
              onChange={(e) => setWalletId(e.target.value)}
              placeholder="snowflake id"
            />
          </label>
          <div className="mt-3">
            <ActionBar loading={loading} error={error}>
              <button type="button" className="btn-secondary" onClick={loadByWalletId}>
                Load /movements
              </button>
            </ActionBar>
          </div>
        </Card>
      </div>
      <div className="mt-4">
        <Card title="Data">{data ? <JsonBlock value={data} maxHeight={480} /> : null}</Card>
      </div>
    </div>
  );
}
