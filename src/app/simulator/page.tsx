"use client";

/**
 * Configurable multi-dimension txn simulator.
 * Dimensions × counts → cartesian product of webhook cases (+ optional hold/dupe/bootstrap).
 */

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader, Card, Badge, JsonBlock, Alert, Empty } from "@/components/ui/kit";
import { engine } from "@/lib/engine";
import { errMsg, nowIso, randomEventId, randomOwnerId, money } from "@/lib/format";

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
  | "legs";

type StepResult = {
  i: number;
  kind: StepKind;
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
  tag: string;
  enabled: boolean;
};

type DimConfig = {
  eventTypes: { value: string; on: boolean }[];
  currencies: { value: string; on: boolean }[];
  amounts: { value: number; label: string; on: boolean }[];
  ages: { days: number; label: string; on: boolean }[];
  repeats: number;
};

const PRESET_KEYS = [
  "smoke",
  "ccy-matrix",
  "amount-gates",
  "age-gates",
  "event-mix",
  "stress",
  "full-cartesian",
  "hold-flow",
  "custom",
] as const;
type PresetKey = (typeof PRESET_KEYS)[number];

const PRESET_LABEL: Record<PresetKey, string> = {
  smoke: "Smoke — 1 purchase HKD",
  "ccy-matrix": "Currency matrix (HKD/USD/JPY/CNY)",
  "amount-gates": "Amount gates (0 / 1 / 50 / 200 / 9999)",
  "age-gates": "Age gates (0d / 30d / 365d / 800d)",
  "event-mix": "Event mix (PURCHASE/REDEEM/SIGNUP/REFUND)",
  stress: "Stress — 3× ccy × amount",
  "full-cartesian": "Full cartesian (all dims)",
  "hold-flow": "Earn then HOLD/RELEASE grid",
  custom: "Custom (edit dims)",
};

