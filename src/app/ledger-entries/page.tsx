"use client";

import { useState } from "react";
import { Card, Badge, Empty } from "@/components/ui/kit";
import { engine } from "@/lib/engine";
import { errMsg, money } from "@/lib/format";
import type { LedgerLeg } from "@/lib/types";
import { PageShell } from "@/components/layout/page-shell";
import { FilterBar } from "@/components/ui/filter-bar";

export default function LegsPage() {
  const [eventId, setEventId] = useState("");
  const [movementId, setMovementId] = useState("");
  const [rows, setRows] = useState<LedgerLeg[]>([]);
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
    <PageShell
      flow="ledger"
      title="Double-entry"
      description="GET /integrations/ledger-entries?eventId= | movementId="
      api={[{ method: "GET", path: "/integrations/ledger-entries" }]}
    >
      <FilterBar loading={loading} error={error} onSubmit={() => void load()}>
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
      </FilterBar>
      <Card title={`Legs (${rows.length})`}>
        {rows.length === 0 ? (
          <Empty>No legs</Empty>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>entryId</th>
                  <th>fullNumber</th>
                  <th>dir</th>
                  <th>amount</th>
                  <th>ccy</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e, i) => (
                  <tr key={e.entryId ?? i}>
                    <td className="font-mono text-[10px]">{e.entryId}</td>
                    <td className="font-mono text-[10px]">{e.fullNumber || "—"}</td>
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
    </PageShell>
  );
}
