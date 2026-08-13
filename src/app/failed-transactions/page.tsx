"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader, Card, Badge, Empty, JsonBlock } from "@/components/ui/kit";
import { ActionBar } from "@/components/ui/action";
import { engine } from "@/lib/engine";
import { errMsg, money } from "@/lib/format";
import type { FailedIngest } from "@/lib/types";

export default function FailedPage() {
  const [status, setStatus] = useState("OPEN");
  const [ownerId, setOwnerId] = useState("");
  const [rows, setRows] = useState<FailedIngest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<FailedIngest | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await engine.failedList({
        status: status || undefined,
        ownerId: ownerId.trim() || undefined,
        size: 100,
      });
      setRows(Array.isArray(r.data) ? r.data : []);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [status, ownerId]);

  useEffect(() => {
    load();
  }, [load]);

  const review = async (id: number) => {
    setActionMsg(null);
    try {
      await engine.failedReview(id);
      setActionMsg(`Reviewed #${id}`);
      await load();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const replay = async (id: number) => {
    setActionMsg(null);
    try {
      const r = await engine.failedReplay(id);
      setActionMsg(`Replay #${id}: ${JSON.stringify(r.data).slice(0, 200)}`);
      await load();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  return (
    <div>
      <PageHeader
        title="Failed ingest"
        description="GET/POST /integrations/failed-transactions — review ack or replay pipeline."
      />

      <Card className="mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="field">
            <span className="field-label">status</span>
            <select
              className="field-select"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {["", "OPEN", "REVIEWED", "REPLAYED"].map((s) => (
                <option key={s || "all"} value={s}>
                  {s || "ALL"}
                </option>
              ))}
            </select>
          </label>
          <label className="field min-w-[180px]">
            <span className="field-label">ownerId</span>
            <input
              className="field-input font-mono"
              value={ownerId}
              onChange={(e) => setOwnerId(e.target.value)}
              placeholder="optional"
            />
          </label>
          <ActionBar loading={loading} error={error} ok={actionMsg}>
            <button type="button" className="btn-primary" onClick={load}>
              Refresh
            </button>
          </ActionBar>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card title={`Rows (${rows.length})`} className="lg:col-span-3">
          {rows.length === 0 ? (
            <Empty>No failed rows</Empty>
          ) : (
            <div className="table-wrap max-h-[520px] overflow-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>id</th>
                    <th>owner</th>
                    <th>code</th>
                    <th>amt</th>
                    <th>status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td className="font-mono text-[10px]">{r.id}</td>
                      <td className="font-mono text-xs">{r.ownerId}</td>
                      <td className="font-mono text-xs">{r.failureCode}</td>
                      <td className="font-mono text-xs">
                        {money(r.amount)} {r.currency}
                      </td>
                      <td>
                        <Badge tone={r.status === "OPEN" ? "warn" : "neutral"}>
                          {r.status}
                        </Badge>
                      </td>
                      <td className="space-x-1 whitespace-nowrap">
                        <button
                          type="button"
                          className="btn-ghost text-xs"
                          onClick={() => setSelected(r)}
                        >
                          View
                        </button>
                        {r.id != null ? (
                          <>
                            <button
                              type="button"
                              className="btn-secondary text-xs"
                              onClick={() => review(r.id!)}
                            >
                              Review
                            </button>
                            <button
                              type="button"
                              className="btn-primary text-xs"
                              onClick={() => replay(r.id!)}
                            >
                              Replay
                            </button>
                          </>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        <Card title="Detail" className="lg:col-span-2">
          {selected ? (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">{selected.reason}</p>
              <JsonBlock value={selected} maxHeight={420} />
            </div>
          ) : (
            <Empty>Select a row</Empty>
          )}
        </Card>
      </div>
    </div>
  );
}
