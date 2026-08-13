"use client";

/**
 * LedgeRX multi-customer txn simulator
 * - N upstream customers
 * - Each customer: own matrix (eventType × ccy × amount × age × repeats)
 * - Global bootstrap once; then per-customer onboard → webhooks → optional hold/dupe/snapshot
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader, Card, Badge, JsonBlock, Alert, Empty } from "@/components/ui/kit";
import { engine } from "@/lib/engine";
import { errMsg, nowIso, randomEventId, randomOwnerId, clsx, isConflictError } from "@/lib/format";
import { FlowStrip } from "@/components/layout/flow-strip";
import { ExplainBox } from "@/components/ui/help";
import { Plus, Copy, Trash2, Users } from "lucide-react";
import { EngineStatusBanner } from "@/components/layout/engine-status-banner";

/* ───────── types ───────── */

type StepKind =
  | "bootstrap-rule"
  | "bootstrap-policy"
  | "onboard"
  | "webhook"
  | "dupe"
  | "hold"
  | "release"
  | "snapshot"
  | "legs"
  | "customer-start"
  | "customer-end";

type StepResult = {
  i: number;
  kind: StepKind;
  customerId?: string;
  ownerId?: string;
  name: string;
  ok: boolean;
  ms: number;
  detail?: string;
  expect?: string;
  data?: unknown;
};

type WebhookCase = {
  id: string;
  label: string;
  eventType: string;
  amount: number;
  currency: string;
  ageDays: number;
  /** empty = omit metadata.mcc */
  mcc: string;
  tag: string;
  enabled: boolean;
};

type DimConfig = {
  eventTypes: { value: string; on: boolean }[];
  currencies: { value: string; on: boolean }[];
  amounts: { value: number; label: string; on: boolean }[];
  ages: { days: number; label: string; on: boolean }[];
  mccs: { value: string; label: string; on: boolean }[];
  repeats: number;
};

type SimCustomer = {
  id: string;
  enabled: boolean;
  label: string;
  ownerId: string;
  displayName: string;
  settlement: string;
  vanityCode: string;
  extraLp: boolean;
  preset: PresetKey;
  dims: DimConfig;
  /** caseId → enabled override */
  caseOverrides: Record<string, boolean>;
  doOnboard: boolean;
  fireDuplicateFirst: boolean;
  doHoldRelease: boolean;
  holdCurrency: string;
  holdAmountsCsv: string;
  snapshotEnd: boolean;
  fetchLegsAfter: boolean;
};

const PRESET_KEYS = [
  "smoke",
  "ccy-matrix",
  "amount-gates",
  "age-gates",
  "mcc-matrix",
  "event-mix",
  "stress",
  "full-cartesian",
  "hold-flow",
  "custom",
] as const;
type PresetKey = (typeof PRESET_KEYS)[number];

const PRESET_LABEL: Record<PresetKey, string> = {
  smoke: "Smoke — 1 purchase HKD",
  "ccy-matrix": "Currency matrix",
  "amount-gates": "Amount gates",
  "age-gates": "Age gates",
  "mcc-matrix": "MCC matrix (5411 / 5812 / none)",
  "event-mix": "Event mix",
  stress: "Stress 3×",
  "full-cartesian": "Full cartesian",
  "hold-flow": "Hold-flow seed",
  custom: "Custom",
};

function defaultDims(): DimConfig {
  return {
    eventTypes: [
      { value: "PURCHASE", on: true },
      { value: "REDEEM", on: false },
      { value: "SIGNUP", on: false },
      { value: "REFUND", on: false },
      { value: "CARD_OPEN", on: false },
      { value: "ADJUSTMENT", on: false },
    ],
    currencies: [
      { value: "HKD", on: true },
      { value: "USD", on: true },
      { value: "JPY", on: false },
      { value: "CNY", on: false },
      { value: "LP", on: false },
    ],
    amounts: [
      { value: 0, label: "0", on: false },
      { value: 1, label: "1", on: false },
      { value: 50, label: "50", on: true },
      { value: 200, label: "200", on: true },
      { value: 9999, label: "9999", on: false },
    ],
    ages: [
      { days: 0, label: "now", on: true },
      { days: 30, label: "30d", on: false },
      { days: 365, label: "365d", on: false },
      { days: 800, label: "800d", on: false },
    ],
    mccs: [
      { value: "", label: "(no mcc)", on: true },
      { value: "5411", label: "5411 grocery", on: false },
      { value: "5812", label: "5812 restaurant", on: false },
      { value: "6011", label: "6011 ATM", on: false },
    ],
    repeats: 1,
  };
}

