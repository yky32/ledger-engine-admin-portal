"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, GripVertical } from "lucide-react";
import { PageHeader, Card, Badge, Empty, JsonBlock } from "@/components/ui/kit";
import { ActionBar } from "@/components/ui/action";
import { FieldLabel } from "@/components/ui/help";
import { FlowStrip } from "@/components/layout/flow-strip";
import { FactorJsonEditor } from "@/components/factors/factor-json-editor";
import { engine } from "@/lib/engine";
import { AndGateGrid, Chip, StepHead } from "@/components/factors/gate-ui";
import {
  BRAIN_FACTOR_PRESETS,
  EMPTY_FACTOR_GATE,
  factorsFromGate,
  gateBits,
  gateIsOpen,
  humanizeWhenFactors,
  numOrNull,
  parseFactorJson,
  type FactorGate,
} from "@/lib/factors";
import { errMsg, clsx } from "@/lib/format";
import type { CreateDigestionRuleBody, DigestionRule } from "@/lib/types";
import { EngineStatusBanner } from "@/components/layout/engine-status-banner";

type FormulaType = "AMOUNT" | "RATE" | "FIXED" | "LINEAR" | "TIERED_RATE" | "TABLE";

const FORMULA_TYPES: { id: FormulaType; label: string; hint: string }[] = [
  { id: "RATE", label: "RATE", hint: "amount × rate" },
  { id: "FIXED", label: "FIXED", hint: "constant points" },
  { id: "LINEAR", label: "LINEAR", hint: "rate×amt + fixed" },
  { id: "AMOUNT", label: "AMOUNT", hint: "points = amount" },
  { id: "TIERED_RATE", label: "TIERED", hint: "marginal brackets" },
  { id: "TABLE", label: "TABLE", hint: "by metadata key" },
];

const EVENT_TYPES = ["CC_TXN_LP", "PURCHASE", "REDEEM", "SIGNUP", "REFUND"];

function moveItem<T>(arr: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= arr.length || to >= arr.length) return arr;
  const next = arr.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function nth(i: number): string {
  const n = i + 1;
  if (n === 1) return "1st";
  if (n === 2) return "2nd";
  if (n === 3) return "3rd";
  return `${n}th`;
}

const PRESETS = {
  demoCc: {
    gate: { mccs: "101", currencies: "HKD", ageLte: "30", amtMin: "1", amtMax: "" } satisfies FactorGate,
    identity: {
      code: "DEMO_CC_1PCT",
      name: "Demo CC 1%",
      eventType: "CC_TXN_LP",
      operation: "EARN",
      pointCurrency: "LP",
      priority: "10",
    },
    formulaType: "RATE" as FormulaType,
    rate: "0.01",
  },
  grocery: {
    gate: {
      mccs: "5411,5412",
      currencies: "HKD,USD",
      ageLte: "30",
      amtMin: "100",
      amtMax: "999999",
    } satisfies FactorGate,
    identity: {
      code: "GROCERY_BAND",
      name: "Grocery band 1%",
      eventType: "PURCHASE",
      operation: "EARN",
      pointCurrency: "LP",
      priority: "20",
    },
    formulaType: "RATE" as FormulaType,
    rate: "0.01",
  },
};

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

function exampleScore(
  formula: Record<string, unknown>,
  amount: number,
  pointCcy: string,
): string | null {
  const type = String(formula.type ?? "").toUpperCase();
  const mul = Number(formula.multiplier ?? 1) || 1;
  const cap = formula.cap != null && formula.cap !== "" ? Number(formula.cap) : null;
  const floor = formula.floor != null && formula.floor !== "" ? Number(formula.floor) : null;
  let pts: number | null = null;
  if (type === "RATE") pts = amount * Number(formula.rate ?? 0);
  else if (type === "FIXED") pts = Number(formula.value ?? 0);
  else if (type === "LINEAR") pts = amount * Number(formula.rate ?? 0) + Number(formula.fixed ?? 0);
  else if (type === "AMOUNT") pts = amount;
  else return null;
  if (!Number.isFinite(pts)) return null;
  pts *= mul;
  // Engine order: multiplier → floor → cap (cap wins if both bind).
  if (floor != null && Number.isFinite(floor)) pts = Math.max(pts, floor);
  if (cap != null && Number.isFinite(cap)) pts = Math.min(pts, cap);
  const shown = Number.isInteger(pts) ? String(pts) : pts.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
  return `${amount.toLocaleString()} spend → ${shown} ${pointCcy || "LP"}`;
}

