"use client";

import { useState } from "react";
import { PageHeader, Card, Badge, Empty } from "@/components/ui/kit";
import { ActionBar } from "@/components/ui/action";
import { engine } from "@/lib/engine";
import { errMsg, money } from "@/lib/format";
import type { LedgerEntry } from "@/lib/types";

export default function LegsPage() {
  const [eventId, setEventId] = useState("");
  const [movementId, setMovementId] = useState("");
  const [rows, setRows] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await engine.legs({
        eventId: eventId.trim() || undefined,
        movementId: movementId.trim() || undefined,
      });
      setRows(Array.isArray(r.data) ? r.data : []);
    } catch (e) {
      setError(errMsg(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Ledger legs"
        description="GET /integrations/ledger-entries?eventId= | movementId="
      />
      <Card className="mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="field min-w-[200px]">
            <span className="field-label">eventId</span>
            <input
              className="field-input font-mono"
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
            />
          </label>
          <label className="field min-w-[160px]">
            <span className="field-label">movementId</span>
            <input
              className="field-input font-mono"
              value={movementId}
              onChange={(e) => setMovementId(e.target.value)}
            />
          </label>
          <ActionBar loading={loading} error={error}>
            <button type="button" className="btn-primary" onClick={load}>
              Query
            </button>
          </ActionBar>
        </div>
      </Card>
      <Card title={`Legs (${rows.length})`}>
        {rows.length === 0 ? (
          <Empty>No legs</Empty>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>id</th>
                  <th>txn</th>
                  <th>dir</th>
                  <th>amount</th>
                  <th>ccy</th>
                  <th>target</th>
                  <th>affects L/A</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => (
                  <tr key={e.id}>
                    <td className="font-mono text-[10px]">{e.id}</td>
                    <td className="font-mono text-[10px]">{e.txnId}</td>
                    <td>
                      <Badge tone={e.direction === "CREDIT" ? "ok" : "warn"}>
                        {e.direction}
                      </Badge>
                    </td>
                    <td className="font-mono text-xs">{money(e.amount)}</td>
                    <td>{e.currency}</td>
                    <td className="font-mono text-[10px]">{e.targetId}</td>
                    <td className="text-xs">
                      {String(e.affectsLedger)} / {String(e.affectsAvailable)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
