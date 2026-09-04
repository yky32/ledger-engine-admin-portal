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

export type FactorGate = {
  mccs: string;
  currencies: string;
  ageLte: string;
  amtMin: string;
  amtMax: string;
  channel?: string;
  /** CSV of webhook eventType codes. Blank = any. Same token as Brain / accounting. */
  eventTypes?: string;
};

export const EMPTY_FACTOR_GATE: FactorGate = {
  mccs: "",
  currencies: "",
  ageLte: "",
  amtMin: "",
  amtMax: "",
  channel: "",
  eventTypes: "",
};

export function parseCsv(s: string): string[] {
  return s
    .split(/[,\s]+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

export function numOrNull(s: string): number | null {
  if (!s.trim()) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function gateBits(g: FactorGate): string[] {
  const bits: string[] = [];
  bits.push(g.mccs.trim() ? `MCC ${g.mccs}` : "any MCC");
  bits.push(g.currencies.trim() ? g.currencies : "any ccy");
  bits.push(g.ageLte.trim() ? `age ≤ ${g.ageLte}d` : "any age");
  if (g.amtMin.trim() && g.amtMax.trim()) bits.push(`amt ${g.amtMin}–${g.amtMax}`);
  else if (g.amtMin.trim()) bits.push(`amt ≥ ${g.amtMin}`);
  else if (g.amtMax.trim()) bits.push(`amt ≤ ${g.amtMax}`);
  else bits.push("any amount");
  if (g.channel?.trim()) bits.push(`channel ${g.channel.trim()}`);
  bits.push(g.eventTypes?.trim() ? `eventType ${g.eventTypes}` : "any eventType");
  return bits;
}

export function gateIsOpen(g: FactorGate): boolean {
  return (
    !g.mccs.trim() &&
    !g.currencies.trim() &&
    !g.ageLte.trim() &&
    !g.amtMin.trim() &&
    !g.amtMax.trim() &&
    !g.channel?.trim() &&
    !g.eventTypes?.trim()
  );
}

/** Inverse of buildMccCcyAgeAmountFactors. Complex FactorSets → null (use Advanced JSON). */
export function parseAndGates(factors: unknown): FactorGate | null {
  if (factors == null) return { ...EMPTY_FACTOR_GATE };
  let leaves: Record<string, unknown>[];
  if (Array.isArray(factors)) {
    if (factors.length === 0) return { ...EMPTY_FACTOR_GATE };
    leaves = [];
    for (const f of factors) {
      if (!f || typeof f !== "object" || !("field" in f)) return null;
      leaves.push(f as Record<string, unknown>);
    }
  } else if (typeof factors === "object") {
    const o = factors as Record<string, unknown>;
    const match = String(o.match ?? "all");
    if (match !== "all") return null;
    if (!Array.isArray(o.factors)) return null;
    leaves = [];
    for (const f of o.factors) {
      if (!f || typeof f !== "object" || !("field" in f)) return null;
      leaves.push(f as Record<string, unknown>);
    }
    if (leaves.length === 0) return { ...EMPTY_FACTOR_GATE };
  } else {
    return null;
  }

  const gate: FactorGate = { ...EMPTY_FACTOR_GATE };
  const seen = new Set<string>();
  for (const leaf of leaves) {
    const field = String(leaf.field ?? "");
    const op = String(leaf.op ?? "eq");
    const val = leaf.value;
    if (!field || seen.has(field)) return null;
    seen.add(field);
    if (field === "mcc") {
      if (op === "eq") gate.mccs = String(val ?? "");
      else if (op === "in" && Array.isArray(val)) gate.mccs = val.map(String).join(",");
      else return null;
    } else if (field === "currency") {
      if (op === "eq") gate.currencies = String(val ?? "");
      else if (op === "in" && Array.isArray(val)) gate.currencies = val.map(String).join(",");
      else return null;
    } else if (field === "ageDays") {
      if (op !== "lte") return null;
      gate.ageLte = String(val ?? "");
    } else if (field === "amount") {
      if (op === "gte") gate.amtMin = String(val ?? "");
      else if (op === "lte") gate.amtMax = String(val ?? "");
      else if (op === "between" && val && typeof val === "object") {
        const b = val as { min?: unknown; max?: unknown };
        gate.amtMin = b.min != null ? String(b.min) : "";
        gate.amtMax = b.max != null ? String(b.max) : "";
      } else return null;
    } else if (field === "metadata.channel") {
      if (op !== "eq") return null;
      gate.channel = String(val ?? "");
    } else if (field === "eventType") {
      if (op === "eq") gate.eventTypes = String(val ?? "").toUpperCase();
      else if (op === "in" && Array.isArray(val))
        gate.eventTypes = val.map((x) => String(x).toUpperCase()).join(",");
      else return null;
    } else {
      return null;
    }
  }
  return gate;
}

/** AND gate from MCC × ccy × ageDays × amount (+ optional channel). Blank dims omitted. */
export function buildMccCcyAgeAmountFactors(opts: {
  mccs: string[];
  currencies: string[];
  ageLte?: number | null;
  amtMin?: number | null;
  amtMax?: number | null;
  channel?: string | null;
  eventTypes?: string[];
}): unknown[] {
  const factors: Record<string, unknown>[] = [];
  if (opts.mccs.length === 1) {
    factors.push({
      id: `F_mcc_${opts.mccs[0]}`,
      field: "mcc",
      op: "eq",
      value: opts.mccs[0],
    });
  } else if (opts.mccs.length > 1) {
    factors.push({
      id: "F_mcc_in",
      field: "mcc",
      op: "in",
      value: opts.mccs,
    });
  }
  if (opts.currencies.length === 1) {
    factors.push({
      id: `F_ccy_${opts.currencies[0]}`,
      field: "currency",
      op: "eq",
      value: opts.currencies[0],
    });
  } else if (opts.currencies.length > 1) {
    factors.push({
      id: "F_ccy_in",
      field: "currency",
      op: "in",
      value: opts.currencies,
    });
  }
  if (opts.ageLte != null && Number.isFinite(opts.ageLte)) {
    factors.push({
      id: "F_age_lte",
      field: "ageDays",
      op: "lte",
      value: opts.ageLte,
    });
  }
  const hasMin = opts.amtMin != null && Number.isFinite(opts.amtMin);
  const hasMax = opts.amtMax != null && Number.isFinite(opts.amtMax);
  if (hasMin && hasMax) {
    factors.push({
      id: "F_amt_band",
      field: "amount",
      op: "between",
      value: { min: opts.amtMin, max: opts.amtMax },
    });
  } else if (hasMin) {
    factors.push({
      id: "F_amt_gte",
      field: "amount",
      op: "gte",
      value: opts.amtMin,
    });
  } else if (hasMax) {
    factors.push({
      id: "F_amt_lte",
      field: "amount",
      op: "lte",
      value: opts.amtMax,
    });
  }
  const eventTypes = (opts.eventTypes ?? []).map((s) => s.trim().toUpperCase()).filter(Boolean);
  if (eventTypes.length === 1) {
    factors.push({
      id: `F_et_${eventTypes[0]}`,
      field: "eventType",
      op: "eq",
      value: eventTypes[0],
    });
  } else if (eventTypes.length > 1) {
    factors.push({
      id: "F_et_in",
      field: "eventType",
      op: "in",
      value: eventTypes,
    });
  }
  const channel = opts.channel?.trim();
  if (channel) {
    factors.push({
      id: `F_ch_${channel}`,
      field: "metadata.channel",
      op: "eq",
      value: channel,
    });
  }
  return factors;
}

export function factorsFromGate(g: FactorGate): unknown[] {
  return buildMccCcyAgeAmountFactors({
    mccs: parseCsv(g.mccs),
    currencies: parseCsv(g.currencies).map((s) => s.toUpperCase()),
    ageLte: numOrNull(g.ageLte),
    amtMin: numOrNull(g.amtMin),
    amtMax: numOrNull(g.amtMax),
    channel: g.channel,
    eventTypes: parseCsv(g.eventTypes ?? "").map((s) => s.toUpperCase()),
  });
}

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
  {
    id: "mtr-or-mcc17",
    label: "any · MCC 17 OR merchant MTR*",
    blurb: "startsWith metadata.merchantName MTR",
    value: {
      match: "any",
      factors: [
        { id: "F_mcc_17", field: "mcc", op: "eq", value: "17" },
        { id: "F_mtr", field: "metadata.merchantName", op: "startsWith", value: "MTR" },
      ],
    },
  },
];

/** Ops-readable whenFactors: "MCC 101 · HKD · age ≤ 30 · amt ≥ 1". */
export function humanizeWhenFactors(w: unknown): string {
  if (w == null) return "always";
  if (Array.isArray(w)) {
    if (w.length === 0) return "always";
    return w.map(humanizeFactorNode).filter(Boolean).join(" · ");
  }
  return humanizeFactorNode(w) || "set";
}

function humanizeFactorNode(node: unknown): string {
  if (node == null) return "";
  if (Array.isArray(node)) return node.map(humanizeFactorNode).filter(Boolean).join(" · ");
  if (typeof node !== "object") return String(node);
  const o = node as Record<string, unknown>;
  if (typeof o.field === "string" && o.field) return humanizeLeaf(o);
  const match = String(o.match ?? "all");
  const kids = o.factors ?? o.groups ?? o.items ?? o.rules;
  const inner = humanizeFactorNode(kids);
  if (match === "all") return inner || "all";
  if (match === "any") return inner ? `any(${inner})` : "any";
  if (match === "not") return inner ? `not(${inner})` : "not";
  if (match === "anyGroup") return inner ? `anyGroup(${inner})` : "anyGroup";
  if (match === "allGroups") return inner ? `allGroups(${inner})` : "allGroups";
  if (match === "oneOf") return inner ? `oneOf(${inner})` : "oneOf";
  if (match === "atLeast" || match === "exactly" || match === "atMost") {
    const n = o.count ?? o.min ?? "";
    return inner ? `${match} ${n} (${inner})` : `${match} ${n}`.trim();
  }
  return inner ? `${match}(${inner})` : match;
}

function humanizeLeaf(o: Record<string, unknown>): string {
  const field = String(o.field ?? "");
  const op = String(o.op ?? "eq");
  const val = o.value;
  const name =
    field === "currency"
      ? ""
      : field === "mcc"
        ? "MCC"
        : field === "ageDays"
          ? "age"
          : field === "amount"
            ? "amt"
            : field.startsWith("metadata.")
              ? field.slice("metadata.".length)
              : field;
  const fmt = (v: unknown) => {
    const raw = Array.isArray(v) ? v.join(",") : String(v ?? "");
    return field === "ageDays" && raw ? `${raw}d` : raw;
  };
  if (op === "between" && val && typeof val === "object") {
    const b = val as { min?: unknown; max?: unknown };
    return `${name} ${b.min}–${b.max}`.trim();
  }
  const sym: Record<string, string> = {
    eq: "",
    neq: "≠",
    in: "",
    nin: "not",
    gte: "≥",
    lte: "≤",
    gt: ">",
    lt: "<",
    exists: "exists",
  };
  const s = sym[op] ?? op;
  return [name, s, op === "exists" ? "" : fmt(val)].filter(Boolean).join(" ");
}

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
  ops: "eq · neq · in · nin · gt/gte/lt/lte · between · exists · startsWith · endsWith · contains",
};
