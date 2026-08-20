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
  { code: "CC_TXN_HKD", profile: "UA_CC", atoms: ["CREDIT_REWARD"], rewardCcy: "HKD" },
  { code: "CC_TXN_LP", profile: "UA_CC", atoms: ["CREDIT_REWARD"], rewardCcy: "LP", note: "primary demo" },
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

/** COA quick-create presets (code ≡ eventType) */
export const COA_PRESETS = [
  {
    code: "CC_TXN_LP",
    name: "CC transaction → LP",
    entity: "01",
    type: "20",
    subType: "00",
    buffer: "00",
    currency: "LP",
  },
  {
    code: "CC_TXN_HKD",
    name: "CC transaction → HKD reward",
    entity: "01",
    type: "20",
    subType: "00",
    buffer: "00",
    currency: "HKD",
  },
  {
    code: "LOAN_DD_LP",
    name: "Loan DD → LP",
    entity: "02",
    type: "20",
    subType: "00",
    buffer: "00",
    currency: "LP",
  },
  {
    code: "DEFAULT",
    name: "Default COA",
    entity: "10",
    type: "20",
    subType: "00",
    buffer: "00",
    currency: "LP",
  },
  {
    code: "LIKE_FB_PAGE",
    name: "Like Facebook page (+5 LP)",
    entity: "01",
    type: "20",
    subType: "00",
    buffer: "00",
    currency: "LP",
  },
] as const;

export const WEBHOOK_EVENT_PRESETS = [
  { eventType: "PURCHASE", label: "PURCHASE (classic grocery demo)" },
  { eventType: "CC_TXN_LP", label: "CC_TXN_LP (recipe + COA)" },
  { eventType: "CC_TXN_HKD", label: "CC_TXN_HKD" },
  { eventType: "LOAN_DD_LP", label: "LOAN_DD_LP" },
  { eventType: "CC_TXN_LP_REDEEM", label: "CC_TXN_LP_REDEEM (credit+burn)" },
  { eventType: "LIKE_FB_PAGE", label: "LIKE_FB_PAGE (+5 LP FIXED, non-financial)" },
] as const;
