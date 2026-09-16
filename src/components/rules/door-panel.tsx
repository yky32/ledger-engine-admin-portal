"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { engine } from "@/lib/engine";
import {
  DOOR_FACTOR_PRESETS,
  EMPTY_FACTOR_GATE,
  factorsFromGate,
  gateBits,
  humanizeWhenFactors,
  parseAndGates,
  parseFactorJson,
  type FactorGate,
} from "@/lib/factors";
import { clsx, errMsg } from "@/lib/format";
import type { IngestPolicy } from "@/lib/types";
import { FactorJsonEditor } from "@/components/factors/factor-json-editor";
import { AndGateGrid, Chip, StepHead } from "@/components/factors/gate-ui";
import { PageShell } from "@/components/layout/page-shell";
import { ActionBar } from "@/components/ui/action";
import { FieldRow } from "@/components/ui/field-row";
import { Badge, Card, JsonBlock } from "@/components/ui/kit";

const TIPS = {
  settlement: {
    title: "Settlement currency",
    body: "Wallet.settlementCurrency and the primary 01-01-01 book (HKD). Not Brain reward.",
  },
  ensure: {
    title: "Ensure currency",
    body: "Second 01-01-01 book on the same mainAccount (LP). Same chart, other currency — not 10-20-00.",
  },
} as const;

const GATE_PRESETS: Record<string, FactorGate> = {
  demoCc: {
    ...EMPTY_FACTOR_GATE,
    mccs: "101",
    currencies: "HKD",
    ageLte: "30",
    amtMin: "1",
    eventTypes: "CC_TXN",
  },
  grocery: {
    ...EMPTY_FACTOR_GATE,
    mccs: "5411,5412",
    currencies: "HKD,USD",
    ageLte: "30",
    amtMin: "100",
    amtMax: "999999",
  },
  pos: { ...EMPTY_FACTOR_GATE, channel: "POS" },
  hkdPos: { ...EMPTY_FACTOR_GATE, currencies: "HKD", channel: "POS" },
};

