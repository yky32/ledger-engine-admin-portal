"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, JsonBlock, Badge } from "@/components/ui/kit";
import { ActionBar } from "@/components/ui/action";
import { engine } from "@/lib/engine";
import { errMsg, nowIso, randomEventId, randomOwnerId, randomMainAccount } from "@/lib/format";
import { formatMatchedPath } from "@/lib/factors";
import { EVENT_TYPES, INGEST_ACTIONS, WEBHOOK_EVENT_PRESETS } from "@/lib/recipes";
import { PageShell } from "@/components/layout/page-shell";
import { RefundHow } from "@/components/books/refund-how";
import { CcTxnPath } from "@/components/books/cc-txn-path";
import type { EligibilityTraceEntry, IngestResult } from "@/lib/types";

const DEMO_OWNER = "01A81267065";

export default function WebhookPage() {
  const [ownerId, setOwnerId] = useState(DEMO_OWNER);
  const [eventId, setEventId] = useState("");
  const [eventType, setEventType] = useState("CC_TXN");
  const [amount, setAmount] = useState("100");
  const [currency, setCurrency] = useState("HKD");
  const [mcc, setMcc] = useState("");
  const [coaProfileCode, setCoaProfileCode] = useState("");
  const [occurredAt, setOccurredAt] = useState("");
  const [mainAccount, setMainAccount] = useState("");
  const [extraMetaJson, setExtraMetaJson] = useState(
    '{\n  "channel": "UAF_CC",\n  "posId": "HKG-001"\n}',
  );
  const [originalEventId, setOriginalEventId] = useState("");
  const [action, setAction] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<IngestResult | null>(null);

  useEffect(() => {
    setEventId(randomEventId());
    setOccurredAt(nowIso());
    setMainAccount(randomMainAccount("9089"));
    try {
      const s = sessionStorage.getItem("review.ownerId");
      if (s && s.startsWith("01A")) setOwnerId(s);
    } catch {
      /* */
    }
  }, []);

  const extraMeta = useMemo(() => {
    try {
      const v = JSON.parse(extraMetaJson || "{}") as unknown;
      if (v && typeof v === "object" && !Array.isArray(v)) {
        const out: Record<string, string> = {};
        for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
          if (val == null) continue;
          out[k] = String(val);
        }
        return out;
      }
    } catch {
      /* */
    }
    return {} as Record<string, string>;
  }, [extraMetaJson]);

  const payload = useMemo(() => {
    const body: Record<string, unknown> = {
      eventId: eventId.trim(),
      ownerId: ownerId.trim(),
      eventType,
      amount: Number(amount),
      currency,
      occurredAt,
      metadata: {
        source: "uaf-sdk",
        ...(mcc.trim() ? { mcc: mcc.trim() } : {}),
        ...(coaProfileCode.trim()
          ? { coaProfileCode: coaProfileCode.trim().toUpperCase() }
          : {}),
        ...extraMeta,
      },
    };
    const main = mainAccount.trim();
    if (main) body.mainAccount = main;
    const orig = originalEventId.trim();
    if (orig) body.originalEventId = orig;
    if (action) {
      body.action = action;
    } else if (orig) {
      body.action = "REFUND";
    }
    return body;
  }, [
    eventId,
    ownerId,
    eventType,
    amount,
    currency,
    occurredAt,
    mcc,
    coaProfileCode,
    extraMeta,
    originalEventId,
    action,
    mainAccount,
  ]);

  const sdkJava = useMemo(() => {
    const meta = (payload.metadata as Record<string, string>) || {};
    const metaEntries = Object.entries(meta)
      .map(([k, v]) => `            "${k}", "${v}"`)
      .join(",\n");
    const mainLine = mainAccount.trim()
      ? `\n    .mainAccount("${mainAccount.trim()}")`
      : "";
    const actionLine = payload.action
      ? `\n    .action("${payload.action}")`
      : "";
    const origLine = originalEventId.trim()
      ? `\n    .originalEventId("${originalEventId.trim()}")`
      : "";
    return `TransactionalEvent event = TransactionalEvent.builder()
    .eventId("${eventId.trim()}")
    .ownerId("${ownerId.trim()}")${mainLine}${actionLine}${origLine}
    .eventType("${eventType}")
    .amount(new BigDecimal("${amount}"))
    .currency("${currency}")
    .occurredAt(Instant.parse("${occurredAt}"))
    .metadata(Map.of(
${metaEntries}
    ))
    .build();
client.events().submit(event);`;
  }, [payload, eventId, ownerId, mainAccount, originalEventId, eventType, amount, currency, occurredAt]);

  const applyPreset = (kind: "cc_txn" | "cc_cip" | "ln_txn" | "burn") => {
    setEventId(randomEventId());
    setOccurredAt(nowIso());
    setAction("");
    setOriginalEventId("");
    if (kind === "cc_txn") {
      setEventType("CC_TXN");
      setAmount("500");
      setCurrency("HKD");
      setMcc("5411");
      setCoaProfileCode("");
    } else if (kind === "cc_cip") {
      setEventType("CC_CIP");
      setAmount("500");
      setCurrency("HKD");
      setMcc("");
      setCoaProfileCode("");
    } else if (kind === "ln_txn") {
      setEventType("LN_TXN");
      setAmount("500");
      setCurrency("HKD");
      setMcc("");
      setCoaProfileCode("");
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
        ? await engine.webhookTxnDryRun(payload)
        : await engine.webhookTxn(payload);
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
    <PageShell
      title="Webhook"
      description="SDK TransactionalEvent — ownerId + optional mainAccount + metadata hashmap. Dry-run or live."
      api={[
        { method: "POST", path: "/integrations/webhooks/transactions" },
        { method: "POST", path: "/integrations/webhooks/transactions/dry-run" },
      ]}
    >
      <div className="mb-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-secondary text-xs"
          onClick={() => applyPreset("cc_txn")}
        >
          Preset · CC_TXN credit card
        </button>
        <button
          type="button"
          className="btn-secondary text-xs"
          onClick={() => applyPreset("cc_cip")}
        >
          Preset · CC_CIP cash instalment
        </button>
        <button
          type="button"
          className="btn-secondary text-xs"
          onClick={() => applyPreset("ln_txn")}
        >
          Preset · LN_TXN loan
        </button>
        <button
          type="button"
          className="btn-secondary text-xs"
          onClick={() => applyPreset("burn")}
        >
          Preset · REDEEM burn
        </button>
        {WEBHOOK_EVENT_PRESETS.map((p) => (
          <button
            key={p.eventType}
            type="button"
            className="rounded-md border border-slate-200 bg-white px-2 py-1 font-mono text-[10px] text-slate-700 hover:border-emerald-300"
            onClick={() => {
              setEventType(p.eventType);
              setEventId(randomEventId());
            }}
            title={p.label}
          >
            {p.eventType}
          </button>
        ))}
        <a href="/demo" className="btn-secondary text-xs">
          Open guided Demo page
        </a>
        <a href="/use-cases" className="btn-secondary text-xs">
          Use cases
        </a>
      </div>

      <CcTxnPath />
      <RefundHow />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Payload">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="field sm:col-span-2">
              <span className="field-label">ownerId (01A…)</span>
              <div className="flex gap-2">
                <input
                  className="field-input font-mono"
                  value={ownerId}
                  onChange={(e) => setOwnerId(e.target.value)}
                />
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setOwnerId(DEMO_OWNER)}
                >
                  Demo
                </button>
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
              <span className="field-label">mainAccount (9089… / 9088…, optional)</span>
              <div className="flex flex-wrap gap-2">
                <input
                  className="field-input font-mono"
                  value={mainAccount}
                  onChange={(e) => setMainAccount(e.target.value)}
                  placeholder="blank → engine generates"
                />
                <button
                  type="button"
                  className="btn-secondary text-xs"
                  onClick={() => setMainAccount(randomMainAccount("9089"))}
                >
                  9089…
                </button>
                <button
                  type="button"
                  className="btn-secondary text-xs"
                  onClick={() => setMainAccount(randomMainAccount("9088"))}
                >
                  9088…
                </button>
                <button
                  type="button"
                  className="btn-secondary text-xs"
                  onClick={() => setMainAccount("")}
                >
                  Clear
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
              <span className="field-label">action</span>
              <select
                className="field-select"
                value={action}
                onChange={(e) => setAction(e.target.value)}
              >
                {INGEST_ACTIONS.map((a) => (
                  <option key={a.value || "spend"} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">originalEventId</span>
              <input
                className="field-input font-mono"
                value={originalEventId}
                onChange={(e) => setOriginalEventId(e.target.value)}
                placeholder="required for reverse"
              />
            </label>
            <label className="field">
              <span className="field-label">eventType</span>
              <select
                className="field-select"
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
              >
                {[...EVENT_TYPES, "REDEEM"].map((t) => (
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
            <label className="field sm:col-span-2">
              <span className="field-label">metadata (client hashmap JSON)</span>
              <textarea
                className="field-input min-h-[80px] font-mono text-[11px]"
                value={extraMetaJson}
                onChange={(e) => setExtraMetaJson(e.target.value)}
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
                <dt className="text-slate-500">COA</dt>
                <dd className="font-mono text-[11px]">
                  {result.coa
                    ? `${result.coa.code} · ${result.coa.entity}/${result.coa.type}/${result.coa.subType} · ${result.coa.currency}`
                    : "—"}
                </dd>
                <dt className="text-slate-500">account</dt>
                <dd className="font-mono text-[11px]">{result.coa?.fullNumber || result.coa?.accountId || "—"}</dd>
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
          <Card
            title="Request JSON"
            description="POST body — live preview before Dry-run / Send live"
            right={<span className="font-mono text-[10px] text-slate-400">before send</span>}
          >
            <JsonBlock value={payload} />
            <details className="mt-2">
              <summary className="cursor-pointer text-[11px] text-emerald-700">
                Java builder (ledger-engine-sdk)
              </summary>
              <pre className="mt-2 overflow-auto rounded-lg bg-slate-950 p-3 font-mono text-[10px] leading-relaxed text-emerald-100">
                {sdkJava}
              </pre>
            </details>
          </Card>
          {result ? (
            <Card title="Response JSON" description="Engine Result after last fire">
              <JsonBlock value={result} />
            </Card>
          ) : null}
        </div>
      </div>
    </PageShell>
  );
}
