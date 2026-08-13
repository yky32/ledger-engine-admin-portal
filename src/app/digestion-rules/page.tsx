"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader, Card, Badge, Empty, JsonBlock } from "@/components/ui/kit";
import { ActionBar } from "@/components/ui/action";
import { FieldLabel, HelpTip, ExplainBox } from "@/components/ui/help";
import { FlowStrip } from "@/components/layout/flow-strip";
import { engine } from "@/lib/engine";
import { errMsg } from "@/lib/format";
import type { DigestionRule } from "@/lib/types";

const FIELD_TIPS: Record<string, { title: string; body: string }> = {
  code: {
    title: "code — stable business key",
    body: "Unique rule id for ops (e.g. PURCHASE_DEFAULT). Used in logs and lookups. Not shown to end customers.",
  },
  name: {
    title: "name — human label",
    body: "Display name for the rule list. Cosmetic; engine matches on eventType + priority + filters.",
  },
  eventType: {
    title: "eventType — upstream event name",
    body: "Must match webhook body eventType exactly (case-sensitive as stored), e.g. PURCHASE, REDEEM, SIGNUP. No match → NO_RULE / skip earn.",
  },
  operation: {
    title: "operation — EARN | BURN | PROCESS",
    body: "EARN credits customer LP (debit PROGRAM). BURN debits customer LP (credit PROGRAM). PROCESS = non-balance side effects / subtype via processType.",
  },
  formula: {
    title: "formula — how many points",
    body: "AMOUNT = points equal spend amount. RATE:0.01 = 1% of amount. FIXED:100 = flat 100. MUL_ADD:0.01:5 = amount*0.01+5. JSON {\"rate\":0.01,\"fixed\":0} also works.",
  },
  pointCurrency: {
    title: "pointCurrency — book to post",
    body: "Almost always LP. Earn/burn posts to the customer wallet account in this currency (must exist or be ensured by Door auto-wallet).",
  },
  priority: {
    title: "priority — lower runs first",
    body: "When multiple rules match the same eventType, lower priority number is evaluated first. Use 10 for default, 100 for fallbacks.",
  },
  minAmount: {
    title: "minAmount — spend floor",
    body: "Event amount must be ≥ this (in event currency) or rule does not qualify. Use 0.01 to drop zero/noise; 0 to allow everything.",
  },
  eligibleCurrencies: {
    title: "eligibleCurrencies — allow-list",
    body: "Comma-separated ISO codes, e.g. HKD,USD. Blank/empty = any currency. JPY event with only HKD,USD listed → rule skips (useful for matrix tests).",
  },
};

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
        title="1 · Brain — Digestion rules"
        description="Scoring brain: which events earn/burn and how many points. Runtime DB · no restart · /digestion-rules"
      />

      <div className="mb-4 grid gap-3 lg:grid-cols-3">
        <ExplainBox title="What is the Brain?" tone="ops">
          <p>
            After the Door lets an event in, Digestion decides: match{" "}
            <code className="text-xs">eventType</code>, pass filters (min amount, currency,
            age), then compute points via <code className="text-xs">formula</code>.
          </p>
        </ExplainBox>
        <ExplainBox title="Empty table?">
          <p>
            No rules ⇒ webhooks cannot earn (
            <code className="text-xs">NO_RULE</code>). Create at least{" "}
            <code className="text-xs">PURCHASE</code> EARN, or let Simulator seed{" "}
            <code className="text-xs">SIM_*</code> rules.
          </p>
        </ExplainBox>
        <ExplainBox title="Then booking" tone="info">
          <p>
            Matched EARN/BURN → movement + double-entry legs (customer LP ↔ PROGRAM pool).
            Inspect on{" "}
            <Link href="/ledger-entries" className="underline">
              DE legs
            </Link>{" "}
            /{" "}
            <Link href="/review" className="underline">
              customer review
            </Link>
            .
          </p>
        </ExplainBox>
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-5">
        <Card title="Create rule" className="lg:col-span-2" description="Hover ? for each field">
          <div className="grid gap-2.5">
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
                <FieldLabel
                  tipTitle={FIELD_TIPS[k]?.title}
                  tip={FIELD_TIPS[k]?.body}
                >
                  {label}
                </FieldLabel>
                <input
                  className="field-input font-mono text-xs"
                  value={form[k]}
                  onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
                />
              </label>
            ))}
            <p className="text-[11px] text-slate-500">
              Formula cheat:{" "}
              <HelpTip title="Formula reference" wide>
                <ul className="list-disc space-y-1 pl-3">
                  <li>
                    <code>AMOUNT</code> — points = event amount
                  </li>
                  <li>
                    <code>RATE:0.01</code> — 1% of amount
                  </li>
                  <li>
                    <code>FIXED:100</code> — always 100 LP
                  </li>
                  <li>
                    <code>MUL_ADD:0.01:5</code> — amount×0.01 + 5
                  </li>
                </ul>
              </HelpTip>{" "}
              click ?
            </p>
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
