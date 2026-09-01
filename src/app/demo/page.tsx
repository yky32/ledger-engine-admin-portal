"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader, Card, Badge, Alert, JsonBlock } from "@/components/ui/kit";
import { ActionBar } from "@/components/ui/action";
import { FlowStrip } from "@/components/layout/flow-strip";
import { engine } from "@/lib/engine";
import { errMsg, isConflictError, randomEventId, randomOwnerId } from "@/lib/format";
import type { DigestionRule, IngestResult, WalletView } from "@/lib/types";

import {
  CheckCircle2,
  Circle,
  ArrowRight,
  FlaskConical,
  BookOpen,
  Brain,
  DoorOpen,
  Wallet,
  Search,
} from "lucide-react";

/** Guided demo: CC_TXN · HKD 1000 · 15 Aug 2026 HKT · MCC 101 · RATE 1% → 10 LP */
const DEMO_RULE_CODE = "DEMO_CC_1PCT";
const DEMO_COA_MEMBER = "MEMBER_CUST_LP";
const DEMO_EVENT_TYPE = "CC_TXN";

type DemoCombo = {
  id: string;
  title: string;
  eventType: string;
  amount: number;
  currency: string;
  occurredAt: string;
  mcc: string;
  merchantName: string;
  expect: string;
};

