export type CapStatus = "live" | "partial" | "named" | "slide";

export type CapItem = {
  slide: string;
  engine: string;
  status: CapStatus;
  href?: string;
};

export type CapLane = {
  id: string;
  title: string;
  items: CapItem[];
};

export const CAP_STATUS_LABEL: Record<CapStatus, string> = {
  live: "Live",
  partial: "Partial",
  named: "Named",
  slide: "Slide only",
};

/** UAF Reward System row — LedgeRX. Coupon / CC product services are not this engine. */
export const REWARD_LANES: CapLane[] = [
  {
    id: "ingest",
    title: "Ingest",
    items: [
      {
        slide: "Kafka + RS Process APIs",
        engine: "Webhook + Kafka transaction events",
        status: "live",
        href: "/transactions-ingest",
      },
    ],
  },
  {
    id: "wallet",
    title: "Wallet",
    items: [
      { slide: "Reward Wallet", engine: "1 ownerId → 1 wallet", status: "live", href: "/wallets-list" },
      { slide: "Balance Inquiry", engine: "GET /wallets/{ownerId}", status: "live", href: "/review" },
      {
        slide: "Hold & Release",
        engine: "Freeze available; ledger unchanged (ops / investigation)",
        status: "live",
        href: "/holds",
      },
      {
        slide: "Balance Reversal",
        engine: "REFUND / VOID / CHARGEBACK",
        status: "live",
        href: "/transactions-ingest",
      },
      { slide: "Balance Adjustment", engine: "ADJUST", status: "named" },
      {
        slide: "Reward Enablement",
        engine: "Door isEnabled + auto-wallet",
        status: "live",
        href: "/ingest-policies",
      },
    ],
  },
  {
    id: "engines",
    title: "Engines",
    items: [
      {
        slide: "Transaction Eligibility",
        engine: "Door admit",
        status: "live",
        href: "/ingest-policies",
      },
      {
        slide: "Points Calculation",
        engine: "Brain RATE + multiplier · startsWith / endsWith / contains",
        status: "live",
        href: "/digestion-rules",
      },
      {
        slide: "Earn Engine",
        engine: "Brain EARN + CR 01-01-01",
        status: "live",
        href: "/digestion-rules",
      },
      {
        slide: "Burn Engine",
        engine: "Brain BURN + DR 01-01-01",
        status: "live",
        href: "/digestion-rules",
      },
    ],
  },
  {
    id: "ledger",
    title: "Ledger",
    items: [
      { slide: "Chart of Accounts", engine: "House 01-02 / 01-04 · customer 01-01-01", status: "live", href: "/coa" },
      {
        slide: "Double-Entry Posting",
        engine: "Accounting walk + DE legs",
        status: "live",
        href: "/ledger-entries",
      },
      { slide: "Referral Posting", engine: "—", status: "slide" },
      { slide: "Reconciliation", engine: "—", status: "slide" },
    ],
  },
  {
    id: "audit",
    title: "Audit",
    items: [
      { slide: "Audit Trail", engine: "Movements + ledger entries", status: "partial", href: "/movements" },
      { slide: "Event Log", engine: "Ingest + fail queue", status: "partial", href: "/failed-transactions" },
      { slide: "Change History", engine: "createDt / updateDt on rows", status: "partial" },
      { slide: "Access Log", engine: "—", status: "slide" },
    ],
  },
  {
    id: "config",
    title: "Configuration",
    items: [
      { slide: "Rule Configurator", engine: "Door + Brain + Accounting", status: "live", href: "/ingest-policies" },
      {
        slide: "Wallet Tiering",
        engine: "Unique criterion + currency",
        status: "live",
        href: "/wallet-tier-policies",
      },
      { slide: "Referrer Management", engine: "—", status: "slide" },
      { slide: "Merchant Management", engine: "—", status: "slide" },
    ],
  },
];

export type CaseVerdict = "yes" | "no";

export type PresentedCase = {
  id: string;
  title: string;
  verdict: CaseVerdict;
  how: string;
  href?: string;
  note?: string;
};

/** Use cases from the UAF presentation — fulfill vs cannot. */
export const PRESENTED_CASES: PresentedCase[] = [
  {
    id: "mtr-2x-lp",
    title: "MCC 17 or merchant name starts with MTR → LP only, 2X",
    verdict: "yes",
    how: "Brain rule, priority above default CC_TXN. whenFactors any: mcc eq 17 OR metadata.merchantName startsWith MTR. resultCurrency LP. formula RATE + multiplier 2.",
    href: "/digestion-rules",
    note: "Webhook must send metadata.merchantName (and mcc). Confirm MCC 17 vs 4111/4131. Preset: any · MCC 17 OR merchant MTR*.",
  },
  {
    id: "hold-investigation",
    title: "Hold balances for ops / CC_TXN under investigation",
    verdict: "yes",
    how: "POST /wallets/holds freezes available; ledger stays. Most of the time available = ledger. RELEASE restores spendable. Not a pending earn.",
    href: "/holds",
    note: "Manual today — not auto-tied to a CC_TXN eventId.",
  },
  {
    id: "auth-pending",
    title: "CC_TXN AUTH → ledger only, POST → available",
    verdict: "yes",
    how: "Webhook field applyTo. Omit / BOTH = both balances (default). AUTH: applyTo=LEDGER. POST: new eventId, applyTo=AVAILABLE (available cannot exceed ledger). VOID of a LEDGER earn reverses ledger only.",
    href: "/transactions-ingest",
    note: "Not HOLD. Two fires, two eventIds. POST without AUTH fails (available would exceed ledger).",
  },
];
