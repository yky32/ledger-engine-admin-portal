"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader, Card, Badge, Empty, JsonBlock } from "@/components/ui/kit";
import { ActionBar } from "@/components/ui/action";
import { engine } from "@/lib/engine";
import { errMsg } from "@/lib/format";
import type { DigestionRule } from "@/lib/types";
import { FlowStrip } from "@/components/layout/flow-strip";

export default function DigestionRulesPage() {
  const [rows, setRows] = useState<DigestionRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    code: "PURCHASE_DEFAULT",
    name: "Default purchase earn",
    eventType: "PURCHASE",
    operation: "EARN",
    formula: "RATE:0.01",
    pointCurrency: "LP",
    priority: "100",
    minAmount: "0",
    eligibleCurrencies: "HKD,USD",
  });
  const [created, setCreated] = useState<unknown>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await engine.digestionRules();
      setRows(Array.isArray(r.data) ? r.data : []);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await engine.digestionCreate({
        code: form.code.trim(),
        name: form.name.trim(),
        eventType: form.eventType.trim(),
        operation: form.operation,
        formula: form.formula.trim(),
        pointCurrency: form.pointCurrency,
        priority: Number(form.priority),
        minAmount: Number(form.minAmount),
        eligibleCurrencies: form.eligibleCurrencies
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        isEnabled: true,
      });
      setCreated(r.data);
      await load();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <FlowStrip active="ops" />
      <PageHeader
        title="Digestion rules"
        description="Brain — eventType match + formula. /digestion-rules"
      />
      <div className="mb-4 grid gap-4 lg:grid-cols-5">
        <Card title="Create" className="lg:col-span-2">
          <div className="grid gap-2">
            {(
              [
                ["code", "code"],
                ["name", "name"],
                ["eventType", "eventType"],
                ["operation", "operation"],
                ["formula", "formula"],
                ["pointCurrency", "pointCurrency"],
                ["priority", "priority"],
                ["minAmount", "minAmount"],
                ["eligibleCurrencies", "eligibleCurrencies"],
              ] as const
            ).map(([k, label]) => (
              <label key={k} className="field">
                <span className="field-label">{label}</span>
                <input
                  className="field-input font-mono text-xs"
                  value={form[k]}
                  onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
                />
              </label>
            ))}
            <ActionBar loading={loading} error={error}>
              <button type="button" className="btn-primary" onClick={create}>
                Create
              </button>
              <button type="button" className="btn-secondary" onClick={load}>
                Refresh
              </button>
            </ActionBar>
            {created ? <JsonBlock value={created} maxHeight={160} /> : null}
          </div>
        </Card>
        <Card title={`Rules (${rows.length})`} className="lg:col-span-3">
          {rows.length === 0 ? (
            <Empty>No rules — create PURCHASE_DEFAULT to earn</Empty>
          ) : (
            <div className="table-wrap max-h-[560px] overflow-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>code</th>
                    <th>event</th>
                    <th>op</th>
                    <th>formula</th>
                    <th>on</th>
                    <th>pri</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id ?? r.code}>
                      <td className="font-mono text-xs font-medium">{r.code}</td>
                      <td>{r.eventType}</td>
                      <td>{r.operation}</td>
                      <td className="font-mono text-[11px]">{r.formula}</td>
                      <td>
                        <Badge tone={r.isEnabled ? "ok" : "neutral"}>
                          {r.isEnabled ? "on" : "off"}
                        </Badge>
                      </td>
                      <td>{r.priority}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
