"use client";

import { useCallback, useEffect, useState } from "react";
import { ledger, ApiError } from "@/lib/api";
import { asArray } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { JsonBlock } from "@/components/ui/json-block";
import { Alert } from "@/components/ui/alert";

type FailRow = Record<string, unknown>;

export default function FailedTransactionsPage() {
  const [status, setStatus] = useState("OPEN");
  const [cust, setCust] = useState("");
  const [eventId, setEventId] = useState("");
  const [rows, setRows] = useState<FailRow[]>([]);
  const [raw, setRaw] = useState<unknown>(null);
  const [lastAction, setLastAction] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ page: "1", size: "50" });
      if (status.trim()) qs.set("status", status.trim());
      if (cust.trim()) qs.set("ownerId", cust.trim());
      if (eventId.trim()) qs.set("eventId", eventId.trim());
      const data = await ledger.get(`/integrations/failed-transactions?${qs}`);
      setRaw(data);
      setRows(asArray<FailRow>(data));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [status, cust, eventId]);

  useEffect(() => {
    void load();
  }, []);

  async function replay(id: unknown) {
    if (id == null) return;
    setLoading(true);
    setError(null);
    try {
      const res = await ledger.post(`/integrations/failed-transactions/${id}/replay`);
      setLastAction(res);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function review(id: unknown) {
    if (id == null) return;
    setLoading(true);
    setError(null);
    try {
      const res = await ledger.post(`/integrations/failed-transactions/${id}/review`);
      setLastAction(res);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Failed ingest"
        description="Ops queue after SKIPPED webhooks — review / replay (no second fail row on still-skip)."
      />

      <Card className="mb-4">
        <CardBody className="flex flex-wrap items-end gap-3">
          <Field label="status">
            <Input value={status} onChange={(e) => setStatus(e.target.value)} placeholder="OPEN" />
          </Field>
          <Field label="ownerId">
            <Input value={cust} onChange={(e) => setCust(e.target.value)} className="font-mono" />
          </Field>
          <Field label="eventId">
            <Input value={eventId} onChange={(e) => setEventId(e.target.value)} className="font-mono" />
          </Field>
          <Button onClick={() => void load()} disabled={loading}>
            {loading ? "…" : "Refresh"}
          </Button>
        </CardBody>
      </Card>

      {error ? (
        <div className="mb-4">
          <Alert variant="error">{error}</Alert>
        </div>
      ) : null}

      <Card className="mb-4">
        <CardHeader title={`Rows (${rows.length})`} />
        <CardBody className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="border-b text-zinc-500">
              <tr>
                <th className="py-2 pr-2">id</th>
                <th className="py-2 pr-2">eventId</th>
                <th className="py-2 pr-2">cust</th>
                <th className="py-2 pr-2">code</th>
                <th className="py-2 pr-2">status</th>
                <th className="py-2 pr-2">reason</th>
                <th className="py-2">actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={String(r.id)} className="border-b border-zinc-100 align-top">
                  <td className="py-2 pr-2 font-mono">{String(r.id)}</td>
                  <td className="py-2 pr-2 font-mono">{String(r.eventId ?? "—")}</td>
                  <td className="py-2 pr-2 font-mono">{String(r.ownerId ?? "—")}</td>
                  <td className="py-2 pr-2">{String(r.failureCode ?? "—")}</td>
                  <td className="py-2 pr-2">{String(r.status ?? "—")}</td>
                  <td className="max-w-[220px] truncate py-2 pr-2" title={String(r.reason ?? "")}>
                    {String(r.reason ?? "—")}
                  </td>
                  <td className="py-2">
                    <div className="flex gap-1">
                      <Button variant="secondary" onClick={() => void review(r.id)}>
                        Review
                      </Button>
                      <Button onClick={() => void replay(r.id)}>Replay</Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!rows.length ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-zinc-400">
                    No rows
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </CardBody>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="List raw" />
          <CardBody>
            <JsonBlock value={raw} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Last action" />
          <CardBody>
            <JsonBlock value={lastAction ?? { hint: "Replay / review result appears here" }} />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