export default function DigestionRulesPage() {
  const demo = PRESETS.demoCc;
  const [rows, setRows] = useState<DigestionRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    ...demo.identity,
    minAmount: "0.01",
    eligibleCurrencies: demo.gate.currencies,
    eligibleMccs: demo.gate.mccs,
    whenFactors: "[]",
    multiplier: "",
    cap: "",
    floor: "",
    tierJson: '[\n  { "upTo": 5000, "rate": 0.01 },\n  { "upTo": null, "rate": 0.02 }\n]',
    tableJson:
      '{\n  "by": "tier",\n  "map": {\n    "GOLD": { "type": "RATE", "rate": 0.02 },\n    "DEFAULT": { "type": "RATE", "rate": 0.01 }\n  }\n}',
  });
  const [gate, setGate] = useState<FactorGate>(demo.gate);
  const [formulaType, setFormulaType] = useState<FormulaType>(demo.formulaType);
  const [rate, setRate] = useState(demo.rate);
  const [fixed, setFixed] = useState("0");
  const [value, setValue] = useState("1000");
  const [created, setCreated] = useState<unknown>(null);
  const [gatesLive, setGatesLive] = useState(true);
  const [advanced, setAdvanced] = useState(false);
  const [showFormulaJson, setShowFormulaJson] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);

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

  const example = useMemo(
    () => exampleScore(formulaPreview, 1000, form.pointCurrency),
    [formulaPreview, form.pointCurrency],
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

  useEffect(() => {
    if (!gatesLive) return;
    const factors = factorsFromGate(gate);
    const mccs = gate.mccs
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const currencies = gate.currencies
      .split(/[,\s]+/)
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
    const amtMin = numOrNull(gate.amtMin);
    setForm((f) => ({
      ...f,
      whenFactors: JSON.stringify(factors, null, 2),
      eligibleCurrencies: currencies.join(","),
      eligibleMccs: mccs.join(","),
      minAmount: amtMin != null ? String(amtMin) : f.minAmount,
    }));
  }, [gate, gatesLive]);

  const patchGate = (patch: Partial<FactorGate>) => {
    setGatesLive(true);
    setGate((g) => ({ ...g, ...patch }));
  };

  const applyPreset = (key: keyof typeof PRESETS) => {
    const p = PRESETS[key];
    setGatesLive(true);
    setAdvanced(false);
    setGate(p.gate);
    setFormulaType(p.formulaType);
    setRate(p.rate);
    setForm((f) => ({ ...f, ...p.identity }));
  };

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
      const ageLte = gatesLive ? numOrNull(gate.ageLte) : null;
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
        ...(ageLte != null ? { maxAgeDays: ageLte } : {}),
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

  const formulaHint = FORMULA_TYPES.find((t) => t.id === formulaType)?.hint ?? "";
  const summaryBits = gatesLive ? gateBits(gate) : [];

  const walk = useMemo(() => {
    const rank = (a: DigestionRule, b: DigestionRule) => {
      const pa = Number(a.priority ?? 100);
      const pb = Number(b.priority ?? 100);
      if (pa !== pb) return pa - pb;
      return String(a.id ?? "").localeCompare(String(b.id ?? ""), undefined, { numeric: true });
    };
    return {
      on: rows.filter((r) => r.isEnabled !== false).slice().sort(rank),
      off: rows.filter((r) => r.isEnabled === false),
    };
  }, [rows]);

  const persistWalk = async (ordered: DigestionRule[]) => {
    const planned = ordered.map((r, i) => ({ r, priority: (i + 1) * 10 }));
    const updates = planned.filter(({ r, priority }) => Number(r.priority) !== priority && r.id != null);
    if (updates.length === 0) return;
    setSavingOrder(true);
    setError(null);
    setRows((prev) =>
      prev.map((row) => {
        const hit = planned.find((p) => String(p.r.id) === String(row.id));
        return hit ? { ...row, priority: hit.priority } : row;
      }),
    );
    try {
      await Promise.all(updates.map(({ r, priority }) => engine.digestionUpdate(r.id!, { priority })));
      await load();
    } catch (e) {
      setError(errMsg(e));
      await load();
    } finally {
      setSavingOrder(false);
    }
  };

  const onDropRow = (to: number) => {
    if (dragIdx == null || dragIdx === to || savingOrder) {
      setDragIdx(null);
      setOverIdx(null);
      return;
    }
    const next = moveItem(walk.on, dragIdx, to);
    setDragIdx(null);
    setOverIdx(null);
    void persistWalk(next);
  };

  return (
    <div>
      <FlowStrip active="ops" />
      <EngineStatusBanner />
      <PageHeader
        title="1 · Brain — Digestion rules"
        description="Walk is one list: lower priority is 1st. Wrong eventType is skipped, not a fail. First bingo stops. Else SKIPPED / NO_RULE."
        api={[
          { method: "GET", path: "/digestion-rules" },
          { method: "POST", path: "/digestion-rules" },
          { method: "PUT", path: "/digestion-rules/{id}" },
        ]}
      />

      <Card
        className="mb-4"
        title="New rule"
        description="Pick the four AND gates, then a formula. Empty gate = any — chips write live, no Apply."
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <StepHead n={1} title="When" sub="AND — all four must match" />
          <div className="flex flex-wrap gap-1.5">
            <button type="button" className="btn-secondary text-xs" onClick={() => applyPreset("demoCc")}>
              Demo CC
            </button>
            <button type="button" className="btn-secondary text-xs" onClick={() => applyPreset("grocery")}>
              Grocery
            </button>
            <button
              type="button"
              className="btn-ghost text-xs"
              onClick={() => {
                setGatesLive(true);
                setGate({ ...EMPTY_FACTOR_GATE });
              }}
            >
              Always
            </button>
          </div>
        </div>
        <AndGateGrid gate={gate} onChange={patchGate} />

        <div
          className={clsx(
            "mt-3 rounded-lg px-3 py-2 text-sm font-medium",
            gatesLive ? "bg-violet-50 text-violet-950" : "bg-amber-50 text-amber-950",
          )}
        >
          {gatesLive ? (
            gateIsOpen(gate) ? (
              <span>Fires for every event of this eventType — no extra gates.</span>
            ) : (
              <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-violet-500">Fires when</span>
                {summaryBits.map((bit, i) => (
                  <span key={bit} className="inline-flex items-center gap-1.5">
                    {i > 0 ? <span className="text-[10px] font-bold text-violet-400">AND</span> : null}
                    <span className="rounded-md bg-white px-1.5 py-0.5 font-mono text-[12px] ring-1 ring-violet-200">
                      {bit}
                    </span>
                  </span>
                ))}
              </span>
            )
          ) : (
            <span>Custom FactorSet — chips paused until you pick a gate or Demo/Grocery.</span>
          )}
        </div>

        <button
          type="button"
          className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-800"
          onClick={() => setAdvanced((v) => !v)}
        >
          {advanced ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          Advanced JSON
        </button>
        {advanced ? (
          <div className="mt-2 rounded-xl border border-dashed border-slate-200 p-3">
            <FactorJsonEditor
              label="whenFactors"
              hint="Editing JSON pauses the four gates. Pick a chip to resume."
              value={form.whenFactors}
              onChange={(next) => {
                setGatesLive(false);
                setForm((f) => ({ ...f, whenFactors: next }));
              }}
              presets={BRAIN_FACTOR_PRESETS}
              rows={8}
            />
          </div>
        ) : null}

        <hr className="my-5 border-slate-100" />

        <div className="mb-3">
          <StepHead n={2} title="Score" sub={formulaHint} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FORMULA_TYPES.map((t) => (
            <Chip key={t.id} active={formulaType === t.id} onClick={() => setFormulaType(t.id)}>
              {t.label}
            </Chip>
          ))}
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <div className="space-y-2">
            {formulaType === "RATE" || formulaType === "LINEAR" ? (
              <label className="field max-w-[12rem]">
                <span className="field-label">rate</span>
                <input className="field-input font-mono" value={rate} onChange={(e) => setRate(e.target.value)} />
              </label>
            ) : null}
            {formulaType === "LINEAR" ? (
              <label className="field">
                <span className="field-label">fixed</span>
                <input className="field-input font-mono" value={fixed} onChange={(e) => setFixed(e.target.value)} />
              </label>
            ) : null}
            {formulaType === "FIXED" ? (
              <label className="field">
                <span className="field-label">value</span>
                <input className="field-input font-mono" value={value} onChange={(e) => setValue(e.target.value)} />
              </label>
            ) : null}
            {formulaType === "TIERED_RATE" ? (
              <label className="field">
                <span className="field-label">brackets JSON</span>
                <textarea
                  className="field-input min-h-[100px] font-mono text-xs"
                  value={form.tierJson}
                  onChange={(e) => setForm((f) => ({ ...f, tierJson: e.target.value }))}
                />
              </label>
            ) : null}
            {formulaType === "TABLE" ? (
              <label className="field">
                <span className="field-label">table JSON (by + map)</span>
                <textarea
                  className="field-input min-h-[120px] font-mono text-xs"
                  value={form.tableJson}
                  onChange={(e) => setForm((f) => ({ ...f, tableJson: e.target.value }))}
                />
              </label>
            ) : null}

            <div className="grid grid-cols-3 gap-2">
              <label className="field">
                <FieldLabel
                  side="bottom"
                  tipTitle="multiplier"
                  tip="After the formula, multiply points. Promo ×2: RATE 0.01 on 1,000 = 10, then ×2 = 20 LP. Blank = 1 (no extra). Applied before floor and cap."
                >
                  multiplier
                </FieldLabel>
                <input
                  className="field-input font-mono text-xs"
                  value={form.multiplier}
                  onChange={(e) => setForm((f) => ({ ...f, multiplier: e.target.value }))}
                  placeholder="optional"
                />
              </label>
              <label className="field">
                <FieldLabel
                  side="bottom"
                  tipTitle="cap"
                  tip="Maximum points this rule may award, after multiplier and floor. RATE 0.01 on 10,000 = 100, cap 50 → 50 LP. Blank = no max. If floor and cap both bind, cap wins."
                >
                  cap
                </FieldLabel>
                <input
                  className="field-input font-mono text-xs"
                  value={form.cap}
                  onChange={(e) => setForm((f) => ({ ...f, cap: e.target.value }))}
                  placeholder="optional"
                />
              </label>
              <label className="field">
                <FieldLabel
                  side="bottom"
                  tipTitle="floor"
                  tip="Minimum points after multiplier. RATE 0.01 on 10 = 0.1, floor 1 → 1 LP. Blank = no min. Applied after multiplier, before cap."
                >
                  floor
                </FieldLabel>
                <input
                  className="field-input font-mono text-xs"
                  value={form.floor}
                  onChange={(e) => setForm((f) => ({ ...f, floor: e.target.value }))}
                  placeholder="optional"
                />
              </label>
            </div>
          </div>

          <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-3">
            <FieldLabel tipTitle="formula" tip="JSONB on digestion_rule.formula. Example uses spend 1,000.">
              Worked example
            </FieldLabel>
            <p className="mt-2 font-mono text-lg font-semibold text-emerald-900">
              {example ?? "See brackets / table"}
            </p>
            <p className="mt-1 text-[11px] text-emerald-800/80">{formulaLabel(formulaPreview)}</p>
            <button
              type="button"
              className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800/70 hover:text-emerald-950"
              onClick={() => setShowFormulaJson((v) => !v)}
            >
              {showFormulaJson ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              Formula JSON
            </button>
            {showFormulaJson ? (
              <pre className="mt-2 overflow-auto rounded-lg bg-slate-900 p-2 font-mono text-[11px] text-emerald-200">
                {JSON.stringify(formulaPreview, null, 2)}
              </pre>
            ) : null}
          </div>
        </div>

        <hr className="my-5 border-slate-100" />

        <div className="mb-3">
          <StepHead n={3} title="Save as" sub="Identity on digestion_rule" />
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          <label className="field">
            <span className="field-label">code</span>
            <input
              className="field-input font-mono text-xs"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
            />
          </label>
          <label className="field">
            <span className="field-label">name</span>
            <input
              className="field-input text-xs"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </label>
          <label className="field">
            <span className="field-label">eventType</span>
            <input
              className="field-input font-mono text-xs"
              value={form.eventType}
              onChange={(e) => setForm((f) => ({ ...f, eventType: e.target.value }))}
            />
          </label>
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {EVENT_TYPES.map((t) => (
            <Chip key={t} active={form.eventType === t} onClick={() => setForm((f) => ({ ...f, eventType: t }))}>
              {t}
            </Chip>
          ))}
        </div>
        <div className="mt-3 grid gap-2.5 sm:grid-cols-3">
          <label className="field">
            <span className="field-label">operation</span>
            <div className="flex flex-wrap gap-1.5">
              {["EARN", "BURN"].map((op) => (
                <Chip
                  key={op}
                  active={form.operation === op}
                  onClick={() => setForm((f) => ({ ...f, operation: op }))}
                >
                  {op}
                </Chip>
              ))}
            </div>
          </label>
          <label className="field">
            <span className="field-label">points ccy</span>
            <input
              className="field-input font-mono text-xs"
              value={form.pointCurrency}
              onChange={(e) => setForm((f) => ({ ...f, pointCurrency: e.target.value }))}
            />
          </label>
          <label className="field">
            <span className="field-label">priority</span>
            <div className="flex flex-wrap items-center gap-1.5">
              {["10", "20", "100"].map((p) => (
                <Chip
                  key={p}
                  active={form.priority === p}
                  onClick={() => setForm((f) => ({ ...f, priority: p }))}
                >
                  {p}
                </Chip>
              ))}
              <input
                className="field-input w-20 font-mono text-xs"
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
              />
            </div>
          </label>
        </div>

        <div className="mt-4">
          <ActionBar loading={loading} error={error}>
            <button type="button" className="btn-primary" onClick={() => void create()}>
              Create rule
            </button>
            <button type="button" className="btn-secondary" onClick={() => void load()}>
              Refresh
            </button>
          </ActionBar>
          {created ? (
            <div className="mt-3">
              <p className="mb-1 text-[11px] font-semibold text-emerald-800">Created</p>
              <JsonBlock value={created} maxHeight={160} />
            </div>
          ) : null}
        </div>
      </Card>

      <Card
        title={`Walk order · ${walk.on.length} enabled`}
        description="Drag a row to swap 1st / 2nd. Saves priority 10, 20, 30… via PUT /digestion-rules/{id}."
        right={
          <div className="flex items-center gap-2">
            {savingOrder ? <span className="text-[11px] text-violet-700">Saving order…</span> : null}
            <Link href="/transactions-ingest" className="text-xs text-emerald-700 hover:underline">
              Dry-run explain →
            </Link>
          </div>
        }
      >
        {rows.length === 0 ? (
          <Empty>No rules yet — create Demo CC above to score the guided webhook.</Empty>
        ) : (
          <div>
            {error ? (
              <p className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p>
            ) : null}
            <p className="mb-3 rounded-lg bg-violet-50 px-3 py-2 text-[12px] text-violet-950">
              Grip the <span className="font-semibold">⋮⋮</span> handle and drop on another row. Engine walk follows
              this list (wrong eventType is skipped, not a fail).
            </p>
            <ol className={savingOrder ? "pointer-events-none opacity-70" : undefined}>
              {walk.on.map((r, i) => (
                <li key={r.id ?? r.code}>
                  {i > 0 ? (
                    <div className="flex items-center gap-2 py-1.5 pl-2 text-[11px] font-medium text-slate-400">
                      <span className="ml-2.5 inline-block h-4 w-px bg-slate-200" />
                      ↓ no bingo / eventType mismatch → try #{i + 1}
                    </div>
                  ) : null}
                  <div
                    draggable={!savingOrder && walk.on.length > 1}
                    onDragStart={() => {
                      setDragIdx(i);
                      setOverIdx(i);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (overIdx !== i) setOverIdx(i);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      onDropRow(i);
                    }}
                    onDragEnd={() => {
                      setDragIdx(null);
                      setOverIdx(null);
                    }}
                    className={clsx(
                      "flex gap-3 rounded-xl border bg-white px-3 py-3",
                      dragIdx === i
                        ? "border-violet-400 opacity-60"
                        : overIdx === i && dragIdx != null && dragIdx !== i
                          ? "border-violet-500 ring-2 ring-violet-300"
                          : "border-slate-200",
                      walk.on.length > 1 ? "cursor-grab active:cursor-grabbing" : "",
                    )}
                  >
                    <div className="flex shrink-0 flex-col items-center gap-1 self-center text-slate-400">
                      <GripVertical className="h-4 w-4" aria-hidden />
                    </div>
                    <div className="flex shrink-0 flex-col items-center">
                      <span className="inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded-full bg-violet-600 px-1.5 text-[12px] font-bold text-white">
                        {i + 1}
                      </span>
                      <span className="mt-1 text-[9px] font-semibold uppercase tracking-wide text-violet-400">
                        {nth(i)}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="font-mono text-sm font-semibold text-slate-900">{r.code}</div>
                          <div className="mt-0.5 text-xs text-slate-500">
                            {[r.name, r.operation, r.pointCurrency].filter(Boolean).join(" · ")}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-md bg-slate-900 px-1.5 py-0.5 font-mono text-[11px] text-white">
                            {r.eventType || "—"}
                          </span>
                          <Badge tone="ok">on</Badge>
                          <span className="rounded-md bg-violet-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-violet-900">
                            pri {r.priority}
                          </span>
                        </div>
                      </div>
                      <p className="mt-1.5 text-[11px] text-slate-500">
                        Webhook eventType must be <span className="font-mono text-slate-700">{r.eventType}</span>{" "}
                        or this row is skipped.
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <span className="rounded-md bg-violet-50 px-1.5 py-0.5 font-mono text-[11px] text-violet-900 ring-1 ring-violet-100">
                          {humanizeWhenFactors(r.whenFactors)}
                        </span>
                        <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 font-mono text-[11px] text-emerald-900 ring-1 ring-emerald-100">
                          {formulaLabel(r.formula)}
                        </span>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
            {walk.on.length > 0 ? (
              <div className="mt-2 rounded-lg border border-dashed border-rose-200 bg-rose-50/60 px-3 py-2 text-[12px] text-rose-900">
                ↓ still no bingo after #{walk.on.length} → <span className="font-mono font-semibold">NO_RULE</span>{" "}
                (SKIPPED, fail queue)
              </div>
            ) : null}
            {walk.off.length ? (
              <div className="mt-4">
                <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                  Off — not in the walk
                </div>
                <ul className="space-y-2">
                  {walk.off.map((r) => (
                    <li
                      key={r.id ?? r.code}
                      className="rounded-xl border border-dashed border-slate-200 px-3.5 py-3 opacity-60"
                    >
                      <div className="font-mono text-sm">{r.code}</div>
                      <div className="text-xs text-slate-500">
                        {r.eventType} · pri {r.priority}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}
      </Card>
    </div>
  );
}
