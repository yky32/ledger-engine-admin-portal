/**
 * Mirrors engine PostingRecipeCatalog (read-only reference for Admin).
 * Source of truth: ledger-engine PostingRecipeCatalog.java
 */
export type RecipeAtom = "CREDIT_REWARD" | "REDEEM" | "CASHBACK" | "CONVERT_HKD_TO_LP";

export type RecipeDef = {
  code: string;
  profile: string;
  atoms: RecipeAtom[];
  rewardCcy: "HKD" | "LP";
  note?: string;
};

export const POSTING_RECIPES: RecipeDef[] = [
  { code: "CC_TXN", profile: "UA_CC", atoms: ["CREDIT_REWARD"], rewardCcy: "LP", note: "credit card transaction" },
  { code: "CC_CIP", profile: "UA_CC", atoms: ["CREDIT_REWARD"], rewardCcy: "LP", note: "credit card cash instalment" },
  { code: "CC_SIP", profile: "UA_CC", atoms: ["CREDIT_REWARD"], rewardCcy: "LP", note: "credit card spending instalment" },
  { code: "LN_TXN", profile: "UA_LOAN", atoms: ["CREDIT_REWARD"], rewardCcy: "LP", note: "loan transaction" },
  { code: "CC_TXN_HKD", profile: "UA_CC", atoms: ["CREDIT_REWARD"], rewardCcy: "HKD", note: "legacy alias" },
  { code: "CC_TXN_LP", profile: "UA_CC", atoms: ["CREDIT_REWARD"], rewardCcy: "LP", note: "legacy alias" },
  { code: "CC_TXN_HKD_REDEEM", profile: "UA_CC", atoms: ["CREDIT_REWARD", "REDEEM"], rewardCcy: "HKD" },
  { code: "CC_TXN_HKD_CASHBACK", profile: "UA_CC", atoms: ["CREDIT_REWARD", "CASHBACK"], rewardCcy: "HKD" },
  { code: "CC_TXN_LP_REDEEM", profile: "UA_CC", atoms: ["CREDIT_REWARD", "REDEEM"], rewardCcy: "LP" },
  { code: "CC_TXN_LP_CASHBACK", profile: "UA_CC", atoms: ["CREDIT_REWARD", "CASHBACK"], rewardCcy: "LP" },
  {
    code: "CC_TXN_HKD_TO_LP",
    profile: "UA_CC",
    atoms: ["CREDIT_REWARD", "CONVERT_HKD_TO_LP"],
    rewardCcy: "HKD",
  },
  {
    code: "CC_TXN_HKD_LP_REDEEM",
    profile: "UA_CC",
    atoms: ["CREDIT_REWARD", "CONVERT_HKD_TO_LP", "REDEEM"],
    rewardCcy: "HKD",
  },
  {
    code: "CC_TXN_HKD_LP_CASHBACK",
    profile: "UA_CC",
    atoms: ["CREDIT_REWARD", "CONVERT_HKD_TO_LP", "CASHBACK"],
    rewardCcy: "HKD",
  },
  { code: "LOAN_DD_HKD", profile: "UA_LOAN", atoms: ["CREDIT_REWARD"], rewardCcy: "HKD" },
  { code: "LOAN_DD_LP", profile: "UA_LOAN", atoms: ["CREDIT_REWARD"], rewardCcy: "LP" },
  { code: "LOAN_DD_LP_REDEEM", profile: "UA_LOAN", atoms: ["CREDIT_REWARD", "REDEEM"], rewardCcy: "LP" },
  { code: "LIKE_FB_PAGE", profile: "UA_ENGAGE", atoms: ["CREDIT_REWARD"], rewardCcy: "LP", note: "FIXED 5 via Brain" },
  { code: "SOCIAL_LIKE", profile: "UA_ENGAGE", atoms: ["CREDIT_REWARD"], rewardCcy: "LP" },
  { code: "FOLLOW_IG", profile: "UA_ENGAGE", atoms: ["CREDIT_REWARD"], rewardCcy: "LP" },
];

