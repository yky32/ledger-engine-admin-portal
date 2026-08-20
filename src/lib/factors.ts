/**
 * Factor presets + helpers aligned with ledger-engine docs/FACTORS.md (A–E).
 */

export type FactorPreset = {
  id: string;
  label: string;
  blurb: string;
  /** JSON value (array or FactorSet object) */
  value: unknown;
};

const F = {
  hkd: { id: "F_ccy_HKD", field: "currency", op: "eq", value: "HKD" },
  usd: { id: "F_ccy_USD", field: "currency", op: "eq", value: "USD" },
  mccGrocery: { id: "F_mcc_5411", field: "mcc", op: "in", value: ["5411", "5412"] },
  amtGte100: { id: "F_amt_gte_100", field: "amount", op: "gte", value: 100 },
  amtGte500: { id: "F_amt_gte_500", field: "amount", op: "gte", value: 500 },
  amtBetween: {
    id: "F_amt_band",
    field: "amount",
    op: "between",
    value: { min: 100, max: 999999 },
  },
  age30: { id: "F_age_30", field: "ageDays", op: "lte", value: 30 },
  channelPos: { id: "F_ch_POS", field: "metadata.channel", op: "eq", value: "POS" },
  cashAdv: { id: "F_mcc_cash", field: "mcc", op: "in", value: ["6010", "6011"] },
};

/** Door entryFactors presets */
export const DOOR_FACTOR_PRESETS: FactorPreset[] = [
  {
    id: "empty",
    label: "None (isEnabled only)",
    blurb: "Clear entryFactors",
    value: [],
  },
  {
    id: "and-hkd-pos",
    label: "AND · HKD + POS",
    blurb: "Array = all must match",
    value: [F.hkd, F.channelPos],
  },
  {
    id: "any-ccy",
    label: "any · HKD or USD",
    blurb: "1 of N currencies",
    value: {
      match: "any",
      factors: [F.hkd, F.usd],
    },
  },
  {
    id: "atleast-2",
    label: "atLeast 2 of 5",
    blurb: "UAF multi-signal admit",
    value: {
      match: "atLeast",
      count: 2,
      factors: [F.hkd, F.mccGrocery, F.amtGte100, F.age30, F.channelPos],
    },
  },
  {
    id: "not-cash",
    label: "not · cash advance MCC",
    blurb: "Block cash-advance pack",
    value: {
      match: "not",
      factors: [F.cashAdv],
    },
  },
];

/** Brain whenFactors presets */
export const BRAIN_FACTOR_PRESETS: FactorPreset[] = [
  {
    id: "empty",
    label: "None (legacy columns only)",
    blurb: "minAmount / ccy / mcc / age",
    value: [],
  },
  {
    id: "grocery",
    label: "AND · grocery band",
    blurb: "MCC 5411 + amount band",
    value: [F.mccGrocery, F.amtBetween],
  },
  {
    id: "any-group",
    label: "anyGroup · retail OR big-ticket",
    blurb: "(ccy∧mcc) ∨ amount≥500",
    value: {
      match: "anyGroup",
      groups: [
        { id: "G_retail", factors: [F.hkd, F.mccGrocery] },
        { id: "G_big", factors: [F.amtGte500] },
      ],
    },
  },
  {
    id: "exactly-1",
    label: "exactly 1 of HKD|USD",
    blurb: "Mutually exclusive ccy leaf",
    value: {
      match: "exactly",
      count: 1,
      factors: [F.hkd, F.usd],
    },
  },
  {
    id: "oneOf-packs",
    label: "oneOf · exclusive packs",
    blurb: "Exactly one group wins",
    value: {
      match: "oneOf",
      factors: [
        { id: "P_retail", match: "all", factors: [F.mccGrocery, F.hkd] },
        { id: "P_pos", match: "all", factors: [F.channelPos, F.amtGte100] },
      ],
    },
  },
];

export function prettyFactorJson(value: unknown): string {
  return JSON.stringify(value ?? [], null, 2);
}

export function parseFactorJson(text: string): unknown {
  const parsed = JSON.parse(text || "[]");
  if (!Array.isArray(parsed) && (typeof parsed !== "object" || parsed === null)) {
    throw new Error("Must be a JSON array or FactorSet object");
  }
  return parsed;
}

export function formatMatchedPath(path: unknown): string {
  if (!path) return "—";
  if (Array.isArray(path)) return path.join(" › ");
  return String(path);
}

export const FACTOR_HELP = {
  modes: "all · any · atLeast · exactly · atMost · not · oneOf · anyGroup · allGroups",
  leaves: "currency · mcc · amount · ageDays · eventType · metadata.*",
  ops: "eq · neq · in · nin · gt/gte/lt/lte · between · exists",
};