function hktIso(y: number, m: number, d: number, hh = 14, mm = 30): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${y}-${p(m)}-${p(d)}T${p(hh)}:${p(mm)}:00+08:00`;
}

function formatHkt(iso: string): string {
  try {
    return (
      new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Hong_Kong",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date(iso)) + " HKT"
    );
  } catch {
    return iso;
  }
}

const COMBO_BASE: DemoCombo = {
  id: "1",
  title: "Credit card transaction",
  eventType: DEMO_EVENT_TYPE,
  amount: 1000,
  currency: "HKD",
  occurredAt: hktIso(2026, 8, 15, 14, 30),
  mcc: "101",
  merchantName: "UA Card acceptor",
  expect: "EARN ~10 LP (1% × 1000)",
};

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length) % arr.length];
}

/** Combo 1 is fixed; 2–6 are derived from it (amount / MCC / day / ccy). */
function buildCombos(seed: number): DemoCombo[] {
  const rng = mulberry32(seed);
  const amounts = [80, 168, 250, 480, 1680, 2500];
  const hours = [9, 11, 16, 19, 21];
  const days = [15, 16, 18, 20];
  const v2Amt = pick(rng, amounts);
  const v3Amt = pick(rng, amounts.filter((a) => a !== v2Amt));
  const v3Day = pick(rng, days);
  const v3Hour = pick(rng, hours);
  return [
    COMBO_BASE,
    {
      ...COMBO_BASE,
      id: "2",
      title: "Same MCC · different ticket",
      amount: v2Amt,
      occurredAt: hktIso(2026, 8, 15, pick(rng, hours), 12),
      expect: `EARN ~${(v2Amt * 0.01).toFixed(2)} LP (same MCC 101 · HKD)`,
    },
    {
      ...COMBO_BASE,
      id: "3",
      title: "Same card rail · later in August",
      amount: v3Amt,
      occurredAt: hktIso(2026, 8, v3Day, v3Hour, 5),
      expect: `EARN ~${(v3Amt * 0.01).toFixed(2)} LP (still within 30d age)`,
    },
    {
      ...COMBO_BASE,
      id: "4",
      title: "Same spend · grocery MCC",
      mcc: "5411",
      merchantName: "ParknShop",
      expect: "SKIPPED · MCC 5411 not in rule (101 only)",
    },
    {
      ...COMBO_BASE,
      id: "5",
      title: "Same MCC / date · USD not HKD",
      currency: "USD",
      expect: "SKIPPED · currency (rule is HKD)",
    },
    {
      ...COMBO_BASE,
      id: "6",
      title: "Same MCC · too old",
      occurredAt: hktIso(2026, 6, 1, 10, 0),
      expect: "SKIPPED · age > 30d vs ingest time",
    },
  ];
}

type CoaRow = {
  id?: number;
  code?: string;
  name?: string;
  transactionCode?: string | null;
  isDefault?: boolean;
  isEnabled?: boolean;
  entity?: string;
  type?: string;
  subType?: string;
  buffer?: string;
  currency?: string;
};

function coaLabel(p: CoaRow) {
  const segs = [p.entity, p.type, p.subType, p.buffer].filter(Boolean).join("-");
  return `${p.code} · txn ${p.transactionCode || p.code} · ${segs || "—"} · ${p.currency || "LP"}`;
}

const DEMO_OWNER = "01A81267065";

function genMainAccount(prefix: "9089" | "9088") {
  const n = Math.floor(10_000_000 + Math.random() * 89_999_999);
  return `${prefix}${n}`;
}

export default function DemoPage() {
  const [ownerId, setOwnerId] = useState(DEMO_OWNER);
  const [doorOk, setDoorOk] = useState<boolean | null>(null);
  const [ruleOk, setRuleOk] = useState<boolean | null>(null);
  const [ruleDetail, setRuleDetail] = useState("");
  const [coaOk, setCoaOk] = useState<boolean | null>(null);
  const [coaDetail, setCoaDetail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [dry, setDry] = useState<IngestResult | null>(null);
  const [live, setLive] = useState<IngestResult | null>(null);
  const [wallet, setWallet] = useState<WalletView | null>(null);
  const [comboSeed, setComboSeed] = useState(1);
  const [comboId, setComboId] = useState("1");
  const [eventId, setEventId] = useState(() => randomEventId());
  const [mainAccount, setMainAccount] = useState(() => genMainAccount("9089"));
  const [extraMetaJson, setExtraMetaJson] = useState(
    '{\n  "channel": "UAF_CC",\n  "posId": "HKG-001"\n}',
  );
  const combos = useMemo(() => buildCombos(comboSeed), [comboSeed]);
  const selected = useMemo(
    () => combos.find((c) => c.id === comboId) || combos[0],
    [combos, comboId],
  );

  useEffect(() => {
    try {
      const s = sessionStorage.getItem("review.ownerId");
      if (s && s.startsWith("01A")) setOwnerId(s);
    } catch {
      /* keep DEMO_OWNER */
    }
  }, []);

  const refreshPrereqs = useCallback(async () => {
    setError(null);
    try {
      const door = await engine.ingestPolicyGet();
      const p = door.data as { isEnabled?: boolean };
      setDoorOk(p?.isEnabled !== false);
    } catch (e) {
      setDoorOk(false);
      setError(errMsg(e));
    }
    try {
      const r = await engine.digestionRules({ code: DEMO_RULE_CODE });
      const data = r.data;
      const list = Array.isArray(data) ? data : data ? [data] : [];
      const hit = (list as DigestionRule[]).find(
        (x) => (x.code || "").toUpperCase() === DEMO_RULE_CODE,
      );
      if (hit) {
        setRuleOk(!!hit.isEnabled);
        setRuleDetail(
          `${hit.code} · ${hit.operation || "EARN"} · ${JSON.stringify(hit.formula ?? {})}`,
        );
      } else {
        setRuleOk(false);
        setRuleDetail("missing — click Ensure demo rule");
      }
    } catch {
      setRuleOk(false);
      setRuleDetail("could not list rules");
    }
    try {
      const r = await engine.coaProfiles();
      const list = Array.isArray(r.data) ? (r.data as CoaRow[]) : [];
      const member = list.find(
        (x) => (x.code || "").toUpperCase() === DEMO_COA_MEMBER,
      );
      if (member) {
        setCoaOk(true);
        setCoaDetail(coaLabel(member));
      } else {
        setCoaOk(false);
        setCoaDetail(`${DEMO_COA_MEMBER} missing — Ensure demo COA`);
      }
    } catch {
      setCoaOk(false);
      setCoaDetail("could not list COA");
    }
  }, []);

  useEffect(() => {
    void refreshPrereqs();
  }, [refreshPrereqs]);

  const ensureDoor = async () => {
    setBusy(true);
    setError(null);
    try {
      await engine.ingestPolicyPut({
        isEnabled: true,
        isAutoCreateWallet: true,
        autoWalletSettlementCurrency: "HKD",
        autoWalletEnsureCurrency: "LP",
        autoWalletNamePrefix: "Demo ",
        autoWalletCoaProfileCode: DEMO_COA_MEMBER,
      });
      setOk("Door open · auto-wallet HKD+LP");
      await refreshPrereqs();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const ensureRule = async () => {
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const r = await engine.digestionRules({ code: DEMO_RULE_CODE });
      const data = r.data;
      const list = Array.isArray(data) ? data : data ? [data] : [];
      const hit = (list as DigestionRule[]).find(
        (x) => (x.code || "").toUpperCase() === DEMO_RULE_CODE,
      );
      const body = {
        code: DEMO_RULE_CODE,
        name: "Demo CC 1% (MCC 101 · HKD)",
        priority: 10,
        isEnabled: true,
        eventType: DEMO_EVENT_TYPE,
        minAmount: 1,
        eligibleCurrencies: ["HKD"],
        eligibleMccs: ["101"],
        maxAgeDays: 30,
        resultCurrency: "LP",
        operation: "EARN",
        formula: { type: "RATE" as const, rate: 0.01 },
      };
      if (hit?.id) {
        await engine.digestionUpdate(hit.id, body);
        if (!hit.isEnabled) await engine.digestionEnable(hit.id);
        setOk(`Updated rule ${DEMO_RULE_CODE}`);
      } else {
        await engine.digestionCreate(body);
        setOk(`Created rule ${DEMO_RULE_CODE}`);
      }
      await refreshPrereqs();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const ensureCoa = async () => {
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const r = await engine.coaProfiles();
      const list = Array.isArray(r.data) ? (r.data as CoaRow[]) : [];
      const hasMember = list.some((x) => (x.code || "").toUpperCase() === DEMO_COA_MEMBER);
      if (!hasMember) {
        try {
          await engine.coaProfileCreate({
            code: DEMO_COA_MEMBER,
            name: "Member Custodian LP",
            entity: "01",
            type: "01",
            subType: "01",
            buffer: "00",
            currency: "LP",
            isDefault: false,
            isEnabled: true,
            poolAllowNegative: false,
          });
        } catch (e) {
          if (!isConflictError(e)) throw e;
        }
      }
      setOk(`Brain COA ready · ${DEMO_COA_MEMBER}`);
      await refreshPrereqs();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

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
      /* ignore until JSON is valid */
    }
    return {} as Record<string, string>;
  }, [extraMetaJson]);

  const payload = useMemo(() => {
    const body: Record<string, unknown> = {
      eventId,
      ownerId: ownerId.trim(),
      eventType: selected.eventType,
      amount: selected.amount,
      currency: selected.currency,
      occurredAt: selected.occurredAt,
      metadata: {
        source: "uaf-sdk",
        comboId: selected.id,
        mcc: selected.mcc,
        merchantName: selected.merchantName,
        ...extraMeta,
      },
    };
    const main = mainAccount.trim();
    if (main) body.mainAccount = main;
    return body;
  }, [eventId, ownerId, selected, extraMeta, mainAccount]);

  const sdkJava = useMemo(() => {
    const metaEntries = Object.entries(
      (payload.metadata as Record<string, string>) || {},
    )
      .map(([k, v]) => `            "${k}", "${v}"`)
      .join(",\n");
    const mainLine = mainAccount.trim()
      ? `\n    .mainAccount("${mainAccount.trim()}")`
      : "";
    return `TransactionalEvent event = TransactionalEvent.builder()
    .eventId("${eventId}")
    .ownerId("${ownerId.trim() || DEMO_OWNER}")${mainLine}
    .eventType("${selected.eventType}")
    .amount(new BigDecimal("${selected.amount}"))
    .currency("${selected.currency}")
    .occurredAt(OffsetDateTime.parse("${selected.occurredAt}").toInstant())
    .metadata(Map.of(
${metaEntries}
    ))
    .build();