function applyPreset(key: PresetKey): DimConfig {
  const d = defaultDims();
  const offAll = () => {
    d.eventTypes.forEach((x) => (x.on = false));
    d.currencies.forEach((x) => (x.on = false));
    d.amounts.forEach((x) => (x.on = false));
    d.ages.forEach((x) => (x.on = false));
    d.mccs.forEach((x) => (x.on = false));
  };
  switch (key) {
    case "smoke":
      offAll();
      d.eventTypes.find((x) => x.value === "PURCHASE")!.on = true;
      d.currencies.find((x) => x.value === "HKD")!.on = true;
      d.amounts.find((x) => x.value === 200)!.on = true;
      d.ages.find((x) => x.days === 0)!.on = true;
      d.mccs.find((x) => x.value === "")!.on = true;
      break;
    case "ccy-matrix":
      offAll();
      d.eventTypes.find((x) => x.value === "PURCHASE")!.on = true;
      ["HKD", "USD", "JPY", "CNY"].forEach((c) => {
        const row = d.currencies.find((x) => x.value === c);
        if (row) row.on = true;
        else d.currencies.push({ value: c, on: true });
      });
      d.amounts.find((x) => x.value === 200)!.on = true;
      d.ages.find((x) => x.days === 0)!.on = true;
      break;
    case "amount-gates":
      offAll();
      d.eventTypes.find((x) => x.value === "PURCHASE")!.on = true;
      d.currencies.find((x) => x.value === "HKD")!.on = true;
      d.amounts.forEach((x) => (x.on = true));
      d.ages.find((x) => x.days === 0)!.on = true;
      break;
    case "age-gates":
      offAll();
      d.eventTypes.find((x) => x.value === "PURCHASE")!.on = true;
      d.currencies.find((x) => x.value === "HKD")!.on = true;
      d.amounts.find((x) => x.value === 200)!.on = true;
      d.ages.forEach((x) => (x.on = true));
      break;
    case "mcc-matrix":
      offAll();
      d.eventTypes.find((x) => x.value === "PURCHASE")!.on = true;
      d.currencies.find((x) => x.value === "HKD")!.on = true;
      d.amounts.find((x) => x.value === 200)!.on = true;
      d.ages.find((x) => x.days === 0)!.on = true;
      d.mccs.forEach((x) => {
        x.on = true;
      });
      break;
    case "event-mix":
      offAll();
      d.eventTypes.forEach((x) => {
        if (["PURCHASE", "REDEEM", "SIGNUP", "REFUND", "CARD_OPEN"].includes(x.value)) x.on = true;
      });
      d.currencies.find((x) => x.value === "HKD")!.on = true;
      d.amounts.forEach((x) => {
        x.on = x.value === 50 || x.value === 200;
      });
      d.ages.find((x) => x.days === 0)!.on = true;
      break;
    case "stress":
      offAll();
      d.eventTypes.find((x) => x.value === "PURCHASE")!.on = true;
      ["HKD", "USD", "JPY"].forEach((c) => {
        const row = d.currencies.find((x) => x.value === c);
        if (row) row.on = true;
      });
      [50, 200, 9999].forEach((a) => {
        const row = d.amounts.find((x) => x.value === a);
        if (row) row.on = true;
      });
      d.ages.find((x) => x.days === 0)!.on = true;
      d.repeats = 3;
      break;
    case "full-cartesian":
      d.eventTypes.forEach((x) => {
        x.on = ["PURCHASE", "REDEEM", "SIGNUP"].includes(x.value);
      });
      d.currencies.forEach((x) => {
        x.on = ["HKD", "USD", "JPY"].includes(x.value);
      });
      d.amounts.forEach((x) => {
        x.on = [1, 50, 200].includes(x.value);
      });
      d.ages.forEach((x) => {
        x.on = [0, 365].includes(x.days);
      });
      break;
    case "hold-flow":
      offAll();
      d.eventTypes.find((x) => x.value === "PURCHASE")!.on = true;
      d.currencies.find((x) => x.value === "HKD")!.on = true;
      d.amounts.find((x) => x.value === 200)!.on = true;
      d.ages.find((x) => x.days === 0)!.on = true;
      break;
    default:
      break;
  }
  if (!d.mccs.some((x) => x.on)) {
    const none = d.mccs.find((x) => x.value === "");
    if (none) none.on = true;
  }
  return d;
}

function cartesian(dims: DimConfig): WebhookCase[] {
  const ets = dims.eventTypes.filter((x) => x.on).map((x) => x.value);
  const ccy = dims.currencies.filter((x) => x.on).map((x) => x.value);
  const amts = dims.amounts.filter((x) => x.on);
  const ages = dims.ages.filter((x) => x.on);
  const mccs = dims.mccs.filter((x) => x.on);
  const mccList = mccs.length ? mccs : [{ value: "", label: "(no mcc)", on: true }];
  const reps = Math.max(1, Math.min(20, dims.repeats || 1));
  const out: WebhookCase[] = [];
  for (let r = 0; r < reps; r++) {
    for (const et of ets) {
      for (const c of ccy) {
        for (const a of amts) {
          for (const age of ages) {
            for (const m of mccList) {
              const mccTag = m.value || "nomcc";
              const id = `${et}-${c}-${a.value}-${age.days}d-${mccTag}-r${r + 1}`;
              out.push({
                id,
                label: `${et} ${a.label} ${c} · ${age.label}${m.value ? ` · mcc ${m.value}` : ""}${reps > 1 ? ` · #${r + 1}` : ""}`,
                eventType: et,
                amount: a.value,
                currency: c,
                ageDays: age.days,
                mcc: m.value || "",
                tag: `r${r + 1}`,
                enabled: true,
              });
            }
          }
        }
      }
    }
  }
  return out;
}

function casesForCustomer(c: SimCustomer): WebhookCase[] {
  return cartesian(c.dims).map((wc) => ({
    ...wc,
    enabled: c.caseOverrides[wc.id] ?? wc.enabled,
  }));
}

function occurredAtForAge(days: number): string {
  if (!days) return nowIso();
  return new Date(Date.now() - days * 864e5).toISOString();
}

function guessExpect(c: WebhookCase): string {
  if (c.eventType === "REDEEM" && c.currency !== "LP") return "maybe skip (burn ccy)";
  if (c.ageDays >= 400) return "maybe age-gate";
  if (c.amount === 0) return "maybe min-amount";
  if (c.mcc) return "earn if mcc/rule matches";
  if (c.eventType === "PURCHASE") return "earn if rule matches";
  if (c.eventType === "CARD_OPEN" || c.eventType === "SIGNUP") return "fixed bonus if rule";
  return "depends on digestion";
}

