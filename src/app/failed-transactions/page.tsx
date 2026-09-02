"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, Badge, Empty, JsonBlock } from "@/components/ui/kit";
import { engine } from "@/lib/engine";
import { errMsg, money } from "@/lib/format";
import type { FailedIngest } from "@/lib/types";
import { PageShell } from "@/components/layout/page-shell";
import { FilterBar } from "@/components/ui/filter-bar";

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
    <PageShell
      flow="engine"
      title="3 · Fail queue"
      description="GET/POST /integrations/failed-transactions — review ack or replay pipeline."
      api={[
        { method: "GET", path: "/integrations/failed-transactions" },
        { method: "POST", path: "/integrations/failed-transactions/{id}/replay" },
      ]}
    >
      <FilterBar
        loading={loading}
        error={error}
        ok={actionMsg}
        onSubmit={() => void load()}
        submitLabel="Refresh"
      >
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
      </FilterBar>

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
    </PageShell>
  );
}
