"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader, Card, Badge, Empty, JsonBlock } from "@/components/ui/kit";
import { ActionBar } from "@/components/ui/action";
import { FieldLabel, ExplainBox } from "@/components/ui/help";
import { FlowStrip } from "@/components/layout/flow-strip";
import { FactorJsonEditor } from "@/components/factors/factor-json-editor";
import { engine } from "@/lib/engine";
import { BRAIN_FACTOR_PRESETS, parseFactorJson } from "@/lib/factors";
import { errMsg } from "@/lib/format";
import type { CreateDigestionRuleBody, DigestionRule } from "@/lib/types";
import { EngineStatusBanner } from "@/components/layout/engine-status-banner";

type FormulaType = "AMOUNT" | "RATE" | "FIXED" | "LINEAR" | "TIERED_RATE" | "TABLE";

function buildFormula(
  type: FormulaType,
  rate: string,
  fixed: string,
  value: string,
  extras: { multiplier: string; cap: string; floor: string; tierJson: string; tableJson: string },
): Record<string, unknown> {
  let base: Record<string, unknown>;
  switch (type) {
    case "AMOUNT":
      base = { type: "AMOUNT" };
      break;
    case "RATE":
      base = { type: "RATE", rate: Number(rate) };
      break;
    case "FIXED":
      base = { type: "FIXED", value: Number(value) };
      break;
    case "LINEAR":
      base = { type: "LINEAR", rate: Number(rate), fixed: Number(fixed) };
      break;
    case "TIERED_RATE": {
      let brackets: unknown = [
        { upTo: 5000, rate: 0.01 },
        { upTo: null, rate: 0.02 },
      ];
      if (extras.tierJson.trim()) brackets = JSON.parse(extras.tierJson);
      base = { type: "TIERED_RATE", brackets };
      break;
    }
    case "TABLE": {
      let table: Record<string, unknown> = {
        by: "tier",
        map: {
          GOLD: { type: "RATE", rate: 0.02 },
          DEFAULT: { type: "RATE", rate: 0.01 },
        },
      };
      if (extras.tableJson.trim()) table = JSON.parse(extras.tableJson) as Record<string, unknown>;
      base = { type: "TABLE", ...table };
      break;
    }
  }
  if (extras.multiplier.trim()) base.multiplier = Number(extras.multiplier);
  if (extras.cap.trim()) base.cap = Number(extras.cap);
  if (extras.floor.trim()) base.floor = Number(extras.floor);
  return base;
}

function formulaLabel(f: unknown): string {
  if (!f || typeof f !== "object") return String(f ?? "—");
  const o = f as Record<string, unknown>;
  const t = String(o.type ?? "").toUpperCase();
  const extras: string[] = [];
  if (o.multiplier != null) extras.push(`×${o.multiplier}`);
  if (o.cap != null) extras.push(`cap ${o.cap}`);
  if (o.floor != null) extras.push(`floor ${o.floor}`);
  const suf = extras.length ? ` (${extras.join(", ")})` : "";
  if (t === "AMOUNT") return `AMOUNT${suf}`;
  if (t === "RATE") return `RATE × ${o.rate}${suf}`;
  if (t === "FIXED") return `FIXED ${o.value ?? o.fixed}${suf}`;
  if (t === "LINEAR") return `LINEAR ${o.rate}× + ${o.fixed}${suf}`;
  if (t === "TIERED_RATE") return `TIERED_RATE${suf}`;
  if (t === "TABLE") return `TABLE by ${o.by}${suf}`;
  return JSON.stringify(f);
}