/** COA quick-create presets (chart codes — not webhook eventType). */
export const COA_PRESETS = [
  {
    code: "CUSTOMER_CUST_LP",
    name: "Customer Custodian LP",
    entity: "01",
    type: "01",
    subType: "01",
    buffer: "00",
    currency: "LP",
  },
  {
    code: "CUSTOMER_CUST_HKD",
    name: "Customer Custodian HKD",
    entity: "01",
    type: "01",
    subType: "01",
    buffer: "00",
    currency: "HKD",
  },
] as const;

/**
 * UA house / corporate books.
 * Operating 01-02-01 (movement example). Expense 01-04-02.
 * Operating main-account 9999. Customer custodian 01-01-01 is customer, not house.
 */
export const HOUSE_MAIN_ACCOUNT = "9999";
/** Company wallet ownerId (UAF finance). Legacy PROGRAM is renamed on ensure. */
export const HOUSE_OWNER_ID = "HOUSE";

export const HOUSE_COA_PRESETS = [
  {
    code: "HOUSE_CC_OP_HKD",
    name: "CC Operating HKD",
    entity: "01",
    type: "02",
    subType: "01",
    buffer: "00",
    currency: "HKD",
    poolAllowNegative: true,
    mainAccount: HOUSE_MAIN_ACCOUNT,
  },
  {
    code: "HOUSE_CC_OP_LP",
    name: "CC Operating LP",
    entity: "01",
    type: "02",
    subType: "01",
    buffer: "00",
    currency: "LP",
    poolAllowNegative: true,
    mainAccount: HOUSE_MAIN_ACCOUNT,
  },
  {
    code: "HOUSE_CC_EXP_HKD",
    name: "CC Expense Corporate HKD",
    entity: "01",
    type: "04",
    subType: "02",
    buffer: "00",
    currency: "HKD",
    poolAllowNegative: true,
    mainAccount: HOUSE_MAIN_ACCOUNT,
  },
  {
    code: "HOUSE_CC_EXP_LP",
    name: "CC Expense Corporate LP",
    entity: "01",
    type: "04",
    subType: "02",
    buffer: "00",
    currency: "LP",
    poolAllowNegative: true,
    mainAccount: HOUSE_MAIN_ACCOUNT,
  },
] as const;

export function isHouseCoaCode(code?: string | null): boolean {
  const c = (code ?? "").toUpperCase();
  return c.startsWith("HOUSE_") || c.startsWith("CORP_") || c.startsWith("GL_") || c === "PROGRAM" || c === "HOUSE";
}

/** Shared webhook / Brain / accounting bind codes. Reward is resultCurrency, not a suffix. */
export const EVENT_TYPES = ["CC_TXN", "CC_CIP", "CC_SIP", "LN_TXN"] as const;

export const EVENT_TYPE_LABELS: Record<(typeof EVENT_TYPES)[number], string> = {
  CC_TXN: "credit card transaction",
  CC_CIP: "credit card cash instalment",
  CC_SIP: "credit card spending instalment",
  LN_TXN: "loan transaction",
};

export const WEBHOOK_EVENT_PRESETS = EVENT_TYPES.map((eventType) => ({
  eventType,
  label: EVENT_TYPE_LABELS[eventType],
}));

/** Booking on TransactionalEvent.action — not a new eventType. */
export const INGEST_ACTIONS = [
  { value: "", label: "SPEND (omit)" },
  { value: "REFUND", label: "REFUND — full reverse" },
  { value: "VOID", label: "VOID — full reverse" },
  { value: "CHARGEBACK", label: "CHARGEBACK — full reverse" },
  { value: "PARTIAL", label: "PARTIAL — not booked yet" },
  { value: "ADJUST", label: "ADJUST — not booked yet" },
] as const;