client.events().submit(event);`;
  }, [eventId, ownerId, mainAccount, selected, payload]);

  const bumpEventId = () => setEventId(randomEventId());

  const runDry = async () => {
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const r = await engine.webhookTxnDryRun(payload);
      setDry(r.data as IngestResult);
      setOk("Dry-run done — no books posted");
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const runLive = async () => {
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      try {
        sessionStorage.setItem("review.ownerId", ownerId.trim());
      } catch {
        /* */
      }
      const r = await engine.webhookTxn({ ...payload, eventId: randomEventId() });
      setLive(r.data as IngestResult);
      const w = await engine.getWallet(ownerId.trim());
      setWallet(w.data as WalletView);
      setOk("Live earn posted — check Review for LP balance");
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const lpLine = (() => {
    const accts = wallet?.accounts || [];
    const lp = accts.find((a) => String(a.currency || "").toUpperCase() === "LP");
    if (!lp) return null;
    return String(lp.availableBalance ?? lp.ledgerBalance ?? "—");
  })();

  return (
    <div>
      <FlowStrip active="shoot" />
      <PageHeader
        title="Demo · CC txn combinations"
        description="Base: credit card · HKD 1000 · 15 Aug 2026 14:30 HKT · MCC 101. Brain RATE 1% → 10 LP when MCC+ccy+age match."
        api={[
          { method: "GET", path: "/ingest-policies" },
          { method: "GET", path: "/digestion-rules" },
          { method: "GET", path: "/coa-profiles" },
          { method: "POST", path: "/coa-profiles" },
          { method: "POST", path: "/integrations/webhooks/transactions" },
          { method: "POST", path: "/integrations/webhooks/transactions/dry-run" },
        ]}
        actions={
          <Link href="/review" className="btn-secondary text-xs">
            <Search className="h-3.5 w-3.5" />
            Open Review
          </Link>
        }
      />

      <div className="mb-4">
        <Alert tone="info">
          Combo 1: <strong>CC_TXN · HKD 1,000 · 15 Aug 2026 HKT · MCC 101</strong> → ~10 LP.
          Variants 2–6 change amount / day / MCC / currency / age so you can see earn vs skip.
          Rule <code className="text-xs">{DEMO_RULE_CODE}</code> · eventType{" "}
          <code className="text-xs">{DEMO_EVENT_TYPE}</code> · COA{" "}
          <code className="text-xs">{DEMO_COA_MEMBER}</code>.
        </Alert>
      </div>

      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/ingest-policies" className="btn-secondary justify-start text-xs">
          <DoorOpen className="h-4 w-4 text-emerald-600" />
          Door
        </Link>
        <Link href="/digestion-rules" className="btn-secondary justify-start text-xs">
          <Brain className="h-4 w-4 text-violet-600" />
          Brain · rules
        </Link>
        <Link href="/coa-list" className="btn-secondary justify-start text-xs">
          <BookOpen className="h-4 w-4 text-violet-600" />
          Brain · COA
        </Link>
        <Link href="/wallets" className="btn-secondary justify-start text-xs">
          <Wallet className="h-4 w-4 text-sky-600" />
          Wallets
        </Link>
      </div>

      <Card
        className="mb-4"
        title="Shoot combinations"
        description="1 is the brief. 2–6 are generated from it — Shuffle to draw new tickets / times."
        right={
          <button
            type="button"
            className="btn-secondary text-xs"
            onClick={() => {
              setComboSeed((s) => s + 1);
              setComboId("1");
              setDry(null);
              setLive(null);
            }}
          >
            Shuffle 2–6
          </button>
        }
      >
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>what</th>
                <th>eventType</th>
                <th>amount</th>
                <th>ccy</th>
                <th>occurredAt</th>
                <th>MCC</th>
                <th>expect</th>
              </tr>
            </thead>
            <tbody>
              {combos.map((c) => (
                <tr
                  key={c.id}
                  className={comboId === c.id ? "cursor-pointer bg-emerald-50" : "cursor-pointer"}
                  onClick={() => {
                    setComboId(c.id);
                    bumpEventId();
                    setDry(null);
                    setLive(null);
                  }}
                >
                  <td className="font-mono text-xs font-semibold">{c.id}</td>
                  <td className="text-sm">{c.title}</td>
                  <td className="font-mono text-[11px]">{c.eventType}</td>
                  <td className="font-mono text-xs">{c.amount.toLocaleString()}</td>
                  <td>{c.currency}</td>
                  <td className="whitespace-nowrap font-mono text-[11px]">{formatHkt(c.occurredAt)}</td>
                  <td className="font-mono text-xs">{c.mcc}</td>
                  <td className="text-xs text-slate-600">{c.expect}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-slate-500">
          Selected #{selected.id} · click a row, then Dry-run / Send live. Request JSON updates below.
        </p>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <Card title={`01 · Door ${doorOk ? "✓" : ""}`}>
            <div className="mb-2 flex items-center gap-2 text-sm text-slate-600">
              {doorOk ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ) : (
                <Circle className="h-4 w-4 text-slate-400" />
              )}
              {doorOk === null
                ? "Checking…"
                : doorOk
                  ? "Ingest enabled"
                  : "Door closed or unreachable"}
            </div>
            <button
              type="button"
              className="btn-secondary text-xs"
              disabled={busy}
              onClick={() => void ensureDoor()}
            >
              Ensure Door (enable + auto-wallet)
            </button>
          </Card>

          <Card title={`02 · Brain demo rule ${ruleOk ? "✓" : ""}`}>
            <p className="mb-1 font-mono text-xs text-slate-500">{ruleDetail || "—"}</p>
            <p className="mb-2 text-sm text-slate-600">
              CC_TXN · HKD · MCC 101 · RATE 0.01 · maxAge 30d · EARN · Loyalty LP
            </p>
            <button
              type="button"
              className="btn-secondary text-xs"
              disabled={busy}
              onClick={() => void ensureRule()}
            >
              Ensure demo rule
            </button>
          </Card>

          <Card title={`03 · Brain · COA ${coaOk ? "✓" : ""}`}>
            <div className="mb-2 flex items-center gap-2 text-sm text-slate-600">
              {coaOk ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ) : (
                <Circle className="h-4 w-4 text-slate-400" />
              )}
              {coaOk === null
                ? "Checking…"
                : coaOk
                  ? `${DEMO_COA_MEMBER} chart`
                  : "COA incomplete"}
            </div>
            <p className="mb-1 font-mono text-[11px] text-slate-500">{coaDetail || "—"}</p>
            <p className="mb-2 text-sm text-slate-600">
              Member chart <code className="text-xs">{DEMO_COA_MEMBER}</code> (01-01-01 LP). No DEFAULT profile.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-secondary text-xs"
                disabled={busy}
                onClick={() => void ensureCoa()}
              >
                Ensure demo COA
              </button>
              <Link href="/coa" className="btn-secondary text-xs">
                Edit COA →
              </Link>
            </div>
          </Card>

          <Card title="04 · SDK identity (UAF webhook)">
            <p className="mb-3 text-xs text-slate-500">
              Standard body UAF builds with{" "}
              <code className="text-[11px]">TransactionalEvent.builder()</code>. Engine uses these
              three fields; remaining keys are the usual event envelope.
            </p>
            <label className="field">
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
            <label className="field mt-3">
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
                  onClick={() => setMainAccount(genMainAccount("9089"))}
                >
                  9089…
                </button>
                <button
                  type="button"
                  className="btn-secondary text-xs"
                  onClick={() => setMainAccount(genMainAccount("9088"))}
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
              <p className="mt-1 text-[11px] text-slate-500">
                If set, fills <code>account.main_account</code> on first wallet create. Empty →
                engine next main.
              </p>
            </label>
            <label className="field mt-3">
              <span className="field-label">metadata (client hashmap JSON)</span>
              <textarea
                className="field-input min-h-[88px] font-mono text-[11px]"
                value={extraMetaJson}
                onChange={(e) => setExtraMetaJson(e.target.value)}
              />
            </label>
          </Card>
        </div>

        <div className="space-y-4">
          <Card title={`05 · Dry-run ${dry ? "✓" : ""}`}>
            <p className="mb-2 text-sm text-slate-600">
              #{selected.id} {selected.title} · expect {selected.expect}
            </p>
            <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">
              SDK JSON body
            </p>
            <JsonBlock value={payload} maxHeight={260} />
            <details className="mt-2">
              <summary className="cursor-pointer text-[11px] text-emerald-700">
                Java builder (ledger-engine-sdk)
              </summary>
              <pre className="mt-2 overflow-auto rounded-lg bg-slate-950 p-3 font-mono text-[10px] leading-relaxed text-emerald-100">
                {sdkJava}
              </pre>
            </details>
            <button
              type="button"
              className="btn-secondary mt-3"
              disabled={busy || !ownerId.trim()}
              onClick={() => void runDry()}
            >
              <FlaskConical className="h-4 w-4" />
              Dry-run combo #{selected.id}
            </button>
            {dry ? (
              <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <dt className="text-slate-500">status</dt>
                <dd>
                  <Badge tone={dry.status === "SKIPPED" ? "warn" : "ok"}>
                    {dry.status}
                    {dry.dryRun ? " · dry" : ""}
                  </Badge>
                </dd>
                <dt className="text-slate-500">points</dt>
                <dd className="text-lg font-bold text-emerald-700">{dry.points ?? "—"}</dd>
                <dt className="text-slate-500">rule</dt>
                <dd className="font-mono text-xs">{dry.matchedRuleCode || "—"}</dd>
                <dt className="text-slate-500">reason</dt>
                <dd className="text-xs">{dry.reason || "—"}</dd>
              </dl>
            ) : null}
          </Card>

          <Card title={`06 · Live earn ${live && live.status !== "SKIPPED" ? "✓" : ""}`}>
            <p className="mb-2 text-sm text-slate-600">
              Posts DE legs · PROGRAM ↔ member LP · combo #{selected.id} ({selected.currency}{" "}
              {selected.amount.toLocaleString()} · MCC {selected.mcc})
            </p>
            <button
              type="button"
              className="btn-primary"
              disabled={busy || !ownerId.trim()}
              onClick={() => void runLive()}
            >
              Send live combo #{selected.id}
              <ArrowRight className="h-4 w-4" />
            </button>
            {live ? (
              <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <dt className="text-slate-500">status</dt>
                <dd>
                  <Badge tone={live.status === "SKIPPED" ? "warn" : "ok"}>{live.status}</Badge>
                </dd>
                <dt className="text-slate-500">points</dt>
                <dd className="text-lg font-bold text-emerald-700">{live.points ?? "—"}</dd>
                <dt className="text-slate-500">rule</dt>
                <dd className="font-mono text-xs">{live.matchedRuleCode || "—"}</dd>
              </dl>
            ) : null}
            {lpLine ? (
              <p className="mt-2 text-lg font-semibold text-emerald-700">
                LP available ≈ {lpLine}
              </p>
            ) : null}
            {wallet ? (
              <div className="mt-3">
                <Link
                  href="/review"
                  className="text-sm font-medium text-emerald-700 underline"
                >
                  Open Review for {ownerId}
                </Link>
              </div>
            ) : null}
          </Card>
        </div>
      </div>

      <div className="mt-4">
        <ActionBar loading={busy} error={error} ok={ok}>
          <button
            type="button"
            className="btn-secondary text-xs"
            disabled={busy}
            onClick={() => void refreshPrereqs()}
          >
            Refresh status
          </button>
        </ActionBar>
      </div>

      {dry || live ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {dry ? (
            <Card title="Dry-run JSON">
              <JsonBlock value={dry} />
            </Card>
          ) : null}
          {live ? (
            <Card title="Live JSON">
              <JsonBlock value={live} />
            </Card>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
