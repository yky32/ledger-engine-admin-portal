"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";
import { PageHeader, Card, Badge, JsonBlock, Alert } from "@/components/ui/kit";
import { ActionBar } from "@/components/ui/action";
import { FieldLabel } from "@/components/ui/help";
import { FlowStrip } from "@/components/layout/flow-strip";
import { FactorJsonEditor } from "@/components/factors/factor-json-editor";
import { AndGateGrid, Chip, StepHead } from "@/components/factors/gate-ui";
import {
  DOOR_FACTOR_PRESETS,
  EMPTY_FACTOR_GATE,
  factorsFromGate,
  gateBits,
  gateIsOpen,
  humanizeWhenFactors,
  parseAndGates,
  parseFactorJson,
  type FactorGate,
} from "@/lib/factors";
import { engine } from "@/lib/engine";
import { errMsg, clsx } from "@/lib/format";
import type { IngestPolicy } from "@/lib/types";
import { EngineStatusBanner } from "@/components/layout/engine-status-banner";

const TIPS = {
  settlement: {
    title: "Settlement currency",
    body: "Primary cash book on auto-create (e.g. HKD). Loyalty points sit on the ensure book.",
  },
  ensure: {
    title: "Ensure currency",
    body: "Second book on auto-create — almost always LP. Earn/burn posts here.",
  },
} as const;

const GATE_PRESETS: Record<string, FactorGate> = {
  demoCc: { ...EMPTY_FACTOR_GATE, mccs: "101", currencies: "HKD", ageLte: "30", amtMin: "1", eventTypes: "CC_TXN" },
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

function Choice({
  active,
  onClick,
  title,
  sub,
  tone = "emerald",
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  sub: string;
  tone?: "emerald" | "rose";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "flex-1 rounded-xl border px-4 py-3 text-left transition",
        active
          ? tone === "rose"
            ? "border-rose-300 bg-rose-50 shadow-sm"
            : "border-emerald-300 bg-emerald-50 shadow-sm"
          : "border-slate-200 bg-white hover:border-slate-300",
      )}
    >
      <div
        className={clsx(
          "text-sm font-semibold",
          active ? (tone === "rose" ? "text-rose-900" : "text-emerald-900") : "text-slate-800",
        )}
      >
        {title}
      </div>
      <div className="mt-0.5 text-[11px] leading-snug text-slate-500">{sub}</div>
    </button>
  );
}

function policySentence(p: IngestPolicy, gate: FactorGate, gatesLive: boolean): string {
  if (!p.isEnabled) return "Every webhook is SKIPPED / DISABLED. Brain never runs.";
  const who = !gatesLive
    ? "a custom FactorSet"
    : gateIsOpen(gate)
      ? "every webhook"
      : gateBits(gate)
          .filter((b) => !b.startsWith("any "))
          .join(" AND ") || "every webhook";
  const wallet = p.isAutoCreateWallet
    ? `Missing wallet → open ${p.autoWalletSettlementCurrency || "HKD"} + ${p.autoWalletEnsureCurrency || "LP"} books.`
    : "Missing wallet → NO_WALLET (CRM onboard first).";
  return `Admit ${who}. Brain scores after. ${wallet}`;
}