function defaultDims(): DimConfig {
  return {
    eventTypes: [
      { value: "PURCHASE", on: true },
      { value: "REDEEM", on: false },
      { value: "SIGNUP", on: false },
      { value: "REFUND", on: false },
      { value: "ADJUSTMENT", on: false },
    ],
    currencies: [
      { value: "HKD", on: true },
      { value: "USD", on: true },
      { value: "JPY", on: true },
      { value: "CNY", on: false },
      { value: "LP", on: false },
    ],
    amounts: [
      { value: 0, label: "0", on: false },
      { value: 1, label: "1 (min)", on: true },
      { value: 50, label: "50", on: true },
      { value: 200, label: "200", on: true },
      { value: 9999, label: "9999", on: false },
    ],
    ages: [
      { days: 0, label: "now", on: true },
      { days: 30, label: "30d", on: false },
      { days: 365, label: "365d", on: true },
      { days: 800, label: "800d", on: true },
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
  };
  switch (key) {
    case "smoke":
      offAll();
      d.eventTypes.find((x) => x.value === "PURCHASE")!.on = true;
      d.currencies.find((x) => x.value === "HKD")!.on = true;
      d.amounts.find((x) => x.value === 200)!.on = true;
      d.ages.find((x) => x.days === 0)!.on = true;
      d.repeats = 1;
      break;
    case "ccy-matrix":
      offAll();
      d.eventTypes.find((x) => x.value === "PURCHASE")!.on = true;
      ["HKD", "USD", "JPY", "CNY"].forEach((c) => {
        const row = d.currencies.find((x) => x.value === c);
        if (row) row.on = true;
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
    case "event-mix":
      offAll();
      d.eventTypes.forEach((x) => {
        if (["PURCHASE", "REDEEM", "SIGNUP", "REFUND"].includes(x.value)) x.on = true;
      });
      d.currencies.find((x) => x.value === "HKD")!.on = true;
      d.amounts.forEach((x) => {
        x.on = x.value === 100 || x.value === 200;
      });
      if (!d.amounts.some((x) => x.value === 100)) {
        d.amounts.push({ value: 100, label: "100", on: true });
      }
      d.ages.find((x) => x.days === 0)!.on = true;
      break;
    case "stress":
      offAll();
      d.eventTypes.find((x) => x.value === "PURCHASE")!.on = true;
      ["HKD", "USD", "JPY"].forEach((c) => {
        d.currencies.find((x) => x.value === c)!.on = true;
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
      d.repeats = 1;
      break;
    case "hold-flow":
      offAll();
      d.eventTypes.find((x) => x.value === "PURCHASE")!.on = true;
      d.currencies.find((x) => x.value === "HKD")!.on = true;
      d.amounts.find((x) => x.value === 200)!.on = true;
      d.ages.find((x) => x.days === 0)!.on = true;
      d.repeats = 1;
      break;
    case "custom":
    default:
      break;
  }
  return d;
}

function cartesian(dims: DimConfig): WebhookCase[] {
  const ets = dims.eventTypes.filter((x) => x.on).map((x) => x.value);
  const ccy = dims.currencies.filter((x) => x.on).map((x) => x.value);
  const amts = dims.amounts.filter((x) => x.on);
  const ages = dims.ages.filter((x) => x.on);
  const reps = Math.max(1, Math.min(20, dims.repeats || 1));
  const out: WebhookCase[] = [];
  for (let r = 0; r < reps; r++) {
    for (const et of ets) {
      for (const c of ccy) {
        for (const a of amts) {
          for (const age of ages) {
            const id = `${et}-${c}-${a.value}-${age.days}d-r${r + 1}`;
            out.push({
              id,
              label: `${et} ${a.label} ${c} · ${age.label}${reps > 1 ? ` · #${r + 1}` : ""}`,
              eventType: et,
              amount: a.value,
              currency: c,
              ageDays: age.days,
              tag: `r${r + 1}`,
              enabled: true,
            });
          }
        }
      }
    }
  }
  return out;
}

function occurredAtForAge(days: number): string {
  if (!days) return nowIso();
  return new Date(Date.now() - days * 864e5).toISOString();
}

function guessExpect(c: WebhookCase): string {
  if (c.eventType === "REDEEM" && c.currency !== "LP") return "maybe skip/fail (burn ccy)";
  if (c.ageDays >= 400) return "maybe age-gate skip";
  if (c.amount === 0) return "maybe min-amount skip";
  if (c.amount === 1) return "edge min";
  if (c.eventType === "PURCHASE") return "earn if rule matches";
  return "depends on digestion";
}

/* ───────── page ───────── */

export default function SimulatorPage() {
  const [ownerId, setOwnerId] = useState(randomOwnerId());
  const [displayName, setDisplayName] = useState("Sim customer");
  const [settlement, setSettlement] = useState("HKD");
  const [extraLp, setExtraLp] = useState(true);
  const [vanityCode, setVanityCode] = useState("");

  const [preset, setPreset] = useState<PresetKey>("ccy-matrix");
  const [dims, setDims] = useState<DimConfig>(() => applyPreset("ccy-matrix"));
  const [caseOverrides, setCaseOverrides] = useState<Record<string, boolean>>({});

  const [opts, setOpts] = useState({
    seedPurchaseRule: true,
    seedIngestPolicy: true,
    doOnboard: true,
    skipOnboardIfExists: true,
    fireDuplicateFirst: true,
    doHoldRelease: false,
    holdCurrency: "LP",
    holdAmount: 1,
    holdSteps: [1, 3] as number[],
    delayMs: 0,
    stopOnError: false,
    fetchLegsAfter: true,
    snapshotEnd: true,
  });

  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [log, setLog] = useState<StepResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "ok" | "fail">("all");

  const generated = useMemo(() => cartesian(dims), [dims]);
  const cases = useMemo(
    () =>
      generated.map((c) => ({
        ...c,
        enabled: caseOverrides[c.id] ?? c.enabled,
      })),
    [generated, caseOverrides],
  );
  const enabledCases = cases.filter((c) => c.enabled);
  const comboCount = enabledCases.length;

  const onPreset = (key: PresetKey) => {
    setPreset(key);
    setDims(applyPreset(key));
    setCaseOverrides({});
    if (key === "hold-flow") {
      setOpts((o) => ({ ...o, doHoldRelease: true, fireDuplicateFirst: false }));
    }
  };

  const toggleDim = <K extends keyof DimConfig>(
    key: K,
    index: number,
    field: "on" = "on",
  ) => {
    setPreset("custom");
    setDims((d) => {
      const next = { ...d, [key]: [...(d[key] as unknown[])] } as DimConfig;
      const arr = next[key] as { on: boolean }[];
      arr[index] = { ...arr[index], [field]: !arr[index].on };
      return next;
    });
    setCaseOverrides({});
  };

  const addAmount = () => {
    const raw = prompt("Amount number", "150");
    if (!raw) return;
    const v = Number(raw);
    if (!Number.isFinite(v)) return;
    setPreset("custom");
    setDims((d) => ({
      ...d,
      amounts: [...d.amounts, { value: v, label: String(v), on: true }],
    }));
  };

  const addCurrency = () => {
    const raw = prompt("Currency code", "EUR");
    if (!raw) return;
    setPreset("custom");
    setDims((d) => ({
      ...d,
      currencies: [...d.currencies, { value: raw.trim().toUpperCase(), on: true }],
    }));
  };

  const addEventType = () => {
    const raw = prompt("eventType", "TOPUP");
    if (!raw) return;
    setPreset("custom");
    setDims((d) => ({
      ...d,
      eventTypes: [...d.eventTypes, { value: raw.trim().toUpperCase(), on: true }],
    }));
  };

  const run = useCallback(async () => {
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
    const timed = async <T,>(fn: () => Promise<T>): Promise<{ ok: true; v: T; ms: number } | { ok: false; e: unknown; ms: number }> => {
      const t0 = performance.now();
      try {
        const v = await fn();
        return { ok: true, v, ms: Math.round(performance.now() - t0) };
      } catch (e) {
        return { ok: false, e, ms: Math.round(performance.now() - t0) };
      }
    };
    const sleep = (ms: number) => (ms > 0 ? new Promise((r) => setTimeout(r, ms)) : Promise.resolve());

    const oid = ownerId.trim();
    const plan = cases.filter((c) => c.enabled);
    const totalUnits =
      (opts.seedPurchaseRule ? 1 : 0) +
      (opts.seedIngestPolicy ? 1 : 0) +
      (opts.doOnboard ? 1 : 0) +
      plan.length +
      (opts.fireDuplicateFirst && plan.length ? 1 : 0) +
      (opts.doHoldRelease ? opts.holdSteps.length * 2 : 0) +
      (opts.snapshotEnd ? 1 : 0);
    let doneUnits = 0;
    const tick = () => {
      doneUnits++;
      setProgress(Math.min(100, Math.round((doneUnits / Math.max(1, totalUnits)) * 100)));
    };

    try {
      // bootstrap digestion PURCHASE rule
      if (opts.seedPurchaseRule) {
        const t = await timed(() =>
          engine.digestionCreate({
            code: "SIM_PURCHASE_DEFAULT",
            name: "Sim purchase earn 1%",
            eventType: "PURCHASE",
            operation: "EARN",
            formula: "RATE:0.01",
            pointCurrency: "LP",
            priority: 50,
            minAmount: 0,
            eligibleCurrencies: ["HKD", "USD", "JPY", "CNY"],
            isEnabled: true,
          }),
        );
        push({
          kind: "bootstrap-rule",
          name: "seed digestion SIM_PURCHASE_DEFAULT",
          ok: t.ok || errMsg((t as { e: unknown }).e).includes("0409") || errMsg((t as { e?: unknown }).e || "").toLowerCase().includes("exist"),
          ms: t.ms,
          detail: t.ok ? "created/ok" : errMsg((t as { e: unknown }).e),
          data: t.ok ? t.v.data : undefined,
        });
        // also try REDEEM burn rule
        await engine
          .digestionCreate({
            code: "SIM_REDEEM_BURN",
            name: "Sim redeem burn",
            eventType: "REDEEM",
            operation: "BURN",
            formula: "AMOUNT",
            pointCurrency: "LP",
            priority: 50,
            minAmount: 0,
            isEnabled: true,
          })
          .catch(() => null);
        tick();
      }

      if (opts.seedIngestPolicy) {
        const t = await timed(() =>
          engine.ingestPolicyPut({
            isEnabled: true,
            isAutoCreateWallet: true,
            autoWalletSettlementCurrency: settlement,
            autoWalletEnsureCurrency: "LP",
            autoWalletNamePrefix: "Sim ",
          }),
        );
        push({
          kind: "bootstrap-policy",
          name: "seed ingest policy",
          ok: t.ok,
          ms: t.ms,
          detail: t.ok ? "enabled + auto wallet" : errMsg((t as { e: unknown }).e),
          data: t.ok ? t.v.data : undefined,
        });
        if (!t.ok && opts.stopOnError) throw (t as { e: unknown }).e;
        tick();
      }

      if (opts.doOnboard) {
        const t = await timed(() =>
          engine.onboardWallet({
            ownerId: oid,
            settlementCurrency: settlement,
            name: displayName,
            vanityCode: vanityCode.trim() || undefined,
            accounts: extraLp ? [{ currency: "LP" }] : undefined,
          }),
        );
        const msg = t.ok ? "created" : errMsg((t as { e: unknown }).e);
        const exists =
          !t.ok &&
          (msg.includes("0409") || msg.toLowerCase().includes("already") || msg.includes("409"));
        const ok = t.ok || (opts.skipOnboardIfExists && exists);
        push({
          kind: "onboard",
          name: `onboard ${oid}`,
          ok,
          ms: t.ms,
          detail: msg,
          data: t.ok ? t.v.data : undefined,
        });
        if (!ok && opts.stopOnError) throw (t as { e: unknown }).e;
        tick();
      }

      let firstBody: Record<string, unknown> | null = null;
      let lastEventId: string | undefined;

      for (const c of plan) {
        const eventId = randomEventId(
          `${c.eventType.slice(0, 3).toLowerCase()}-${c.currency}-${c.amount}`,
        );
        const body: Record<string, unknown> = {
          eventId,
          ownerId: oid,
          eventType: c.eventType,
          amount: c.amount,
          currency: c.currency,
          occurredAt: occurredAtForAge(c.ageDays),
          metadata: {
            source: "admin-simulator-v2",
            tag: c.tag,
            caseId: c.id,
            ageDays: String(c.ageDays),
          },
        };
        if (!firstBody) firstBody = body;
        lastEventId = eventId;

        const t = await timed(() => engine.webhookTxn(body));
        const status =
          t.ok && t.v.data && typeof t.v.data === "object" && "status" in t.v.data
            ? String((t.v.data as { status: unknown }).status)
            : undefined;
        push({
          kind: "webhook",
          name: c.label,
          ok: t.ok,
          ms: t.ms,
          expect: guessExpect(c),
          detail: t.ok ? status || "ok" : errMsg((t as { e: unknown }).e),
          data: t.ok ? t.v.data : undefined,
        });

        if (t.ok && opts.fetchLegsAfter && status && /EARN|BURN/i.test(status)) {
          const legs = await timed(() => engine.legs({ eventId }));
          if (legs.ok) {
            push({
              kind: "legs",
              name: `legs · ${eventId.slice(0, 18)}…`,
              ok: true,
              ms: legs.ms,
              detail: `count=${Array.isArray(legs.v.data) ? legs.v.data.length : "?"}`,
              data: legs.v.data,
            });
          }
        }

        if (!t.ok && opts.stopOnError) throw (t as { e: unknown }).e;
        tick();
        await sleep(opts.delayMs);
      }

      if (opts.fireDuplicateFirst && firstBody) {
        const t = await timed(() => engine.webhookTxn(firstBody!));
        push({
          kind: "dupe",
          name: "duplicate first eventId",
          ok: t.ok,
          ms: t.ms,
          expect: "DUPLICATE / idempotent",
          detail: t.ok
            ? String((t.v.data as { status?: string })?.status || "ok")
            : errMsg((t as { e: unknown }).e),
          data: t.ok ? t.v.data : undefined,
        });
        tick();
      }

      if (opts.doHoldRelease) {
        for (const amt of opts.holdSteps) {
          const ht = await timed(() =>
            engine.hold({
              ownerId: oid,
              currency: opts.holdCurrency,
              amount: amt,
              description: `sim-hold-${amt}`,
            }),
          );
          push({
            kind: "hold",
            name: `HOLD ${amt} ${opts.holdCurrency}`,
            ok: ht.ok,
            ms: ht.ms,
            detail: ht.ok ? "held" : errMsg((ht as { e: unknown }).e),
            data: ht.ok ? ht.v.data : undefined,
          });
          tick();
          const rt = await timed(() =>
            engine.release({
              ownerId: oid,
              currency: opts.holdCurrency,
              amount: amt,
              description: `sim-release-${amt}`,
            }),
          );
          push({
            kind: "release",
            name: `RELEASE ${amt} ${opts.holdCurrency}`,
            ok: rt.ok,
            ms: rt.ms,
            detail: rt.ok ? "released" : errMsg((rt as { e: unknown }).e),
            data: rt.ok ? rt.v.data : undefined,
          });
          tick();
        }
      }

      if (opts.snapshotEnd) {
        const t = await timed(() => engine.getWallet(oid));
        push({
          kind: "snapshot",
          name: "wallet snapshot",
          ok: t.ok,
          ms: t.ms,
          detail: t.ok ? "loaded" : errMsg((t as { e: unknown }).e),
          data: t.ok ? t.v.data : undefined,
        });
        tick();
      }

      try {
        sessionStorage.setItem("review.ownerId", oid);
      } catch {
        /* */
      }
      void lastEventId;
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setRunning(false);
      setProgress(100);
    }
  }, [cases, ownerId, displayName, settlement, vanityCode, extraLp, opts]);

  const filtered = log.filter((l) =>
    filter === "all" ? true : filter === "ok" ? l.ok : !l.ok,
  );
  const passed = log.filter((l) => l.ok).length;
  const failed = log.filter((l) => !l.ok).length;

  return (
    <div>
      <PageHeader
        title="Txn simulator"
        description="Multi-dimension matrix (eventType × currency × amount × age × repeats) + bootstrap, dupe, hold grid, legs."
        actions={
          <Link href="/review" className="btn-secondary text-xs">
            Customer review →
          </Link>
        }
      />

      <div className="mb-4 grid gap-4 xl:grid-cols-3">
        {/* subject */}
        <Card title="Subject / wallet">
          <div className="space-y-3">
            <label className="field">
              <span className="field-label">ownerId</span>
              <div className="flex gap-2">
                <input
                  className="field-input font-mono"
                  value={ownerId}
                  onChange={(e) => setOwnerId(e.target.value)}
                />
                <button
                  type="button"
                  className="btn-secondary shrink-0"
                  onClick={() => setOwnerId(randomOwnerId())}
                >
                  New
                </button>
              </div>
            </label>
            <label className="field">
              <span className="field-label">name</span>
              <input
                className="field-input"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </label>
            <label className="field">
              <span className="field-label">vanityCode</span>
              <input
                className="field-input font-mono"
                value={vanityCode}
                onChange={(e) => setVanityCode(e.target.value)}
                placeholder="optional"
              />
            </label>
            <label className="field">
              <span className="field-label">settlementCurrency</span>
              <select
                className="field-select"
                value={settlement}
                onChange={(e) => setSettlement(e.target.value)}
              >
                {["HKD", "USD", "CNY", "JPY"].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={extraLp}
                onChange={(e) => setExtraLp(e.target.checked)}
              />
              Open LP book on onboard
            </label>
          </div>
        </Card>

        {/* preset + dims */}
        <Card title="Dimensions" description="Toggle → cartesian product" className="xl:col-span-2">
          <label className="field mb-3">
            <span className="field-label">preset</span>
            <select
              className="field-select"
              value={preset}
              onChange={(e) => onPreset(e.target.value as PresetKey)}
            >
              {PRESET_KEYS.map((k) => (
                <option key={k} value={k}>
                  {PRESET_LABEL[k]}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <DimGroup
              title="eventType"
              onAdd={addEventType}
              items={dims.eventTypes.map((x, i) => ({
                key: x.value,
                label: x.value,
                on: x.on,
                toggle: () => toggleDim("eventTypes", i),
              }))}
            />
            <DimGroup
              title="currency"
              onAdd={addCurrency}
              items={dims.currencies.map((x, i) => ({
                key: x.value,
                label: x.value,
                on: x.on,
                toggle: () => toggleDim("currencies", i),
              }))}
            />
            <DimGroup
              title="amount"
              onAdd={addAmount}
              items={dims.amounts.map((x, i) => ({
                key: String(x.value),
                label: x.label,
                on: x.on,
                toggle: () => toggleDim("amounts", i),
              }))}
            />
            <DimGroup
              title="age"
              items={dims.ages.map((x, i) => ({
                key: String(x.days),
                label: x.label,
                on: x.on,
                toggle: () => toggleDim("ages", i),
              }))}
            />
          </div>

          <label className="field mt-3 max-w-[160px]">
            <span className="field-label">repeats (1–20)</span>
            <input
              type="number"
              min={1}
              max={20}
              className="field-input"
              value={dims.repeats}
              onChange={(e) => {
                setPreset("custom");
                setDims((d) => ({
                  ...d,
                  repeats: Math.max(1, Math.min(20, Number(e.target.value) || 1)),
                }));
                setCaseOverrides({});
              }}
            />
          </label>

          <Alert tone="info">
            Planned webhooks: <strong>{comboCount}</strong>
            {comboCount > 80 ? " — large run, consider fewer dims or delay" : ""}
          </Alert>
        </Card>
      </div>

      {/* options */}
      <Card title="Run options" className="mb-4">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {(
            [
              ["seedPurchaseRule", "Seed PURCHASE + REDEEM digestion rules"],
              ["seedIngestPolicy", "Seed ingest policy (auto wallet on)"],
              ["doOnboard", "Onboard wallet first"],
              ["skipOnboardIfExists", "Treat WAL0409 onboard as OK"],
              ["fireDuplicateFirst", "Replay first eventId (idempotency)"],
              ["doHoldRelease", "HOLD/RELEASE grid after webhooks"],
              ["fetchLegsAfter", "Fetch DE legs after EARN/BURN"],
              ["snapshotEnd", "Wallet snapshot at end"],
              ["stopOnError", "Stop on first hard error"],
            ] as const
          ).map(([k, label]) => (
            <label key={k} className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={opts[k] as boolean}
                onChange={(e) => setOpts((o) => ({ ...o, [k]: e.target.checked }))}
              />
              {label}
            </label>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-3">
          <label className="field w-28">
            <span className="field-label">delay ms</span>
            <input
              type="number"
              className="field-input"
              value={opts.delayMs}
              onChange={(e) =>
                setOpts((o) => ({ ...o, delayMs: Math.max(0, Number(e.target.value) || 0) }))
              }
            />
          </label>
          <label className="field w-28">
            <span className="field-label">hold ccy</span>
            <input
              className="field-input"
              value={opts.holdCurrency}
              onChange={(e) => setOpts((o) => ({ ...o, holdCurrency: e.target.value }))}
            />
          </label>
          <label className="field min-w-[200px] flex-1">
            <span className="field-label">hold amounts (csv)</span>
            <input
              className="field-input font-mono"
              value={opts.holdSteps.join(",")}
              onChange={(e) =>
                setOpts((o) => ({
                  ...o,
                  holdSteps: e.target.value
                    .split(",")
                    .map((s) => Number(s.trim()))
                    .filter((n) => Number.isFinite(n) && n > 0),
                }))
              }
            />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-primary"
            disabled={running || !ownerId.trim() || comboCount === 0}
            onClick={run}
          >
            {running ? `Running… ${progress}%` : `Run suite (${comboCount} webhooks)`}
          </button>
          <button
            type="button"
            className="btn-secondary"
            disabled={running}
            onClick={() => {
              setLog([]);
              setProgress(0);
              setError(null);
            }}
          >
            Clear log
          </button>
        </div>
        {running ? (
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        ) : null}
        {error ? (
          <div className="mt-3">
            <Alert tone="error">{error}</Alert>
          </div>
        ) : null}
      </Card>

      {/* case list */}
      <Card
        title={`Webhook cases (${comboCount} on / ${cases.length} total)`}
        description="Uncheck to exclude from run"
        className="mb-4"
        right={
          <div className="flex gap-1">
            <button
              type="button"
              className="btn-ghost text-xs"
              onClick={() => {
                const all: Record<string, boolean> = {};
                cases.forEach((c) => (all[c.id] = true));
                setCaseOverrides(all);
              }}
            >
              All on
            </button>
            <button
              type="button"
              className="btn-ghost text-xs"
              onClick={() => {
                const all: Record<string, boolean> = {};
                cases.forEach((c) => (all[c.id] = false));
                setCaseOverrides(all);
              }}
            >
              All off
            </button>
          </div>
        }
      >
        {cases.length === 0 ? (
          <Empty>Enable at least one value per dimension</Empty>
        ) : (
          <div className="table-wrap max-h-72 overflow-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th />
                  <th>case</th>
                  <th>type</th>
                  <th>amt</th>
                  <th>ccy</th>
                  <th>age</th>
                  <th>expect (hint)</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((c) => (
                  <tr key={c.id} className={!c.enabled ? "opacity-40" : undefined}>
                    <td>
                      <input
                        type="checkbox"
                        checked={c.enabled}
                        onChange={() =>
                          setCaseOverrides((m) => ({
                            ...m,
                            [c.id]: !c.enabled,
                          }))
                        }
                      />
                    </td>
                    <td className="font-mono text-[10px] text-slate-500">{c.id}</td>
                    <td className="text-xs font-medium">{c.eventType}</td>
                    <td className="font-mono text-xs">{money(c.amount)}</td>
                    <td>{c.currency}</td>
                    <td>{c.ageDays}d</td>
                    <td className="text-xs text-slate-500">{guessExpect(c)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* results */}
      <Card
        title="Results"
        description={log.length ? `${passed} ok · ${failed} fail · ${log.length} steps` : "Idle"}
        right={
          <div className="flex gap-1">
            {(["all", "ok", "fail"] as const).map((f) => (
              <button
                key={f}
                type="button"
                className={filter === f ? "btn-primary text-xs" : "btn-ghost text-xs"}
                onClick={() => setFilter(f)}
              >
                {f}
              </button>
            ))}
            {log.length > 0 ? (
              <button
                type="button"
                className="btn-secondary text-xs"
                onClick={() => {
                  const blob = new Blob(
                    [
                      JSON.stringify(
                        { ownerId, preset, dims, opts, log, at: nowIso() },
                        null,
                        2,
                      ),
                    ],
                    { type: "application/json" },
                  );
                  const a = document.createElement("a");
                  a.href = URL.createObjectURL(blob);
                  a.download = `sim-${ownerId}-${Date.now()}.json`;
                  a.click();
                }}
              >
                Export JSON
              </button>
            ) : null}
          </div>
        }
      >
        {filtered.length === 0 ? (
          <Empty>{log.length ? "No rows for filter" : "Run suite to stream steps"}</Empty>
        ) : (
          <ul className="max-h-[480px] space-y-2 overflow-auto">
            {filtered.map((s) => (
              <li
                key={s.i}
                className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={s.ok ? "ok" : "error"}>{s.ok ? "OK" : "FAIL"}</Badge>
                    <Badge tone="neutral">{s.kind}</Badge>
                    <span className="text-sm font-medium text-slate-800">{s.name}</span>
                    <span className="text-[10px] text-slate-400">{s.ms}ms</span>
                  </div>
                  {s.expect ? (
                    <p className="mt-0.5 text-[11px] text-slate-400">expect: {s.expect}</p>
                  ) : null}
                  {s.detail ? (
                    <p className="mt-0.5 truncate font-mono text-[11px] text-slate-500">
                      {s.detail}
                    </p>
                  ) : null}
                </div>
                {s.data ? (
                  <details className="shrink-0">
                    <summary className="cursor-pointer text-xs text-emerald-700">json</summary>
                    <div className="mt-1 w-80">
                      <JsonBlock value={s.data} maxHeight={180} />
                    </div>
                  </details>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {log.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/review" className="btn-secondary text-xs">
              Open review for {ownerId}
            </Link>
            <Link href="/failed-transactions" className="btn-ghost text-xs">
              Failed ingest desk
            </Link>
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
    <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {title}
        </div>
        {onAdd ? (
          <button type="button" className="btn-ghost text-[11px]" onClick={onAdd}>
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
            className={
              it.on
                ? "rounded-lg bg-emerald-600 px-2 py-1 text-xs font-medium text-white"
                : "rounded-lg bg-white px-2 py-1 text-xs font-medium text-slate-500 ring-1 ring-slate-200"
            }
          >
            {it.label}
          </button>
        ))}
      </div>
    </div>
  );
}
