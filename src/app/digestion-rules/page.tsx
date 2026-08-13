"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader, Card, Badge, Empty, JsonBlock } from "@/components/ui/kit";
import { ActionBar } from "@/components/ui/action";
import { FieldLabel, ExplainBox } from "@/components/ui/help";
import { FlowStrip } from "@/components/layout/flow-strip";
import { engine } from "@/lib/engine";
import { errMsg } from "@/lib/format";
import type { DigestionRule } from "@/lib/types";
import { EngineStatusBanner } from "@/components/layout/engine-status-banner";

type FormulaType = "AMOUNT" | "RATE" | "FIXED" | "LINEAR";

function buildFormula(type: FormulaType, rate: string, fixed: string, value: string): Record<string, unknown> {
  switch (type) {
    case "AMOUNT":
      return { type: "AMOUNT" };
    case "RATE":
      return { type: "RATE", rate: Number(rate) };
    case "FIXED":
      return { type: "FIXED", value: Number(value) };
    case "LINEAR":
      return { type: "LINEAR", rate: Number(rate), fixed: Number(fixed) };
  }
}

function formulaLabel(f: unknown): string {
  if (!f || typeof f !== "object") return String(f ?? "—");
  const o = f as Record<string, unknown>;
  const t = String(o.type ?? "").toUpperCase();
  if (t === "AMOUNT") return "AMOUNT (= spend)";
  if (t === "RATE") return `RATE × ${o.rate}`;
  if (t === "FIXED") return `FIXED ${o.value ?? o.fixed}`;
  if (t === "LINEAR") return `LINEAR ${o.rate}×amt + ${o.fixed}`;
  return JSON.stringify(f);
}