function whenLabel(w: unknown): string {
  if (w == null) return "—";
  if (Array.isArray(w)) return w.length ? `AND[${w.length}]` : "—";
  if (typeof w === "object" && w && "match" in w) {
    const m = String((w as { match?: string }).match ?? "all");
    return m;
  }
  return "set";
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
    whenFactors: "[]",
    multiplier: "",
    cap: "",
    floor: "",
    tierJson: '[\n  { "upTo": 5000, "rate": 0.01 },\n  { "upTo": null, "rate": 0.02 }\n]',
    tableJson:
      '{\n  "by": "tier",\n  "map": {\n    "GOLD": { "type": "RATE", "rate": 0.02 },\n    "DEFAULT": { "type": "RATE", "rate": 0.01 }\n  }\n}',
  });
  const [formulaType, setFormulaType] = useState<FormulaType>("RATE");
  const [rate, setRate] = useState("0.01");
  const [fixed, setFixed] = useState("0");
  const [value, setValue] = useState("1000");
  const [created, setCreated] = useState<unknown>(null);

  const formulaPreview = useMemo(() => {
    try {
      return buildFormula(formulaType, rate, fixed, value, {
        multiplier: form.multiplier,
        cap: form.cap,
        floor: form.floor,
        tierJson: form.tierJson,
        tableJson: form.tableJson,
      });
    } catch {
      return { type: "RATE", rate: 0.01, _error: "invalid tier/table JSON" };
    }
  }, [
    formulaType,
    rate,
    fixed,
    value,
    form.multiplier,
    form.cap,
    form.floor,
    form.tierJson,
    form.tableJson,
  ]);

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
      let whenFactors: CreateDigestionRuleBody["whenFactors"];
      try {
        const parsed = parseFactorJson(form.whenFactors);
        whenFactors =
          Array.isArray(parsed) && parsed.length === 0
            ? undefined
            : (parsed as CreateDigestionRuleBody["whenFactors"]);
      } catch (pe) {
        setError(errMsg(pe));
        setLoading(false);
        return;
      }
      if ((formulaPreview as { _error?: string })._error) {
        setError("Invalid TIERED/TABLE JSON");
        setLoading(false);
        return;
      }
      const formula = { ...formulaPreview };
      delete (formula as { _error?: string })._error;
      const r = await engine.digestionCreate({
        code: form.code.trim(),
        name: form.name.trim(),
        eventType: form.eventType.trim(),
        operation: form.operation,
        formula,
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
        whenFactors: whenFactors as never,
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
        description="whenFactors (FactorSet) + formula (RATE / TIERED / TABLE + cap). · /digestion-rules"
        api={[
          { method: "GET", path: "/digestion-rules" },
          { method: "POST", path: "/digestion-rules" },
          { method: "PUT", path: "/digestion-rules/{id}" },
        ]}
      />

      <div className="mb-4 grid gap-3 lg:grid-cols-3">
        <ExplainBox title="Formula types" tone="ops">
          <p className="text-[12px] leading-relaxed">
            RATE · FIXED · LINEAR · AMOUNT · <strong>TIERED_RATE</strong> ·{" "}
            <strong>TABLE</strong>. Optional cap / floor / multiplier.
          </p>
        </ExplainBox>
        <ExplainBox title="whenFactors" tone="ops">
          <p className="text-[12px] leading-relaxed">
            FactorSet: any · atLeast · exactly · not · oneOf · anyGroup. Legacy columns still AND.
          </p>
        </ExplainBox>
        <ExplainBox title="Explain" tone="info">
          <p className="text-[12px] leading-relaxed">
            Webhook dry-run returns <code className="text-xs">matchedPath</code> on
            eligibilityTrace.
          </p>
        </ExplainBox>
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-5">
        <Card
          title="Create rule"
          className="lg:col-span-2"
          description="FactorSet presets + equation builder"
        >
          <div className="grid gap-2.5">
            {(
              [
                ["code", "code"],
                ["name", "name"],
                ["eventType", "eventType"],
                ["operation", "operation"],
                ["pointCurrency", "pointCurrency"],
                ["priority", "priority"],
                ["minAmount", "minAmount (legacy)"],
                ["eligibleCurrencies", "eligibleCurrencies csv"],
                ["eligibleMccs", "eligibleMccs csv"],
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

            <FactorJsonEditor
              label="whenFactors"
              hint="Brain gates — array AND or FactorSet object"
              value={form.whenFactors}
              onChange={(whenFactors) => setForm((f) => ({ ...f, whenFactors }))}
              presets={BRAIN_FACTOR_PRESETS}
              rows={9}
            />

            <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-3">
              <FieldLabel tipTitle="formula" tip="JSONB on digestion_rule.formula">
                Formula type
              </FieldLabel>
              <select
                className="field-select mt-1"
                value={formulaType}
                onChange={(e) => setFormulaType(e.target.value as FormulaType)}
              >
                <option value="RATE">RATE — amount × rate</option>
                <option value="FIXED">FIXED — constant points</option>
                <option value="LINEAR">LINEAR — rate×amt + fixed</option>
                <option value="AMOUNT">AMOUNT — points = amount</option>
                <option value="TIERED_RATE">TIERED_RATE — marginal brackets</option>
                <option value="TABLE">TABLE — by metadata key</option>
              </select>

              {formulaType === "RATE" || formulaType === "LINEAR" ? (
                <label className="field mt-2">
                  <span className="field-label">rate</span>
                  <input
                    className="field-input font-mono"
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                  />
                </label>
              ) : null}
              {formulaType === "LINEAR" ? (
                <label className="field mt-2">
                  <span className="field-label">fixed</span>
                  <input
                    className="field-input font-mono"
                    value={fixed}
                    onChange={(e) => setFixed(e.target.value)}
                  />
                </label>
              ) : null}
              {formulaType === "FIXED" ? (
                <label className="field mt-2">
                  <span className="field-label">value</span>
                  <input
                    className="field-input font-mono"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                  />
                </label>
              ) : null}
              {formulaType === "TIERED_RATE" ? (
                <label className="field mt-2">
                  <span className="field-label">brackets JSON</span>
                  <textarea
                    className="field-input min-h-[100px] font-mono text-xs"
                    value={form.tierJson}
                    onChange={(e) => setForm((f) => ({ ...f, tierJson: e.target.value }))}
                  />
                </label>
              ) : null}
              {formulaType === "TABLE" ? (
                <label className="field mt-2">
                  <span className="field-label">table JSON (by + map)</span>
                  <textarea
                    className="field-input min-h-[120px] font-mono text-xs"
                    value={form.tableJson}
                    onChange={(e) => setForm((f) => ({ ...f, tableJson: e.target.value }))}
                  />
                </label>
              ) : null}

              <div className="mt-2 grid grid-cols-3 gap-2">
                <label className="field">
                  <span className="field-label">multiplier</span>
                  <input
                    className="field-input font-mono text-xs"
                    value={form.multiplier}
                    onChange={(e) => setForm((f) => ({ ...f, multiplier: e.target.value }))}
                    placeholder="2"
                  />
                </label>
                <label className="field">
                  <span className="field-label">cap</span>
                  <input
                    className="field-input font-mono text-xs"
                    value={form.cap}
                    onChange={(e) => setForm((f) => ({ ...f, cap: e.target.value }))}
                    placeholder="50"
                  />
                </label>
                <label className="field">
                  <span className="field-label">floor</span>
                  <input
                    className="field-input font-mono text-xs"
                    value={form.floor}
                    onChange={(e) => setForm((f) => ({ ...f, floor: e.target.value }))}
                    placeholder="1"
                  />
                </label>
              </div>

              <div className="mt-2 text-[11px] text-slate-500">Preview payload</div>
              <pre className="mt-1 overflow-auto rounded-lg bg-slate-900 p-2 font-mono text-[11px] text-emerald-200">
                {JSON.stringify(formulaPreview, null, 2)}
              </pre>
            </div>

            <ActionBar loading={loading} error={error}>
              <button type="button" className="btn-primary" onClick={() => void create()}>
                Create
              </button>
              <button type="button" className="btn-secondary" onClick={() => void load()}>
                Refresh
              </button>
            </ActionBar>
            {created ? (
              <>
                <p className="mb-1 text-[11px] font-semibold text-emerald-800">Created</p>
                <JsonBlock value={created} maxHeight={160} />
              </>
            ) : null}
          </div>
        </Card>

        <Card
          title={`Saved · digestion_rule (${rows.length})`}
          description="GET /digestion-rules"
          className="lg:col-span-3"
          right={
            <Link href="/transactions-ingest" className="text-xs text-emerald-700 hover:underline">
              Dry-run explain →
            </Link>
          }
        >
          {rows.length === 0 ? (
            <Empty>No rules yet</Empty>
          ) : (
            <div className="table-wrap max-h-[640px] overflow-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>code</th>
                    <th>event</th>
                    <th>when</th>
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
                      <td
                        className="font-mono text-[10px] text-slate-600"
                        title={JSON.stringify(r.whenFactors)}
                      >
                        {whenLabel(r.whenFactors)}
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
        </Card>
      </div>
    </div>
  );
}