function newCustomer(n: number, preset: PresetKey = "smoke"): SimCustomer {
  const oid = randomOwnerId();
  return {
    id: `cust-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    enabled: true,
    label: `Customer ${n}`,
    ownerId: oid,
    displayName: `Sim C${n}`,
    settlement: "HKD",
    vanityCode: "",
    extraLp: true,
    preset,
    dims: applyPreset(preset),
    caseOverrides: {},
    doOnboard: true,
    fireDuplicateFirst: false,
    doHoldRelease: preset === "hold-flow",
    holdCurrency: "LP",
    holdAmountsCsv: "1,5",
    snapshotEnd: true,
    fetchLegsAfter: true,
  };
}

function cloneCustomer(c: SimCustomer, n: number): SimCustomer {
  return {
    ...structuredClone(c),
    id: `cust-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    label: `${c.label} copy`,
    ownerId: randomOwnerId(),
    displayName: `Sim C${n}`,
    caseOverrides: {},
  };
}

function parseHoldAmounts(csv: string): number[] {
  return csv
    .split(/[,\s]+/)
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n) && n > 0);
}

/* ───────── page ───────── */

export default function SimulatorPage() {
  const [customers, setCustomers] = useState<SimCustomer[]>(() => [
    newCustomer(1, "ccy-matrix"),
    newCustomer(2, "smoke"),
  ]);
  const [activeId, setActiveId] = useState<string>("");
  const active =
    customers.find((c) => c.id === (activeId || customers[0]?.id)) || customers[0];

  const [globalOpts, setGlobalOpts] = useState({
    seedPurchaseRule: true,
    seedIngestPolicy: true,
    skipOnboardIfExists: true,
    delayMs: 0,
    stopOnError: false,
    policySettlement: "HKD",
  });

  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [log, setLog] = useState<StepResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "ok" | "fail">("all");
  const [logCustomer, setLogCustomer] = useState<string>("all");

  // ensure activeId
  useEffect(() => {
    if (!activeId && customers[0]) setActiveId(customers[0].id);
  }, [activeId, customers]);

  const planSummary = useMemo(() => {
    return customers
      .filter((c) => c.enabled)
      .map((c) => {
        const cases = casesForCustomer(c).filter((x) => x.enabled);
        return { c, cases, n: cases.length };
      });
  }, [customers]);

  const totalWebhooks = planSummary.reduce((s, p) => s + p.n, 0);
  const enabledCustomers = planSummary.length;

  const updateActive = (patch: Partial<SimCustomer>) => {
    if (!active) return;
    setCustomers((list) => list.map((c) => (c.id === active.id ? { ...c, ...patch } : c)));
  };

  const setActiveDims = (dims: DimConfig) => updateActive({ dims, caseOverrides: {} });

  const runAll = useCallback(async () => {
    setRunning(true);
    setError(null);
    setLog([]);
    setProgress(0);

    const steps: StepResult[] = [];
    let i = 0;
    const push = (s: Omit<StepResult, "i">) => {
      const row = { ...s, i: i++ };
      steps.push(row);
      setLog([...steps]);
      return row;
    };
    const timed = async <T,>(
      fn: () => Promise<T>,
    ): Promise<{ ok: true; v: T; ms: number } | { ok: false; e: unknown; ms: number }> => {
      const t0 = performance.now();
      try {
        const v = await fn();
        return { ok: true, v, ms: Math.round(performance.now() - t0) };
      } catch (e) {
        return { ok: false, e, ms: Math.round(performance.now() - t0) };
      }
    };
    const sleep = (ms: number) =>
      ms > 0 ? new Promise((r) => setTimeout(r, ms)) : Promise.resolve();

    const roster = customers.filter((c) => c.enabled && c.ownerId.trim());
    const plans = roster.map((c) => ({
      c,
      cases: casesForCustomer(c).filter((x) => x.enabled),
    }));

    let totalUnits =
      (globalOpts.seedPurchaseRule ? 1 : 0) + (globalOpts.seedIngestPolicy ? 1 : 0);
    for (const p of plans) {
      totalUnits += 1; // customer-start
      if (p.c.doOnboard) totalUnits += 1;
      totalUnits += p.cases.length;
      if (p.c.fireDuplicateFirst && p.cases.length) totalUnits += 1;
      if (p.c.doHoldRelease) totalUnits += parseHoldAmounts(p.c.holdAmountsCsv).length * 2;
      if (p.c.snapshotEnd) totalUnits += 1;
      totalUnits += 1; // customer-end
    }
    let doneUnits = 0;
    const tick = () => {
      doneUnits++;
      setProgress(Math.min(100, Math.round((doneUnits / Math.max(1, totalUnits)) * 100)));
    };

    try {
      if (globalOpts.seedPurchaseRule) {
        const t = await timed(() =>
          engine.digestionCreate({
            code: "SIM_PURCHASE_DEFAULT",
            name: "Sim purchase earn 1%",
            eventType: "PURCHASE",
            operation: "EARN",
            formula: { type: "RATE", rate: 0.01 },
            pointCurrency: "LP",
            priority: 50,
            minAmount: 0,
            eligibleCurrencies: ["HKD", "USD", "JPY", "CNY"],
            isEnabled: true,
          }),
        );
        const ok = t.ok || isConflictError((t as { e: unknown }).e) || errMsg((t as { e?: unknown }).e || "").toLowerCase().includes("exist");
        push({
          kind: "bootstrap-rule",
          name: "seed digestion SIM_PURCHASE_DEFAULT (+ REDEEM/CARD_OPEN try)",
          ok,
          ms: t.ms,
          detail: t.ok ? "created/ok" : errMsg((t as { e: unknown }).e),
          data: t.ok ? t.v.data : undefined,
        });
        await engine
          .digestionCreate({
            code: "SIM_REDEEM_BURN",
            name: "Sim redeem burn",
            eventType: "REDEEM",
            operation: "BURN",
            formula: { type: "AMOUNT" },
            pointCurrency: "LP",
            priority: 50,
            minAmount: 0,
            isEnabled: true,
          })
          .catch(() => null);
        await engine
          .digestionCreate({
            code: "SIM_CARD_OPEN",
            name: "Sim card open fixed",
            eventType: "CARD_OPEN",
            operation: "EARN",
            formula: { type: "FIXED", value: 1000 },
            pointCurrency: "LP",
            priority: 40,
            minAmount: 0,
            isEnabled: true,
          })
          .catch(() => null);
        await engine
          .digestionCreate({
            code: "SIM_SIGNUP",
            name: "Sim signup fixed",
            eventType: "SIGNUP",
            operation: "EARN",
            formula: { type: "FIXED", value: 100 },
            pointCurrency: "LP",
            priority: 40,
            minAmount: 0,
            isEnabled: true,
          })
          .catch(() => null);
        tick();
      }

      if (globalOpts.seedIngestPolicy) {
        const t = await timed(() =>
          engine.ingestPolicyPut({
            isEnabled: true,
            isAutoCreateWallet: true,
            autoWalletSettlementCurrency: globalOpts.policySettlement,
            autoWalletEnsureCurrency: "LP",
            autoWalletNamePrefix: "Sim ",
          }),
        );
        push({
          kind: "bootstrap-policy",
          name: "seed ingest policy (Door)",
          ok: t.ok,
          ms: t.ms,
          detail: t.ok ? "enabled + auto wallet" : errMsg((t as { e: unknown }).e),
          data: t.ok ? t.v.data : undefined,
        });
        if (!t.ok && globalOpts.stopOnError) throw (t as { e: unknown }).e;
        tick();
      }

      let lastOid = "";

      for (const { c, cases } of plans) {
        const oid = c.ownerId.trim();
        lastOid = oid;
        push({
          kind: "customer-start",
          customerId: c.id,
          ownerId: oid,
          name: `▶ ${c.label} · ${oid}`,
          ok: true,
          ms: 0,
          detail: `${cases.length} webhooks · preset ${c.preset}`,
        });
        tick();

        if (c.doOnboard) {
          const t = await timed(() =>
            engine.onboardWallet({
              ownerId: oid,
              settlementCurrency: c.settlement,
              name: c.displayName,
              vanityCode: c.vanityCode.trim() || undefined,
              accounts: c.extraLp ? [{ currency: "LP" }] : undefined,
            }),
          );
          const msg = t.ok ? "created" : errMsg((t as { e: unknown }).e);
          const exists = !t.ok && isConflictError((t as { e: unknown }).e);
          const ok = t.ok || (globalOpts.skipOnboardIfExists && exists);
          push({
            kind: "onboard",
            customerId: c.id,
            ownerId: oid,
            name: `onboard ${oid}`,
            ok,
            ms: t.ms,
            detail: msg,
            data: t.ok ? t.v.data : undefined,
          });
          if (!ok && globalOpts.stopOnError) throw (t as { e: unknown }).e;
          tick();
        }

        let firstBody: Record<string, unknown> | null = null;

        for (const wc of cases) {
          const eventId = randomEventId(
            `${c.label.slice(0, 4)}-${wc.eventType.slice(0, 3)}-${wc.currency}-${wc.amount}`,
          );
          const body: Record<string, unknown> = {
            eventId,
            ownerId: oid,
            eventType: wc.eventType,
            amount: wc.amount,
            currency: wc.currency,
            occurredAt: occurredAtForAge(wc.ageDays),
            metadata: {
              source: "ledgerx-simulator-multi",
              customerLabel: c.label,
              tag: wc.tag,
              caseId: wc.id,
              ageDays: String(wc.ageDays),
              ...(wc.mcc ? { mcc: wc.mcc } : {}),
            },
          };
          if (!firstBody) firstBody = body;

          const t = await timed(() => engine.webhookTxn(body));
          const data = t.ok && t.v.data && typeof t.v.data === "object" ? (t.v.data as Record<string, unknown>) : undefined;
          const status = data && "status" in data ? String(data.status) : undefined;
          const rule = data && data.matchedRuleCode != null ? String(data.matchedRuleCode) : "";
          const pts = data && data.points != null ? String(data.points) : "";
          const trace = Array.isArray(data?.eligibilityTrace) ? (data!.eligibilityTrace as { failStep?: string }[]) : [];
          const failStep = trace.find((x) => x.failStep)?.failStep;
          const detailOk = [status, rule && `rule=${rule}`, pts && `pts=${pts}`, failStep && `fail=${failStep}`]
            .filter(Boolean)
            .join(" · ");
          push({
            kind: "webhook",
            customerId: c.id,
            ownerId: oid,
            name: `${c.label} · ${wc.label}`,
            ok: t.ok,
            ms: t.ms,
            expect: guessExpect(wc),
            detail: t.ok ? detailOk || "ok" : errMsg((t as { e: unknown }).e),
            data: t.ok ? t.v.data : undefined,
          });

          if (t.ok && c.fetchLegsAfter && status && /EARN|BURN/i.test(status)) {
            const legs = await timed(() => engine.legs({ eventId }));
            if (legs.ok) {
              push({
                kind: "legs",
                customerId: c.id,
                ownerId: oid,
                name: `legs · ${eventId.slice(0, 16)}…`,
                ok: true,
                ms: legs.ms,
                detail: `count=${Array.isArray(legs.v.data) ? legs.v.data.length : "?"}`,
                data: legs.v.data,
              });
            }
          }

          if (!t.ok && globalOpts.stopOnError) throw (t as { e: unknown }).e;
          tick();
          await sleep(globalOpts.delayMs);
        }

        if (c.fireDuplicateFirst && firstBody) {
          const t = await timed(() => engine.webhookTxn(firstBody!));
          push({
            kind: "dupe",
            customerId: c.id,
            ownerId: oid,
            name: `${c.label} · duplicate first eventId`,
            ok: t.ok,
            ms: t.ms,
            expect: "DUPLICATE",
            detail: t.ok
              ? String((t.v.data as { status?: string })?.status || "ok")
              : errMsg((t as { e: unknown }).e),
            data: t.ok ? t.v.data : undefined,
          });
          tick();
        }

        if (c.doHoldRelease) {
          for (const amt of parseHoldAmounts(c.holdAmountsCsv)) {
            const ht = await timed(() =>
              engine.hold({
                ownerId: oid,
                currency: c.holdCurrency,
                amount: amt,
                description: `sim-hold-${c.label}-${amt}`,
              }),
            );
            push({
              kind: "hold",
              customerId: c.id,
              ownerId: oid,
              name: `${c.label} · HOLD ${amt} ${c.holdCurrency}`,
              ok: ht.ok,
              ms: ht.ms,
              detail: ht.ok ? "held" : errMsg((ht as { e: unknown }).e),
              data: ht.ok ? ht.v.data : undefined,
            });
            tick();
            const rt = await timed(() =>
              engine.release({
                ownerId: oid,
                currency: c.holdCurrency,
                amount: amt,
                description: `sim-release-${c.label}-${amt}`,
              }),
            );
            push({
              kind: "release",
              customerId: c.id,
              ownerId: oid,
              name: `${c.label} · RELEASE ${amt} ${c.holdCurrency}`,
              ok: rt.ok,
              ms: rt.ms,
              detail: rt.ok ? "released" : errMsg((rt as { e: unknown }).e),
              data: rt.ok ? rt.v.data : undefined,
            });
            tick();
          }
        }

        if (c.snapshotEnd) {
          const t = await timed(() => engine.getWallet(oid));
          push({
            kind: "snapshot",
            customerId: c.id,
            ownerId: oid,
            name: `${c.label} · wallet snapshot`,
            ok: t.ok,
            ms: t.ms,
            detail: t.ok ? "loaded" : errMsg((t as { e: unknown }).e),
            data: t.ok ? t.v.data : undefined,
          });
          tick();
        }

        push({
          kind: "customer-end",
          customerId: c.id,
          ownerId: oid,
          name: `■ ${c.label} done`,
          ok: true,
          ms: 0,
          detail: `${cases.length} cases`,
        });
        tick();
      }

      if (lastOid) {
        try {
          sessionStorage.setItem("review.ownerId", lastOid);
        } catch {
          /* */
        }
      }
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setRunning(false);
      setProgress(100);
    }
  }, [customers, globalOpts]);

  const filtered = log.filter((l) => {
    if (logCustomer !== "all" && l.ownerId && l.ownerId !== logCustomer && l.kind !== "bootstrap-rule" && l.kind !== "bootstrap-policy") {
      if (l.customerId !== logCustomer && l.ownerId !== logCustomer) return false;
    }
    if (filter === "ok") return l.ok;
    if (filter === "fail") return !l.ok;
    return true;
  });

  const passed = log.filter((l) => l.ok).length;
  const failed = log.filter((l) => !l.ok).length;

  const activeCases = active ? casesForCustomer(active) : [];
  const activeEnabled = activeCases.filter((c) => c.enabled).length;

  return (
    <div>
      <FlowStrip active="shoot" />
      <EngineStatusBanner />
      <PageHeader
        title="Txn simulator"
        description="Multi-customer upstream · each customer has its own transaction matrix (eventType × ccy × amount × age × repeats)."
        actions={
          <Link href="/review" className="btn-secondary text-xs">
            Customer review →
          </Link>
        }
      />

      <div className="mb-4 grid gap-3 lg:grid-cols-3">
        <ExplainBox title="Multi-customer" tone="ops">
          <p>
            Add several upstream members (different <code className="text-xs">ownerId</code>).
            LedgeRX still runs full Door → Brain → Books per event.
          </p>
        </ExplainBox>
        <ExplainBox title="Per-customer matrix">
          <p>
            Each customer has independent dims + onboard/hold options. Run fires all enabled
            customers sequentially.
          </p>
        </ExplainBox>
        <ExplainBox title="Plan" tone="info">
          <p className="font-mono text-sm">
            {enabledCustomers} customers · {totalWebhooks} webhooks planned
          </p>
        </ExplainBox>
      </div>

      <div className="mb-4 grid gap-4 xl:grid-cols-12">
        {/* roster */}
        <Card
          title="Upstream customers"
          description="Roster — click to edit matrix"
          className="xl:col-span-3"
        >
          <div className="mb-2 flex flex-wrap gap-1.5">
            <button
              type="button"
              className="btn-primary text-xs"
              onClick={() => {
                const n = customers.length + 1;
                const c = newCustomer(n, "smoke");
                setCustomers((list) => [...list, c]);
                setActiveId(c.id);
              }}
            >
              <Plus className="mr-1 inline h-3.5 w-3.5" />
              Add
            </button>
            <button
              type="button"
              className="btn-secondary text-xs"
              disabled={!active}
              onClick={() => {
                if (!active) return;
                const c = cloneCustomer(active, customers.length + 1);
                setCustomers((list) => [...list, c]);
                setActiveId(c.id);
              }}
            >
              <Copy className="mr-1 inline h-3.5 w-3.5" />
              Dup
            </button>
            <button
              type="button"
              className="btn-secondary text-xs"
              onClick={() => {
                // bulk: 3 cardholders with different presets
                const batch = [
                  newCustomer(customers.length + 1, "ccy-matrix"),
                  newCustomer(customers.length + 2, "amount-gates"),
                  newCustomer(customers.length + 3, "event-mix"),
                ];
                batch[0].label = "HK retail";
                batch[1].label = "Amount probe";
                batch[2].label = "Event mix";
                setCustomers((list) => [...list, ...batch]);
                setActiveId(batch[0].id);
              }}
            >
              <Users className="mr-1 inline h-3.5 w-3.5" />
              +3 pack
            </button>
          </div>
          <ul className="max-h-[420px] space-y-1 overflow-auto">
            {customers.map((c) => {
              const n = casesForCustomer(c).filter((x) => x.enabled).length;
              const selected = active?.id === c.id;
              return (
                <li key={c.id}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setActiveId(c.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setActiveId(c.id);
                      }
                    }}
                    className={clsx(
                      "flex w-full cursor-pointer items-start gap-2 rounded-xl border px-2.5 py-2 text-left text-xs transition",
                      selected
                        ? "border-emerald-400 bg-emerald-50 ring-1 ring-emerald-200"
                        : "border-slate-200 bg-white hover:bg-slate-50",
                      !c.enabled && "opacity-50",
                    )}
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={c.enabled}
                      onChange={(e) => {
                        e.stopPropagation();
                        setCustomers((list) =>
                          list.map((x) =>
                            x.id === c.id ? { ...x, enabled: e.target.checked } : x,
                          ),
                        );
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-slate-800">{c.label}</span>
                      <span className="block truncate font-mono text-[10px] text-slate-500">
                        {c.ownerId}
                      </span>
                      <span className="mt-0.5 block text-[10px] text-slate-400">
                        {c.preset} · {n} txns
                      </span>
                    </span>
                    <button
                      type="button"
                      className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      title="Remove"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCustomers((list) => {
                          const next = list.filter((x) => x.id !== c.id);
                          if (activeId === c.id) setActiveId(next[0]?.id || "");
                          return next.length ? next : [newCustomer(1, "smoke")];
                        });
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>

        {/* active customer editor */}
        <div className="space-y-4 xl:col-span-5">
          {active ? (
            <>
              <Card title={`${active.label} — identity`} description="Upstream member for this matrix">
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="field">
                    <span className="field-label">label</span>
                    <input
                      className="field-input"
                      value={active.label}
                      onChange={(e) => updateActive({ label: e.target.value })}
                    />
                  </label>
                  <label className="field">
                    <span className="field-label">display name</span>
                    <input
                      className="field-input"
                      value={active.displayName}
                      onChange={(e) => updateActive({ displayName: e.target.value })}
                    />
                  </label>
                  <label className="field sm:col-span-2">
                    <span className="field-label">ownerId</span>
                    <div className="flex gap-2">
                      <input
                        className="field-input font-mono text-xs"
                        value={active.ownerId}
                        onChange={(e) => updateActive({ ownerId: e.target.value })}
                      />
                      <button
                        type="button"
                        className="btn-secondary shrink-0 text-xs"
                        onClick={() => updateActive({ ownerId: randomOwnerId() })}
                      >
                        regen
                      </button>
                    </div>
                  </label>
                  <label className="field">
                    <span className="field-label">settlement</span>
                    <select
                      className="field-select"
                      value={active.settlement}
                      onChange={(e) => updateActive({ settlement: e.target.value })}
                    >
                      {["HKD", "USD", "CNY", "JPY", "LP"].map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span className="field-label">vanityCode</span>
                    <input
                      className="field-input font-mono text-xs"
                      value={active.vanityCode}
                      onChange={(e) => updateActive({ vanityCode: e.target.value })}
                    />
                  </label>
                  <label className="flex items-center gap-2 text-sm sm:col-span-2">
                    <input
                      type="checkbox"
                      checked={active.extraLp}
                      onChange={(e) => updateActive({ extraLp: e.target.checked })}
                    />
                    Open LP book on onboard
                  </label>
                </div>
              </Card>

              <Card title="Matrix dims" description="Cartesian product for this customer only">
                <label className="field mb-3">
                  <span className="field-label">preset</span>
                  <select
                    className="field-select"
                    value={active.preset}
                    onChange={(e) => {
                      const preset = e.target.value as PresetKey;
                      updateActive({
                        preset,
                        dims: applyPreset(preset),
                        caseOverrides: {},
                        doHoldRelease: preset === "hold-flow",
                      });
                    }}
                  >
                    {PRESET_KEYS.map((k) => (
                      <option key={k} value={k}>
                        {PRESET_LABEL[k]}
                      </option>
                    ))}
                  </select>
                </label>

                <DimGroup
                  title="eventType"
                  items={active.dims.eventTypes.map((x) => ({
                    key: x.value,
                    label: x.value,
                    on: x.on,
                    toggle: () =>
                      setActiveDims({
                        ...active.dims,
                        eventTypes: active.dims.eventTypes.map((r) =>
                          r.value === x.value ? { ...r, on: !r.on } : r,
                        ),
                      }),
                  }))}
                  onAdd={() => {
                    const v = window.prompt("eventType");
                    if (!v?.trim()) return;
                    setActiveDims({
                      ...active.dims,
                      eventTypes: [
                        ...active.dims.eventTypes,
                        { value: v.trim().toUpperCase(), on: true },
                      ],
                    });
                  }}
                />
                <DimGroup
                  title="currency"
                  items={active.dims.currencies.map((x) => ({
                    key: x.value,
                    label: x.value,
                    on: x.on,
                    toggle: () =>
                      setActiveDims({
                        ...active.dims,
                        currencies: active.dims.currencies.map((r) =>
                          r.value === x.value ? { ...r, on: !r.on } : r,
                        ),
                      }),
                  }))}
                  onAdd={() => {
                    const v = window.prompt("currency ISO");
                    if (!v?.trim()) return;
                    setActiveDims({
                      ...active.dims,
                      currencies: [
                        ...active.dims.currencies,
                        { value: v.trim().toUpperCase(), on: true },
                      ],
                    });
                  }}
                />
                <DimGroup
                  title="amount"
                  items={active.dims.amounts.map((x) => ({
                    key: String(x.value),
                    label: x.label,
                    on: x.on,
                    toggle: () =>
                      setActiveDims({
                        ...active.dims,
                        amounts: active.dims.amounts.map((r) =>
                          r.value === x.value ? { ...r, on: !r.on } : r,
                        ),
                      }),
                  }))}
                  onAdd={() => {
                    const v = window.prompt("amount number");
                    if (v == null || v === "") return;
                    const n = Number(v);
                    if (!Number.isFinite(n)) return;
                    setActiveDims({
                      ...active.dims,
                      amounts: [...active.dims.amounts, { value: n, label: String(n), on: true }],
                    });
                  }}
                />
                <DimGroup
                  title="age"
                  items={active.dims.ages.map((x) => ({
                    key: String(x.days),
                    label: x.label,
                    on: x.on,
                    toggle: () =>
                      setActiveDims({
                        ...active.dims,
                        ages: active.dims.ages.map((r) =>
                          r.days === x.days ? { ...r, on: !r.on } : r,
                        ),
                      }),
                  }))}
                />
                <DimGroup
                  title="mcc (metadata)"
                  items={(active.dims.mccs || []).map((x) => ({
                    key: x.value || "none",
                    label: x.label,
                    on: x.on,
                    toggle: () =>
                      setActiveDims({
                        ...active.dims,
                        mccs: active.dims.mccs.map((r) =>
                          r.value === x.value ? { ...r, on: !r.on } : r,
                        ),
                      }),
                  }))}
                />
                <label className="field mt-2">
                  <span className="field-label">repeats (1–20)</span>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    className="field-input font-mono"
                    value={active.dims.repeats}
                    onChange={(e) =>
                      setActiveDims({
                        ...active.dims,
                        repeats: Math.max(1, Math.min(20, Number(e.target.value) || 1)),
                      })
                    }
                  />
                </label>
                <p className="mt-2 text-xs text-slate-500">
                  This customer: <strong>{activeEnabled}</strong> / {activeCases.length} cases on
                </p>
              </Card>

              <Card title="Per-customer run options">
                <div className="grid gap-2 text-sm">
                  {(
                    [
                      ["doOnboard", "Onboard wallet first"],
                      ["fireDuplicateFirst", "Duplicate first eventId"],
                      ["doHoldRelease", "HOLD/RELEASE grid after matrix"],
                      ["fetchLegsAfter", "Fetch DE legs after EARN/BURN"],
                      ["snapshotEnd", "Wallet snapshot at end"],
                    ] as const
                  ).map(([k, label]) => (
                    <label key={k} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!!active[k]}
                        onChange={(e) => updateActive({ [k]: e.target.checked })}
                      />
                      {label}
                    </label>
                  ))}
                  {active.doHoldRelease ? (
                    <div className="grid grid-cols-2 gap-2">
                      <label className="field">
                        <span className="field-label">hold ccy</span>
                        <input
                          className="field-input font-mono"
                          value={active.holdCurrency}
                          onChange={(e) => updateActive({ holdCurrency: e.target.value })}
                        />
                      </label>
                      <label className="field">
                        <span className="field-label">hold amounts csv</span>
                        <input
                          className="field-input font-mono"
                          value={active.holdAmountsCsv}
                          onChange={(e) => updateActive({ holdAmountsCsv: e.target.value })}
                        />
                      </label>
                    </div>
                  ) : null}
                </div>
              </Card>
            </>
          ) : (
            <Empty>Add a customer</Empty>
          )}
        </div>

        {/* cases + global + run */}
        <div className="space-y-4 xl:col-span-4">
          <Card
            title={`Cases — ${active?.label || "—"}`}
            description="Toggle individual combinations"
          >
            {activeCases.length === 0 ? (
              <Empty>Turn on dims</Empty>
            ) : (
              <div className="max-h-[280px] space-y-1 overflow-auto">
                {activeCases.map((wc) => (
                  <label
                    key={wc.id}
                    className="flex items-start gap-2 rounded-lg border border-slate-100 px-2 py-1.5 text-xs hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={wc.enabled}
                      onChange={() => {
                        if (!active) return;
                        updateActive({
                          caseOverrides: {
                            ...active.caseOverrides,
                            [wc.id]: !wc.enabled,
                          },
                        });
                      }}
                    />
                    <span>
                      <span className="font-medium text-slate-800">{wc.label}</span>
                      <span className="mt-0.5 block text-[10px] text-slate-400">
                        {guessExpect(wc)}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            )}
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                className="btn-secondary text-xs"
                onClick={() => {
                  if (!active) return;
                  const o: Record<string, boolean> = {};
                  activeCases.forEach((c) => (o[c.id] = true));
                  updateActive({ caseOverrides: o });
                }}
              >
                All on
              </button>
              <button
                type="button"
                className="btn-secondary text-xs"
                onClick={() => {
                  if (!active) return;
                  const o: Record<string, boolean> = {};
                  activeCases.forEach((c) => (o[c.id] = false));
                  updateActive({ caseOverrides: o });
                }}
              >
                All off
              </button>
            </div>
          </Card>

          <Card title="Global bootstrap" description="Once before all customers">
            <div className="space-y-2 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={globalOpts.seedPurchaseRule}
                  onChange={(e) =>
                    setGlobalOpts((o) => ({ ...o, seedPurchaseRule: e.target.checked }))
                  }
                />
                Seed digestion (PURCHASE RATE / REDEEM / CARD_OPEN / SIGNUP)
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={globalOpts.seedIngestPolicy}
                  onChange={(e) =>
                    setGlobalOpts((o) => ({ ...o, seedIngestPolicy: e.target.checked }))
                  }
                />
                Seed Door auto-wallet
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={globalOpts.skipOnboardIfExists}
                  onChange={(e) =>
                    setGlobalOpts((o) => ({ ...o, skipOnboardIfExists: e.target.checked }))
                  }
                />
                Treat onboard 409 as OK
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={globalOpts.stopOnError}
                  onChange={(e) =>
                    setGlobalOpts((o) => ({ ...o, stopOnError: e.target.checked }))
                  }
                />
                Stop on first error
              </label>
              <label className="field">
                <span className="field-label">delay ms between webhooks</span>
                <input
                  type="number"
                  className="field-input font-mono"
                  value={globalOpts.delayMs}
                  onChange={(e) =>
                    setGlobalOpts((o) => ({ ...o, delayMs: Number(e.target.value) || 0 }))
                  }
                />
              </label>
            </div>
          </Card>

          <Card title="Fleet plan">
            <ul className="mb-3 max-h-40 space-y-1 overflow-auto text-xs">
              {planSummary.map(({ c, n }) => (
                <li key={c.id} className="flex justify-between gap-2 font-mono">
                  <span className="truncate">{c.label}</span>
                  <span className="text-slate-500">{n} txns</span>
                </li>
              ))}
            </ul>
            <p className="mb-3 text-sm text-slate-600">
              Total webhooks: <strong>{totalWebhooks}</strong>
            </p>
            {running ? (
              <div className="mb-2 h-2 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full bg-emerald-500 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            ) : null}
            <button
              type="button"
              className="btn-primary w-full"
              disabled={running || totalWebhooks === 0 || enabledCustomers === 0}
              onClick={runAll}
            >
              {running
                ? `Running… ${progress}%`
                : `Run ${enabledCustomers} customers · ${totalWebhooks} txns`}
            </button>
            {error ? (
              <div className="mt-2">
                <Alert tone="error">{error}</Alert>
              </div>
            ) : null}
          </Card>
        </div>
      </div>

      {/* results */}
      <Card
        title="Run log"
        description={
          log.length
            ? `${passed} ok · ${failed} fail · ${log.length} steps`
            : "Results appear after run"
        }
        right={
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="field-select text-xs"
              value={logCustomer}
              onChange={(e) => setLogCustomer(e.target.value)}
            >
              <option value="all">all customers</option>
              {customers.map((c) => (
                <option key={c.id} value={c.ownerId}>
                  {c.label}
                </option>
              ))}
            </select>
            {(["all", "ok", "fail"] as const).map((f) => (
              <button
                key={f}
                type="button"
                className={clsx(
                  "rounded-lg px-2 py-1 text-xs font-medium",
                  filter === f ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600",
                )}
                onClick={() => setFilter(f)}
              >
                {f}
              </button>
            ))}
            <button
              type="button"
              className="btn-secondary text-xs"
              disabled={!log.length}
              onClick={() => {
                const blob = new Blob(
                  [
                    JSON.stringify(
                      {
                        product: "LedgeRX",
                        at: nowIso(),
                        customers: customers.map((c) => ({
                          label: c.label,
                          ownerId: c.ownerId,
                          preset: c.preset,
                          dims: c.dims,
                          cases: casesForCustomer(c).filter((x) => x.enabled).length,
                        })),
                        globalOpts,
                        log,
                      },
                      null,
                      2,
                    ),
                  ],
                  { type: "application/json" },
                );
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = `ledgerx-sim-fleet-${Date.now()}.json`;
                a.click();
              }}
            >
              Export JSON
            </button>
          </div>
        }
      >
        {filtered.length === 0 ? (
          <Empty>No steps yet</Empty>
        ) : (
          <div className="max-h-[520px] space-y-2 overflow-auto">
            {filtered.map((s) => (
              <div
                key={s.i}
                className={clsx(
                  "rounded-xl border px-3 py-2 text-sm",
                  s.kind === "customer-start" || s.kind === "customer-end"
                    ? "border-violet-200 bg-violet-50/50"
                    : s.ok
                      ? "border-slate-100 bg-white"
                      : "border-rose-200 bg-rose-50/40",
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={s.ok ? "ok" : "error"}>{s.ok ? "ok" : "fail"}</Badge>
                  <Badge tone="neutral">{s.kind}</Badge>
                  {s.ownerId ? (
                    <span className="font-mono text-[10px] text-slate-400">{s.ownerId}</span>
                  ) : null}
                  <span className="font-medium text-slate-800">{s.name}</span>
                  <span className="ml-auto text-[11px] text-slate-400">{s.ms}ms</span>
                </div>
                {s.detail ? (
                  <div className="mt-1 text-xs text-slate-600">
                    {s.detail}
                    {s.expect ? (
                      <span className="text-slate-400"> · expect: {s.expect}</span>
                    ) : null}
                  </div>
                ) : null}
                {s.data ? (
                  <details className="mt-1">
                    <summary className="cursor-pointer text-[11px] text-slate-400">payload</summary>
                    <JsonBlock value={s.data} maxHeight={140} />
                  </details>
                ) : null}
              </div>
            ))}
          </div>
        )}
        {log.some((l) => l.ownerId) ? (
          <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
            {Array.from(new Set(log.map((l) => l.ownerId).filter(Boolean))).map((oid) => (
              <Link
                key={oid}
                href="/review"
                className="btn-secondary text-xs"
                onClick={() => {
                  try {
                    sessionStorage.setItem("review.ownerId", oid!);
                  } catch {
                    /* */
                  }
                }}
              >
                Review {oid}
              </Link>
            ))}
          </div>
        ) : null}
      </Card>
    </div>
  );
}

function DimGroup({
  title,
  items,
  onAdd,
}: {
  title: string;
  items: { key: string; label: string; on: boolean; toggle: () => void }[];
  onAdd?: () => void;
}) {
  return (
    <div className="mb-2 rounded-xl border border-slate-100 bg-slate-50/50 p-2.5">
      <div className="mb-1.5 flex items-center justify-between">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          {title}
        </div>
        {onAdd ? (
          <button type="button" className="text-[11px] font-medium text-emerald-700" onClick={onAdd}>
            + add
          </button>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((it) => (
          <button
            key={it.key}
            type="button"
            onClick={it.toggle}
            className={clsx(
              "rounded-lg px-2 py-1 text-[11px] font-medium ring-1",
              it.on
                ? "bg-emerald-600 text-white ring-emerald-600"
                : "bg-white text-slate-500 ring-slate-200",
            )}
          >
            {it.label}
          </button>
        ))}
      </div>
    </div>
  );
}