/** Compact segmented toggle for boolean choices; options may carry an active tone. */
function SegToggle({
  value,
  onChange,
  options,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  options: Array<{ v: boolean; label: string; tone?: "emerald" | "rose" }>;
}) {
  const activeCls = (tone?: "emerald" | "rose") =>
    tone === "emerald"
      ? "bg-emerald-600 text-white shadow-sm"
      : tone === "rose"
        ? "bg-rose-600 text-white shadow-sm"
        : "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200";
  return (
    <div className="inline-flex shrink-0 rounded-lg bg-slate-100 p-0.5">
      {options.map((o) => (
        <button
          key={o.label}
          type="button"
          onClick={() => onChange(o.v)}
          className={clsx(
            "rounded-md px-2.5 py-1 text-[11px] font-medium transition",
            o.v === value ? activeCls(o.tone) : "text-slate-500 hover:text-slate-800",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Read-only, human formatting of a policy value for the diff. */
function fmtValue(v: unknown): string {
  if (v == null || v === "") return "—";
  if (typeof v === "boolean") return v ? "on" : "off";
  return String(v);
}

type DiffRow = { label: string; from: string; to: string };

const DIFF_FIELDS: Array<{ key: keyof IngestPolicy; label: string }> = [
  { key: "isEnabled", label: "door" },
  { key: "isAutoCreateWallet", label: "auto-wallet" },
  { key: "autoWalletSettlementCurrency", label: "settlement" },
  { key: "autoWalletEnsureCurrency", label: "ensure" },
  { key: "autoWalletNamePrefix", label: "name prefix" },
  { key: "autoWalletAssociatedFrom", label: "associatedFrom" },
  { key: "autoWalletCoaProfileCode", label: "COA on auto-create" },
];

/** Saved row vs in-progress edits — humanized, one row per changed field. */
function diffPolicy(before: IngestPolicy, after: IngestPolicy): DiffRow[] {
  const rows: DiffRow[] = [];
  for (const { key, label } of DIFF_FIELDS) {
    const from = fmtValue(before[key]);
    const to = fmtValue(after[key]);
    if (from !== to) rows.push({ label, from, to });
  }
  const fromFactors = humanizeWhenFactors(before.entryFactors);
  const toFactors = humanizeWhenFactors(after.entryFactors);
  if (fromFactors !== toFactors) {
    rows.push({ label: "entry factors", from: fromFactors || "any", to: toFactors || "any" });
  }
  return rows;
}

export function DoorPanel() {
  const [policy, setPolicy] = useState<IngestPolicy | null>(null);
  const [saved, setSaved] = useState<IngestPolicy | null>(null);
  const [entryFactorsText, setEntryFactorsText] = useState("[]");
  const [gate, setGate] = useState<FactorGate>({ ...EMPTY_FACTOR_GATE });
  const [gatesLive, setGatesLive] = useState(true);
  const [advanced, setAdvanced] = useState(false);
  const [showJson, setShowJson] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const applyLoadedFactors = (raw: unknown) => {
    const parsed = parseAndGates(raw);
    if (parsed) {
      setGatesLive(true);
      setGate(parsed);
      setEntryFactorsText(JSON.stringify(factorsFromGate(parsed), null, 2));
    } else {
      setGatesLive(false);
      setAdvanced(true);
      setEntryFactorsText(JSON.stringify(raw ?? [], null, 2));
    }
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await engine.ingestPolicyGet();
      setPolicy(r.data);
      setSaved(r.data);
      applyLoadedFactors(r.data?.entryFactors);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!gatesLive) return;
    setEntryFactorsText(JSON.stringify(factorsFromGate(gate), null, 2));
  }, [gate, gatesLive]);

  const patchGate = (patch: Partial<FactorGate>) => {
    setGatesLive(true);
    setGate((g) => ({ ...g, ...patch }));
  };

  const save = async () => {
    if (!policy) return;
    setLoading(true);
    setError(null);
    setOk(null);
    try {
      let entryFactors: IngestPolicy["entryFactors"] = [];
      try {
        entryFactors = parseFactorJson(entryFactorsText) as IngestPolicy["entryFactors"];
      } catch (pe) {
        setError(errMsg(pe));
        setLoading(false);
        return;
      }
      const r = await engine.ingestPolicyPut({ ...policy, entryFactors });
      setPolicy(r.data);
      setSaved(r.data);
      applyLoadedFactors(r.data?.entryFactors);
      setOk("Saved — effective on the next webhook (no restart)");
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  /** Fill the form with the all-any preset — no engine call; user reviews the diff and Saves. */
  const quickAllAny = () => {
    if (!policy) return;
    setPolicy({
      ...policy,
      isEnabled: true,
      isAutoCreateWallet: true,
      autoWalletSettlementCurrency: "HKD",
      autoWalletEnsureCurrency: "LP",
      autoWalletNamePrefix: "Auto ",
      autoWalletCoaProfileCode: "",
      entryFactors: [],
    });
    setGatesLive(true);
    setGate({ ...EMPTY_FACTOR_GATE });
    setEntryFactorsText("[]");
    setOk("Preset applied to the form — review the diff, then Save.");
  };

  const admitBits = useMemo(() => (gatesLive ? gateBits(gate) : []), [gate, gatesLive]);

  const diffRows = useMemo(() => {
    if (!saved || !policy) return [];
    let draftEntryFactors: IngestPolicy["entryFactors"];
    try {
      draftEntryFactors = parseFactorJson(entryFactorsText) as IngestPolicy["entryFactors"];
    } catch {
      draftEntryFactors = policy.entryFactors; // invalid JSON — diff the rest only
    }
    return diffPolicy(saved, { ...policy, entryFactors: draftEntryFactors });
  }, [saved, policy, entryFactorsText]);

  return (
    <PageShell
      title="Rules · Door"
      description="First gate: accept the webhook at all? Brain scores after. One global row for the engine."
      ok={ok}
    >
      {!policy || !saved ? (
        <ActionBar loading={loading} error={error}>
          <button type="button" className="btn-secondary" onClick={() => void load()}>
            Load
          </button>
        </ActionBar>
      ) : (
        <>
          <Card
            className="mb-4"
            title="Current config"
            description="Saved policy — live in the engine since the last Save"
            right={diffRows.length > 0 ? <Badge tone="warn">unsaved edits below</Badge> : undefined}
          >
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  door
                </dt>
                <dd className="mt-1">
                  <Badge tone={saved.isEnabled ? "ok" : "error"}>
                    {saved.isEnabled ? "OPEN" : "CLOSED"}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  auto-wallet
                </dt>
                <dd className="mt-1">
                  <Badge tone={saved.isAutoCreateWallet ? "info" : "neutral"}>
                    {saved.isAutoCreateWallet ? "create on first match" : "off — CRM onboard"}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  settlement + ensure
                </dt>
                <dd className="mt-1 font-mono text-xs text-slate-700">
                  {`${saved.autoWalletSettlementCurrency || "HKD"} + ${saved.autoWalletEnsureCurrency || "LP"}`}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  name prefix / associatedFrom
                </dt>
                <dd className="mt-1 font-mono text-xs text-slate-700">
                  {`${saved.autoWalletNamePrefix || "—"} / ${saved.autoWalletAssociatedFrom || "—"}`}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  COA on auto-create
                </dt>
                <dd className="mt-1 font-mono text-xs text-slate-700">
                  {saved.autoWalletCoaProfileCode || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  who may enter
                </dt>
                <dd className="mt-1 font-mono text-xs text-slate-700">
                  {humanizeWhenFactors(saved.entryFactors) || "any"}
                </dd>
              </div>
            </dl>
            <button
              type="button"
              className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-800"
              onClick={() => setShowJson((v) => !v)}
            >
              {showJson ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
              DB JSON
            </button>
            {showJson ? (
              <div className="mt-2">
                <JsonBlock value={saved} maxHeight={240} />
              </div>
            ) : null}
          </Card>

          <Card
            title="Edit door"
            className="mb-4"
            description="Empty gate = admit anyone. Chips write entryFactors live — no Apply."
            right={
              <button type="button" className="btn-secondary text-xs" onClick={quickAllAny}>
                Quick action · set all any
              </button>
            }
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <StepHead
                n={1}
                title="Master switch"
                sub="off = every webhook SKIPPED / DISABLED"
                tone="emerald"
              />
              <SegToggle
                value={!!policy.isEnabled}
                onChange={(v) => setPolicy({ ...policy, isEnabled: v })}
                options={[
                  { v: true, label: "Open", tone: "emerald" },
                  { v: false, label: "Closed", tone: "rose" },
                ]}
              />
            </div>

            <hr className="my-4 border-slate-100" />

            <div className="flex flex-wrap items-center justify-between gap-2">
              <StepHead n={2} title="Who may enter" sub="AND — skip a gate to allow any" />
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  className="btn-secondary text-[11px]"
                  onClick={() => {
                    setGatesLive(true);
                    setGate(GATE_PRESETS.demoCc);
                  }}
                >
                  Demo CC
                </button>
                <button
                  type="button"
                  className="btn-secondary text-[11px]"
                  onClick={() => {
                    setGatesLive(true);
                    setGate(GATE_PRESETS.grocery);
                  }}
                >
                  Grocery
                </button>
                <button
                  type="button"
                  className="btn-secondary text-[11px]"
                  onClick={() => {
                    setGatesLive(true);
                    setGate(GATE_PRESETS.hkdPos);
                  }}
                >
                  HKD + POS
                </button>
                <button
                  type="button"
                  className="btn-ghost text-[11px]"
                  onClick={() => {
                    setGatesLive(true);
                    setGate({ ...EMPTY_FACTOR_GATE });
                  }}
                >
                  Anyone
                </button>
              </div>
            </div>

            <div className="mt-2.5">
              <AndGateGrid gate={gate} onChange={patchGate} tone="emerald" />
            </div>

            <FieldRow label="channel" className="mt-2.5">
              {["POS", "CRM", "OMS"].map((v) => (
                <Chip
                  key={v}
                  tone="emerald"
                  active={gate.channel === v}
                  onClick={() => patchGate({ channel: v })}
                >
                  {v}
                </Chip>
              ))}
              <Chip
                tone="emerald"
                active={!gate.channel?.trim()}
                onClick={() => patchGate({ channel: "" })}
              >
                any
              </Chip>
              <input
                className="field-input w-44 font-mono text-xs"
                value={gate.channel ?? ""}
                onChange={(e) => patchGate({ channel: e.target.value })}
                placeholder="metadata.channel"
              />
            </FieldRow>

            <button
              type="button"
              className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-800"
              onClick={() => setAdvanced((v) => !v)}
            >
              {advanced ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
              Advanced JSON
            </button>
            {advanced ? (
              <div className="mt-2 rounded-xl border border-dashed border-slate-200 p-3">
                <FactorJsonEditor
                  label="entryFactors"
                  hint="Editing JSON pauses the gates. Pick a chip to resume."
                  value={entryFactorsText}
                  onChange={(next) => {
                    setGatesLive(false);
                    setEntryFactorsText(next);
                  }}
                  presets={DOOR_FACTOR_PRESETS}
                  rows={8}
                />
              </div>
            ) : null}

            <hr className="my-4 border-slate-100" />

            <div className="flex flex-wrap items-center justify-between gap-2">
              <StepHead
                n={3}
                title="Wallet creation policy"
                sub="runs only after Brain already matched"
              />
              <SegToggle
                value={!!policy.isAutoCreateWallet}
                onChange={(v) => setPolicy({ ...policy, isAutoCreateWallet: v })}
                options={[
                  { v: true, label: "Create wallet" },
                  { v: false, label: "CRM onboards" },
                ]}
              />
            </div>

            {policy.isAutoCreateWallet ? (
              <div className="mt-2.5 space-y-1.5">
                <FieldRow
                  label="settlement"
                  tip={TIPS.settlement.body}
                  tipTitle={TIPS.settlement.title}
                >
                  {["HKD", "USD"].map((c) => (
                    <Chip
                      key={c}
                      tone="emerald"
                      active={policy.autoWalletSettlementCurrency === c}
                      onClick={() => setPolicy({ ...policy, autoWalletSettlementCurrency: c })}
                    >
                      {c}
                    </Chip>
                  ))}
                  <input
                    className="field-input w-20 font-mono text-xs"
                    value={String(policy.autoWalletSettlementCurrency ?? "")}
                    onChange={(e) =>
                      setPolicy({
                        ...policy,
                        autoWalletSettlementCurrency: e.target.value.toUpperCase(),
                      })
                    }
                    placeholder="HKD"
                  />
                </FieldRow>
                <FieldRow label="ensure" tip={TIPS.ensure.body} tipTitle={TIPS.ensure.title}>
                  {["LP", "HKD"].map((c) => (
                    <Chip
                      key={c}
                      tone="emerald"
                      active={policy.autoWalletEnsureCurrency === c}
                      onClick={() => setPolicy({ ...policy, autoWalletEnsureCurrency: c })}
                    >
                      {c}
                    </Chip>
                  ))}
                  <input
                    className="field-input w-20 font-mono text-xs"
                    value={String(policy.autoWalletEnsureCurrency ?? "")}
                    onChange={(e) =>
                      setPolicy({
                        ...policy,
                        autoWalletEnsureCurrency: e.target.value.toUpperCase(),
                      })
                    }
                    placeholder="LP"
                  />
                </FieldRow>
                <FieldRow label="name prefix" labelWidth="w-28">
                  <input
                    className="field-input w-32 text-xs"
                    value={String(policy.autoWalletNamePrefix ?? "")}
                    onChange={(e) => setPolicy({ ...policy, autoWalletNamePrefix: e.target.value })}
                    placeholder="Demo "
                  />
                </FieldRow>
                <FieldRow label="associatedFrom" labelWidth="w-28">
                  <input
                    className="field-input w-32 text-xs"
                    value={String(policy.autoWalletAssociatedFrom ?? "")}
                    onChange={(e) =>
                      setPolicy({ ...policy, autoWalletAssociatedFrom: e.target.value })
                    }
                    placeholder="POS"
                  />
                </FieldRow>
                <FieldRow label="COA on create" labelWidth="w-28">
                  {["CUSTOMER_CUST_LP", "CUSTOMER_CUST_HKD"].map((c) => (
                    <Chip
                      key={c}
                      tone="emerald"
                      active={policy.autoWalletCoaProfileCode === c}
                      onClick={() => setPolicy({ ...policy, autoWalletCoaProfileCode: c })}
                    >
                      {c}
                    </Chip>
                  ))}
                  <input
                    className="field-input w-40 font-mono text-xs"
                    value={String(policy.autoWalletCoaProfileCode ?? "")}
                    onChange={(e) =>
                      setPolicy({ ...policy, autoWalletCoaProfileCode: e.target.value })
                    }
                    placeholder="CUSTOMER_CUST_LP"
                  />
                </FieldRow>
              </div>
            ) : null}
          </Card>

          <Card title="Review & save" description="Diff against the saved row, then apply.">
            {diffRows.length === 0 ? (
              <p className="text-xs text-slate-500">No unsaved changes.</p>
            ) : (
              <ul className="space-y-0.5 font-mono text-xs">
                {diffRows.map((r) => (
                  <li key={r.label}>
                    <span className="font-semibold text-slate-700">{r.label}</span>
                    <span className="text-slate-400"> · {r.from} → </span>
                    <span className="font-semibold text-emerald-700">{r.to}</span>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-3">
              <ActionBar loading={loading} error={error} ok={ok}>
                <button type="button" className="btn-primary" onClick={() => void save()}>
                  Save policy
                </button>
                <button type="button" className="btn-secondary" onClick={() => void load()}>
                  Reload
                </button>
              </ActionBar>
            </div>
          </Card>
        </>
      )}
    </PageShell>
  );
}