export default function IngestPolicyPage() {
  const [policy, setPolicy] = useState<IngestPolicy | null>(null);
  const [saved, setSaved] = useState<IngestPolicy | null>(null);
  const [entryFactorsText, setEntryFactorsText] = useState("[]");
  const [gate, setGate] = useState<FactorGate>({ ...EMPTY_FACTOR_GATE });
  const [gatesLive, setGatesLive] = useState(true);
  const [advanced, setAdvanced] = useState(false);
  const [showJson, setShowJson] = useState(false);
  const [onboardExtra, setOnboardExtra] = useState(false);
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

  const admitBits = useMemo(() => (gatesLive ? gateBits(gate) : []), [gate, gatesLive]);
  const sentence = policy ? policySentence(policy, gate, gatesLive) : "";

  return (
    <div>
      <FlowStrip active="ops" />
      <EngineStatusBanner />
      <PageHeader
        title="1 · Door — Ingest policy"
        description="First gate: accept the webhook at all? Brain scores after. One global row for the engine."
        api={[
          { method: "GET", path: "/ingest-policies" },
          { method: "PUT", path: "/ingest-policies" },
        ]}
      />

      {!policy ? (
        <ActionBar loading={loading} error={error}>
          <button type="button" className="btn-secondary" onClick={() => void load()}>
            Load
          </button>
        </ActionBar>
      ) : (
        <>
          <div
            className={clsx(
              "mb-4 flex flex-wrap items-start justify-between gap-3 rounded-2xl border px-4 py-3",
              policy.isEnabled
                ? "border-emerald-200 bg-emerald-50/70"
                : "border-rose-200 bg-rose-50/70",
            )}
          >
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={policy.isEnabled ? "ok" : "error"}>{policy.isEnabled ? "OPEN" : "CLOSED"}</Badge>
                {policy.isAutoCreateWallet ? (
                  <Badge tone="info">
                    auto-wallet {policy.autoWalletSettlementCurrency || "HKD"}+
                    {policy.autoWalletEnsureCurrency || "LP"}
                  </Badge>
                ) : (
                  <Badge tone="warn">CRM onboard required</Badge>
                )}
              </div>
              <p className="mt-1.5 max-w-2xl text-sm text-slate-700">{sentence}</p>
            </div>
            <Link href="/digestion-rules" className="text-xs font-medium text-emerald-700 hover:underline">
              Brain scores next →
            </Link>
          </div>

          <Card
            className="mb-4"
            title="Edit door"
            description="Empty gate = admit anyone. Chips write entryFactors live — no Apply."
          >
            <div className="mb-3">
              <StepHead n={1} title="Master switch" sub="Kill-switch for all inbound webhooks" tone="emerald" />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Choice
                active={!!policy.isEnabled}
                onClick={() => setPolicy({ ...policy, isEnabled: true })}
                title="Open"
                sub="Accept webhooks. Brain may score."
                tone="emerald"
              />
              <Choice
                active={!policy.isEnabled}
                onClick={() => setPolicy({ ...policy, isEnabled: false })}
                title="Closed"
                sub="SKIPPED / DISABLED — nothing lands."
                tone="rose"
              />
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
              Scoring never happens here — that is digestion rules. Off = incident kill-switch.
            </p>

            <hr className="my-5 border-slate-100" />

            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <StepHead n={2} title="Who may enter" sub="AND — skip a gate to allow any" tone="emerald" />
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  className="btn-secondary text-xs"
                  onClick={() => {
                    setGatesLive(true);
                    setGate(GATE_PRESETS.demoCc);
                  }}
                >
                  Demo CC
                </button>
                <button
                  type="button"
                  className="btn-secondary text-xs"
                  onClick={() => {
                    setGatesLive(true);
                    setGate(GATE_PRESETS.grocery);
                  }}
                >
                  Grocery
                </button>
                <button
                  type="button"
                  className="btn-secondary text-xs"
                  onClick={() => {
                    setGatesLive(true);
                    setGate(GATE_PRESETS.hkdPos);
                  }}
                >
                  HKD + POS
                </button>
                <button
                  type="button"
                  className="btn-ghost text-xs"
                  onClick={() => {
                    setGatesLive(true);
                    setGate({ ...EMPTY_FACTOR_GATE });
                  }}
                >
                  Anyone
                </button>
              </div>
            </div>

            <AndGateGrid gate={gate} onChange={patchGate} tone="emerald" />

            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Channel</div>
              <div className="mt-1 truncate font-mono text-lg font-semibold text-slate-900">
                {gate.channel?.trim() || "any"}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
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
              </div>
              <input
                className="field-input mt-2 font-mono text-xs"
                value={gate.channel ?? ""}
                onChange={(e) => patchGate({ channel: e.target.value })}
                placeholder="metadata.channel"
              />
            </div>

            <div
              className={clsx(
                "mt-3 rounded-lg px-3 py-2 text-sm font-medium",
                gatesLive ? "bg-emerald-50 text-emerald-950" : "bg-amber-50 text-amber-950",
              )}
            >
              {gatesLive ? (
                gateIsOpen(gate) ? (
                  <span>Admits every webhook — only the master switch applies.</span>
                ) : (
                  <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600">
                      Admits when
                    </span>
                    {admitBits
                      .filter((b) => !b.startsWith("any "))
                      .map((bit, i) => (
                        <span key={bit} className="inline-flex items-center gap-1.5">
                          {i > 0 ? <span className="text-[10px] font-bold text-emerald-400">AND</span> : null}
                          <span className="rounded-md bg-white px-1.5 py-0.5 font-mono text-[12px] ring-1 ring-emerald-200">
                            {bit}
                          </span>
                        </span>
                      ))}
                  </span>
                )
              ) : (
                <span>Custom FactorSet — chips paused until you pick a gate or Anyone.</span>
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

            <hr className="my-5 border-slate-100" />

            <div className="mb-3">
              <StepHead
                n={3}
                title="No wallet yet"
                sub="Only after Brain already matched"
                tone="emerald"
              />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Choice
                active={!!policy.isAutoCreateWallet}
                onClick={() => setPolicy({ ...policy, isAutoCreateWallet: true })}
                title="Create wallet"
                sub="Adopt / POS-first — same txn as earn"
                tone="emerald"
              />
              <Choice
                active={!policy.isAutoCreateWallet}
                onClick={() => setPolicy({ ...policy, isAutoCreateWallet: false })}
                title="CRM must onboard"
                sub="Fail NO_WALLET until POST /wallets"
                tone="rose"
              />
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
              Junk events never open wallets — digestion has to match first.
            </p>

            {policy.isAutoCreateWallet ? (
              <div className="mt-3 rounded-xl border border-emerald-200/70 bg-emerald-50/40 p-3">
                <p className="font-mono text-sm font-semibold text-emerald-900">
                  {(policy.autoWalletNamePrefix || "") + "01A…"} → {policy.autoWalletSettlementCurrency || "HKD"} cash +{" "}
                  {policy.autoWalletEnsureCurrency || "LP"} points
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <FieldLabel tipTitle={TIPS.settlement.title} tip={TIPS.settlement.body}>
                      Settlement (cash)
                    </FieldLabel>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
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
                    </div>
                    <input
                      className="field-input mt-2 font-mono text-xs"
                      value={String(policy.autoWalletSettlementCurrency ?? "")}
                      onChange={(e) =>
                        setPolicy({
                          ...policy,
                          autoWalletSettlementCurrency: e.target.value.toUpperCase(),
                        })
                      }
                      placeholder="HKD"
                    />
                  </div>
                  <div>
                    <FieldLabel tipTitle={TIPS.ensure.title} tip={TIPS.ensure.body}>
                      Ensure (points)
                    </FieldLabel>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
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
                    </div>
                    <input
                      className="field-input mt-2 font-mono text-xs"
                      value={String(policy.autoWalletEnsureCurrency ?? "")}
                      onChange={(e) =>
                        setPolicy({
                          ...policy,
                          autoWalletEnsureCurrency: e.target.value.toUpperCase(),
                        })
                      }
                      placeholder="LP"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800/70 hover:text-emerald-950"
                  onClick={() => setOnboardExtra((v) => !v)}
                >
                  {onboardExtra ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  Name, source label, COA
                </button>
                {onboardExtra ? (
                  <div className="mt-2 grid gap-2.5 sm:grid-cols-3">
                    <label className="field">
                      <span className="field-label">name prefix</span>
                      <input
                        className="field-input text-xs"
                        value={String(policy.autoWalletNamePrefix ?? "")}
                        onChange={(e) => setPolicy({ ...policy, autoWalletNamePrefix: e.target.value })}
                        placeholder="Demo "
                      />
                    </label>
                    <label className="field">
                      <span className="field-label">associatedFrom</span>
                      <input
                        className="field-input text-xs"
                        value={String(policy.autoWalletAssociatedFrom ?? "")}
                        onChange={(e) => setPolicy({ ...policy, autoWalletAssociatedFrom: e.target.value })}
                        placeholder="POS"
                      />
                    </label>
                    <label className="field">
                      <span className="field-label">COA on auto-create</span>
                      <input
                        className="field-input font-mono text-xs"
                        value={String(policy.autoWalletCoaProfileCode ?? "")}
                        onChange={(e) => setPolicy({ ...policy, autoWalletCoaProfileCode: e.target.value })}
                        placeholder="MEMBER_CUST_LP"
                      />
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {["MEMBER_CUST_LP", "MEMBER_CUST_HKD"].map((c) => (
                          <Chip
                            key={c}
                            tone="emerald"
                            active={policy.autoWalletCoaProfileCode === c}
                            onClick={() => setPolicy({ ...policy, autoWalletCoaProfileCode: c })}
                          >
                            {c}
                          </Chip>
                        ))}
                      </div>
                    </label>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="mt-4">
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

          <Card
            title="In engine"
            description="Last saved GET /ingest-policies — live after Save"
            right={
              <span className="font-mono text-[11px] text-slate-500">
                {humanizeWhenFactors((saved ?? policy).entryFactors)}
              </span>
            }
          >
            <div className="flex flex-wrap gap-1.5">
              <Badge tone={(saved ?? policy).isEnabled ? "ok" : "error"}>
                {(saved ?? policy).isEnabled ? "isEnabled" : "disabled"}
              </Badge>
              <Badge tone={(saved ?? policy).isAutoCreateWallet ? "info" : "neutral"}>
                {(saved ?? policy).isAutoCreateWallet ? "auto-wallet" : "no auto-wallet"}
              </Badge>
              {(saved ?? policy).autoWalletSettlementCurrency ? (
                <span className="rounded-md bg-slate-50 px-1.5 py-0.5 font-mono text-[11px] text-slate-700 ring-1 ring-slate-200">
                  {(saved ?? policy).autoWalletSettlementCurrency} + {(saved ?? policy).autoWalletEnsureCurrency || "—"}
                </span>
              ) : null}
            </div>
            <button
              type="button"
              className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-800"
              onClick={() => setShowJson((v) => !v)}
            >
              {showJson ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              DB JSON
            </button>
            {showJson ? (
              <div className="mt-2">
                <JsonBlock value={saved ?? policy} maxHeight={240} />
              </div>
            ) : null}
            <Alert tone="info">
              Pair with{" "}
              <Link href="/digestion-rules" className="underline">
                Brain rules
              </Link>{" "}
              then{" "}
              <Link href="/simulator" className="underline">
                shoot
              </Link>
              .{" "}
              <Link href="/records" className="underline">
                All DB records →
              </Link>
            </Alert>
          </Card>
        </>
      )}
    </div>
  );
}
