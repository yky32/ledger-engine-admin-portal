"use client";

import { useEffect, useState } from "react";
import { PageHeader, Card, JsonBlock, Badge } from "@/components/ui/kit";
import { ActionBar } from "@/components/ui/action";
import { engine } from "@/lib/engine";
import { errMsg, nowIso, randomEventId, randomOwnerId } from "@/lib/format";
import { formatMatchedPath } from "@/lib/factors";
import { FlowStrip } from "@/components/layout/flow-strip";
import type { EligibilityTraceEntry, IngestResult } from "@/lib/types";

export default function WebhookPage() {
  const [ownerId, setOwnerId] = useState("");
  const [eventId, setEventId] = useState(randomEventId());
  const [eventType, setEventType] = useState("PURCHASE");
  const [amount, setAmount] = useState("100");
  const [currency, setCurrency] = useState("HKD");
  const [mcc, setMcc] = useState("");
  const [coaProfileCode, setCoaProfileCode] = useState("");
  const [occurredAt, setOccurredAt] = useState(nowIso());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<IngestResult | null>(null);

  useEffect(() => {
    try {
      const s = sessionStorage.getItem("review.ownerId");
      if (s) setOwnerId(s);
    } catch {
      /* */
    }
  }, []);

  const body = () => ({
    eventId: eventId.trim(),
    ownerId: ownerId.trim(),
    eventType,
    amount: Number(amount),
    currency,
    occurredAt,
    metadata: {
      source: "admin-portal",
      ...(mcc.trim() ? { mcc: mcc.trim() } : {}),
      ...(coaProfileCode.trim()
        ? { coaProfileCode: coaProfileCode.trim().toUpperCase() }
        : {}),
    },
  });

  const applyPreset = (kind: "earn" | "burn") => {
    setEventId(randomEventId());
    setOccurredAt(nowIso());
    if (kind === "earn") {
      setEventType("PURCHASE");
      setAmount("500");
      setCurrency("HKD");
      setMcc("5411");
    } else {
      setEventType("REDEEM");
      setAmount("5");
      setCurrency("LP");
      setMcc("");
    }
  };

  const fire = async (dry: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const r = dry
        ? await engine.webhookTxnDryRun(body())
        : await engine.webhookTxn(body());
      setResult(r.data as IngestResult);
    } catch (e) {
      setError(errMsg(e));
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const trace: EligibilityTraceEntry[] = Array.isArray(result?.eligibilityTrace)
    ? result!.eligibilityTrace!
    : [];

  return (
    <div>
      <FlowStrip active="shoot" />
      <PageHeader
        title="Fire webhook"
        description="Live or dry-run. eligibilityTrace includes matchedPath (Factor explain)."
      />
      <div className="mb-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-secondary text-xs"
          onClick={() => applyPreset("earn")}
        >
          Preset · Earn grocery 500 HKD / MCC 5411
        </button>
        <button
          type="button"
          className="btn-secondary text-xs"
          onClick={() => applyPreset("burn")}
        >
          Preset · Burn / REDEEM 5 LP
        </button>
        <a href="/demo" className="btn-secondary text-xs">
          Open guided Demo page
        </a>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Payload">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="field sm:col-span-2">
              <span className="field-label">ownerId</span>
              <div className="flex gap-2">
                <input
                  className="field-input font-mono"
                  value={ownerId}
                  onChange={(e) => setOwnerId(e.target.value)}
                />
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setOwnerId(randomOwnerId())}
                >
                  Gen
                </button>
              </div>
            </label>
            <label className="field sm:col-span-2">
              <span className="field-label">eventId</span>
              <div className="flex gap-2">
                <input
                  className="field-input font-mono"
                  value={eventId}
                  onChange={(e) => setEventId(e.target.value)}
                />
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setEventId(randomEventId())}
                >
                  Gen
                </button>
              </div>
            </label>
            <label className="field">
              <span className="field-label">eventType</span>
              <select
                className="field-select"
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
              >
                {["PURCHASE", "REDEEM", "SIGNUP", "REFUND"].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">currency</span>
              <select
                className="field-select"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                {["HKD", "USD", "JPY", "LP"].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">amount</span>
              <input
                className="field-input font-mono"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </label>
            <label className="field">
              <span className="field-label">mcc (optional)</span>
              <input
                className="field-input font-mono"
                value={mcc}
                onChange={(e) => setMcc(e.target.value)}
                placeholder="5411"
              />
            </label>
            <label className="field">
              <span className="field-label">coaProfileCode (meta, optional)</span>
              <input
                className="field-input font-mono"
                value={coaProfileCode}
                onChange={(e) => setCoaProfileCode(e.target.value)}
                placeholder="e.g. STREAM_A — only on auto-wallet"
              />
            </label>
            <label className="field sm:col-span-2">
              <span className="field-label">occurredAt</span>
              <input
                className="field-input font-mono text-xs"
                value={occurredAt}
                onChange={(e) => setOccurredAt(e.target.value)}
              />
            </label>
          </div>
          <div className="mt-4">
            <ActionBar loading={loading} error={error}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => fire(true)}
                disabled={loading}
              >
                Dry-run
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => fire(false)}
                disabled={loading}
              >
                Send live
              </button>
            </ActionBar>
          </div>
        </Card>
        <div className="space-y-4">
          <Card title="Summary">
            {result ? (
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <dt className="text-slate-500">status</dt>
                <dd>
                  <Badge tone={result.status === "SKIPPED" ? "warn" : "ok"}>
                    {result.status}
                    {result.dryRun ? " · dry-run" : ""}
                  </Badge>
                </dd>
                <dt className="text-slate-500">matchedRule</dt>
                <dd className="font-mono text-xs">{result.matchedRuleCode || "—"}</dd>
                <dt className="text-slate-500">points</dt>
                <dd className="text-lg font-bold text-emerald-700">
                  {result.points ?? "—"}
                </dd>
                <dt className="text-slate-500">reason</dt>
                <dd className="text-xs">{result.reason || "—"}</dd>
              </dl>
            ) : (
              <p className="text-sm text-slate-500">—</p>
            )}
          </Card>
          <Card title="eligibilityTrace">
            {trace.length === 0 ? (
              <p className="text-sm text-slate-500">No candidate rules (or empty)</p>
            ) : (
              <div className="table-wrap max-h-48 overflow-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>rule</th>
                      <th>pri</th>
                      <th>ok</th>
                      <th>step</th>
                      <th>path</th>
                      <th>detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trace.map((row, i) => (
                      <tr key={i}>
                        <td className="font-mono text-[10px]">{row.ruleCode}</td>
                        <td>{row.priority}</td>
                        <td>{row.matched ? "✓" : "✗"}</td>
                        <td className="font-mono text-[10px]">{row.failStep || "—"}</td>
                        <td
                          className="max-w-[140px] truncate font-mono text-[10px] text-emerald-800"
                          title={formatMatchedPath(row.matchedPath)}
                        >
                          {formatMatchedPath(row.matchedPath)}
                        </td>
                        <td className="max-w-[160px] truncate text-[10px]" title={row.detail}>
                          {row.detail}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
          <Card title="Raw JSON">{result ? <JsonBlock value={result} /> : null}</Card>
        </div>
      </div>
    </div>
  );
}
