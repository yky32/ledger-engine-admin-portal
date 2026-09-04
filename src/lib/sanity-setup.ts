import { engine } from "@/lib/engine";
import { errMsg, isConflictError } from "@/lib/format";
import { COA_PRESETS, EVENT_TYPES, EVENT_TYPE_LABELS } from "@/lib/recipes";
import type { DigestionRule } from "@/lib/types";

export type SanityStep = {
  key: string;
  label: string;
  ok: boolean;
  detail: string;
};

async function step(key: string, label: string, fn: () => Promise<string>): Promise<SanityStep> {
  try {
    const detail = await fn();
    return { key, label, ok: true, detail };
  } catch (e) {
    return { key, label, ok: false, detail: errMsg(e) };
  }
}

/** Door OPEN · anyone · auto-wallet HKD+LP. */
async function setupDoor(): Promise<string> {
  await engine.ingestPolicyPut({
    isEnabled: true,
    isAutoCreateWallet: true,
    autoWalletSettlementCurrency: "HKD",
    autoWalletEnsureCurrency: "LP",
    autoWalletNamePrefix: "Auto ",
    autoWalletCoaProfileCode: "",
    entryFactors: [],
  });
  return "OPEN · anyone · settlement HKD · 01-01-01 HKD+LP";
}

/** House books + dictionary + customer custodian LP/HKD. */
async function setupCoa(): Promise<string> {
  await engine.coaDictionaryEnsure().catch(() => null);
  await engine.houseEnsure("HOUSE");
  const listed = await engine.coaProfiles();
  const rows = Array.isArray(listed.data) ? (listed.data as { code?: string }[]) : [];
  const have = new Set(rows.map((r) => (r.code || "").toUpperCase()));
  const created: string[] = [];
  for (const p of COA_PRESETS) {
    if (have.has(p.code)) continue;
    try {
      await engine.coaProfileCreate({
        code: p.code,
        name: p.name,
        entity: p.entity,
        type: p.type,
        subType: p.subType,
        buffer: p.buffer,
        currency: p.currency,
        isDefault: false,
        poolAllowNegative: true,
      });
      created.push(p.code);
    } catch (e) {
      if (!isConflictError(e)) throw e;
    }
  }
  return created.length ? `HOUSE + ${created.join(", ")}` : "HOUSE + customer 01-01-01 already present";
}

/** UA accounting sequences (CC_TXN_LP / HKD). */
async function setupAccounting(): Promise<string> {
  const listed = await engine.accountingRuleExecutions();
  const execs = Array.isArray(listed.data) ? listed.data : [];
  if (execs.length > 0) {
    return `${execs.length} combination(s) already in DB`;
  }
  const saved = await engine.accountingRulesEnsure();
  const n = saved.data?.executions?.length ?? 0;
  return n ? `wrote ${n} UA sequence(s)` : "ensure called";
}

/** Brain all-any RATE 0.01 LP for CC_TXN / CIP / SIP / LN_TXN. */
async function setupBrain(): Promise<string> {
  const r = await engine.digestionRules();
  const d = r.data;
  const existing: DigestionRule[] = Array.isArray(d) ? d : d ? [d] : [];
  const byCode = new Map(existing.map((x) => [(x.code || "").toUpperCase(), x]));
  const bits: string[] = [];
  for (const eventType of EVENT_TYPES) {
    const body = {
      code: eventType,
      name: `${EVENT_TYPE_LABELS[eventType]} · all any`,
      eventType,
      operation: "EARN",
      isEnabled: true,
      priority: 1,
      minAmount: 0,
      eligibleCurrencies: [] as string[],
      eligibleMccs: [] as string[],
      resultCurrency: "LP",
      formula: { type: "RATE", rate: 0.01 },
      whenFactors: [],
    };
    const hit = byCode.get(eventType);
    if (hit?.id) {
      await engine.digestionUpdate(hit.id, { ...body, maxAgeDays: 0 });
      if (!hit.isEnabled) await engine.digestionEnable(hit.id);
      bits.push(`upd ${eventType}`);
    } else {
      await engine.digestionCreate(body);
      bits.push(`new ${eventType}`);
    }
  }
  return `RATE 0.01 LP · ${bits.join(" · ")}`;
}

/** Sanity bands: one 100 HKD CC_TXN at RATE 0.01 → 1 LP → SILVER. */
export const SANITY_TIER_BODY = {
  isEnabled: true,
  criterion: "LEDGER_BALANCE" as const,
  currency: "LP",
  bands: [
    { code: "NONE", upgradeAt: "0" },
    { code: "SILVER", upgradeAt: "1" },
    { code: "GOLD", upgradeAt: "10" },
  ],
};

/** Enable tiering so 1 LP (one 100 HKD CC_TXN) → SILVER. */
export async function setupTier(): Promise<string> {
  await engine.walletTierPolicyPut(SANITY_TIER_BODY);
  return "ON · LP total · SILVER at 1 · GOLD at 10";
}

/** 1-click: Door + COA + Accounting + Brain + Tier. Then fire a CC_TXN. */
export async function runSanitySetup(): Promise<SanityStep[]> {
  const out: SanityStep[] = [];
  out.push(await step("door", "Door", setupDoor));
  out.push(await step("coa", "COA", setupCoa));
  out.push(await step("accounting", "Accounting", setupAccounting));
  out.push(await step("brain", "Brain", setupBrain));
  out.push(await step("tier", "Tiering", setupTier));
  return out;
}