export default function DigestionRulesPage() {
  const [rows, setRows] = useState<DigestionRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    code: "PURCHASE_DEFAULT",
    name: "Default purchase earn",
    eventType: "PURCHASE",
    operation: "EARN",
    pointCurrency: "LP",
    priority: "10",
    minAmount: "0.01",
    eligibleCurrencies: "HKD,USD",
    eligibleMccs: "",
  });
  const [formulaType, setFormulaType] = useState<FormulaType>("RATE");
  const [rate, setRate] = useState("0.01");
  const [fixed, setFixed] = useState("0");
  const [value, setValue] = useState("1000");
  const [created, setCreated] = useState<unknown>(null);

  const formulaPreview = useMemo(
    () => buildFormula(formulaType, rate, fixed, value),
    [formulaType, rate, fixed, value],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await engine.digestionRules();
      const d = r.data;
      setRows(Array.isArray(d) ? d : d ? [d] : []);
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
        formula: formulaPreview,
        pointCurrency: form.pointCurrency,
        priority: Number(form.priority),
        minAmount: Number(form.minAmount),
        eligibleCurrencies: form.eligibleCurrencies
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        eligibleMccs: form.eligibleMccs
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
      <EngineStatusBanner />
      <PageHeader
        title="1 · Brain — Digestion rules"
        description="JSON formula config (not string DSL). Runtime DB · /digestion-rules"
      />

      <div className="mb-4 grid gap-3 lg:grid-cols-3">
        <ExplainBox title="Formula = JSON object" tone="ops">
          <p className="font-mono text-[11px] leading-relaxed">
            {`{"type":"RATE","rate":0.01}`}
            <br />
            {`{"type":"FIXED","value":1000}`}
            <br />
            {`{"type":"LINEAR","rate":0.01,"fixed":50}`}
            <br />
            {`{"type":"AMOUNT"}`}
          </p>
        </ExplainBox>
        <ExplainBox title="Brain = eligibility + formula" tone="ops">
          <p className="text-[12px] leading-relaxed">
            Filters first: eventType · minAmount · currencies · <strong>MCCs</strong> · maxAgeDays.
            Then formula JSON. MCC from webhook <code className="text-[10px]">metadata.mcc</code>.
            Door does not run these checks.
          </p>
        </ExplainBox>
        <ExplainBox title="What Brain does">
          <p>
            Match <code className="text-xs">eventType</code> + filters → compute points from
            formula → Books EARN/BURN to <code className="text-xs">pointCurrency</code> (LP).
          </p>
        </ExplainBox>
        <ExplainBox title="Credit-card patterns" tone="info">
          <p>
            1% spend → RATE · open bonus → FIXED · redeem → AMOUNT. See engine{" "}
            <code className="text-xs">docs/CREDIT_CARD_CLIENT_SCENARIOS.md</code>.
          </p>
        </ExplainBox>
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-5">
        <Card title="Create rule" className="lg:col-span-2" description="Pick formula type — no cryptic strings">
          <div className="grid gap-2.5">
            {(
              [
                ["code", "code"],
                ["name", "name"],
                ["eventType", "eventType"],
                ["operation", "operation"],
                ["pointCurrency", "pointCurrency"],
                ["priority", "priority"],
                ["minAmount", "minAmount"],
                ["eligibleCurrencies", "eligibleCurrencies (csv)"],
                ["eligibleMccs", "eligibleMccs (csv, blank=any)"],
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

            <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-3">
              <FieldLabel
                tipTitle="formula (JSON)"
                tip="Stored as JSONB. RATE = % of spend. FIXED = flat bonus. LINEAR = rate*amount+fixed. AMOUNT = 1:1 with spend (or burn)."
              >
                Formula type
              </FieldLabel>
              <select
                className="field-select mt-1"
                value={formulaType}
                onChange={(e) => setFormulaType(e.target.value as FormulaType)}
              >
                <option value="RATE">RATE — amount × rate (e.g. 1%)</option>
                <option value="FIXED">FIXED — constant points (bonus)</option>
                <option value="LINEAR">LINEAR — amount × rate + fixed</option>
                <option value="AMOUNT">AMOUNT — points = spend amount</option>
              </select>

              {formulaType === "RATE" || formulaType === "LINEAR" ? (
                <label className="field mt-2">
                  <span className="field-label">rate</span>
                  <input
                    className="field-input font-mono"
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    placeholder="0.01"
                  />
                </label>
              ) : null}
              {formulaType === "LINEAR" ? (
                <label className="field mt-2">
                  <span className="field-label">fixed (bonus add)</span>
                  <input
                    className="field-input font-mono"
                    value={fixed}
                    onChange={(e) => setFixed(e.target.value)}
                  />
                </label>
              ) : null}
              {formulaType === "FIXED" ? (
                <label className="field mt-2">
                  <span className="field-label">value (points)</span>
                  <input
                    className="field-input font-mono"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                  />
                </label>
              ) : null}

              <div className="mt-2 text-[11px] text-slate-500">Preview payload</div>
              <pre className="mt-1 overflow-auto rounded-lg bg-slate-900 p-2 font-mono text-[11px] text-emerald-200">
                {JSON.stringify(formulaPreview, null, 2)}
              </pre>
            </div>

            <ActionBar loading={loading} error={error}>
              <button type="button" className="btn-primary" onClick={create}>
                Create
              </button>
              <button type="button" className="btn-secondary" onClick={load}>
                Refresh
              </button>
            </ActionBar>
            {created ? (
              <>
                <p className="mb-1 text-[11px] font-semibold text-emerald-800">Created row (DB response)</p>
                <JsonBlock value={created} maxHeight={160} />
              </>
            ) : null}
          </div>
        </Card>

        <Card
          title={`Saved in DB · digestion_rule (${rows.length})`}
          description="GET /digestion-rules — reload after create"
          className="lg:col-span-3"
          right={
            <Link href="/records" className="text-xs text-emerald-700 hover:underline">
              DB records →
            </Link>
          }
        >
          {rows.length === 0 ? (
            <Empty>No rules — create PURCHASE RATE 0.01 to earn</Empty>
          ) : (
            <div className="table-wrap max-h-[560px] overflow-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>code</th>
                    <th>event</th>
                    <th>op</th>
                    <th>mcc</th>
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
                      <td className="font-mono text-[10px] text-slate-500">
                        {r.eligibleMccs?.length ? r.eligibleMccs.join(",") : "—"}
                      </td>
                      <td className="font-mono text-[11px]" title={JSON.stringify(r.formula)}>
                        {formulaLabel(r.formula)}
                      </td>
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
          <p className="mt-2 text-[11px] text-slate-500">
            Hover formula cell for full JSON. After create,{" "}
            <Link href="/simulator" className="underline">
              shoot webhooks
            </Link>
            .
          </p>
        </Card>
      </div>
    </div>
  );
}
