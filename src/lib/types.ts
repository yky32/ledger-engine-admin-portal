/**
 * LedgeRX Admin — types aligned to ledger-engine DTOs (main).
 * Source: entity/dto/** + endpoints under com.altech.ledger.endpoint
 */

export type CurrencyCode = string; // engine enum JSON as code: HKD, USD, LP, …

/** POST /wallets — CreateWalletOnboardRequestDto */
export type CreateWalletOnboardBody = {
  ownerId: string;
  settlementCurrency: CurrencyCode;
  name?: string;
  vanityCode?: string;
  /** Product-stream COA profile, omit → DEFAULT */
  coaProfileCode?: string;
  accounts?: AccountOpenSpec[];
  /** Optional client main-account (9089… / 9088…). Omit → engine generates. */
  mainAccount?: string;
};

export type AccountOpenSpec = {
  refCode?: string;
  name?: string;
  primary?: boolean;
  allowNegative?: boolean;
  currency?: CurrencyCode;
};

/** GetWalletOnboardResponseDto */
export type WalletView = {
  walletId?: number;
  ownerId?: string;
  vanityCode?: string | null;
  settlementCurrency?: CurrencyCode;
  status?: string;
  type?: string;
  walletType?: string;
  name?: string;
  account?: WalletAccount;
  balance?: WalletBalance;
  accounts?: WalletAccount[];
  createDt?: string;
  updateDt?: string;
  isActive?: boolean;
};

export type WalletAccount = {
  id?: number;
  fullNumber?: string;
  name?: string;
  primary?: boolean;
  type?: string;
  currency?: CurrencyCode;
  status?: string;
  allowNegative?: boolean;
  ledgerBalance?: number | string;
  availableBalance?: number | string;
  version?: number;
};

export type WalletBalance = {
  accountId?: number;
  currency?: CurrencyCode;
  ledgerBalance?: number | string;
  availableBalance?: number | string;
};

/** GetLedgerMovementResponseDto */
export type MovementView = {
  id?: number;
  movementKey?: string;
  walletId?: number;
  txnId?: number;
  alias?: string;
  originatorId?: string;
  targetId?: string;
  amount?: number | string;
  currency?: CurrencyCode;
  orderType?: string;
  status?: string;
  mode?: string;
  type?: string;
  remarks?: string;
  metadata?: string;
  createDt?: string;
  updateDt?: string;
};

/** MovementDto.DepositRequest — POST /movements/deposits */
export type DepositBody = {
  movementKey: string;
  ownerId: string;
  currency: CurrencyCode;
  amount: number | string;
  mode?: string;
  description?: string;
};

/** MovementDto.WithdrawalRequest */
export type WithdrawalBody = {
  movementKey: string;
  ownerId: string;
  currency: CurrencyCode;
  amount: number | string;
  mode?: string;
  targetId?: string;
  description?: string;
};

/** MovementDto.InWalletTransferRequest */
export type TransferBody = {
  movementKey: string;
  fromOwnerId: string;
  toOwnerId: string;
  currency: CurrencyCode;
  amount: number | string;
  mode?: string;
  description?: string;
};

/** CreateHoldReleaseRequestDto — POST /wallets/holds|releases */
export type HoldReleaseBody = {
  ownerId: string;
  currency: CurrencyCode;
  amount: number | string;
  movementKey?: string;
  description?: string;
};

/**
 * TransactionalEvent — POST /integrations/webhooks/transactions
 * metadata values MUST be strings (Map<String,String>).
 */
export type TransactionalEventBody = {
  eventId: string;
  ownerId: string;
  eventType: string;
  amount: number | string;
  currency: CurrencyCode;
  occurredAt?: string;
  metadata?: Record<string, string>;
  /** Optional UAF main-account (9089… / 9088…). Omit → engine generates. */
  mainAccount?: string;
};

/** IngestionResult + Trust pack B */
export type IngestResult = {
  eventId?: string;
  status?: "EARNED" | "BURNED" | "PROCESSED" | "SKIPPED" | "DUPLICATE" | "ERROR" | string;
  operation?: string;
  reason?: string;
  points?: number | string;
  transactionId?: string;
  walletExternalReference?: string;
  movementId?: number;
  legs?: LedgerLeg[];
  matchedRuleCode?: string;
  eligibilityTrace?: EligibilityTraceEntry[];
  dryRun?: boolean;
  /** Per-event COA — which books this txn updates. */
  coa?: {
    code?: string;
    entity?: string;
    type?: string;
    subType?: string;
    currency?: string;
    accountId?: number;
    fullNumber?: string;
  };
};

export type EligibilityTraceEntry = {
  ruleCode?: string;
  priority?: number;
  matched?: boolean;
  failStep?: string | null;
  detail?: string;
  /** Explain path e.g. ["G12","F1","currency:eq"] */
  matchedPath?: string[] | null;
};

export type LedgerLeg = {
  entryId?: number;
  accountId?: number;
  direction?: string;
  amount?: number | string;
  currency?: CurrencyCode;
};

export type DigestionRule = {
  id?: number;
  code?: string;
  name?: string;
  eventType?: string;
  operation?: string;
  isEnabled?: boolean;
  priority?: number;
  minAmount?: number | string;
  eligibleCurrencies?: string[];
  /** MCC allow-list; empty = any. Webhook metadata.mcc */
  eligibleMccs?: string[];
  maxAgeDays?: number | null;
  pointCurrency?: string;
  formula?: FormulaConfig | string | Record<string, unknown>;
  processType?: string | null;
  whenFactors?: FactorSpec[] | FactorSet | Record<string, unknown> | null;
  createDt?: string;
  updateDt?: string;
};

export type FormulaConfig =
  | {
      type: "AMOUNT";
      multiplier?: number | string;
      cap?: number | string;
      floor?: number | string;
    }
  | {
      type: "RATE";
      rate: number | string;
      multiplier?: number | string;
      cap?: number | string;
      floor?: number | string;
    }
  | {
      type: "FIXED";
      value: number | string;
      multiplier?: number | string;
      cap?: number | string;
      floor?: number | string;
    }
  | {
      type: "LINEAR";
      rate: number | string;
      fixed: number | string;
      multiplier?: number | string;
      cap?: number | string;
      floor?: number | string;
    }
  | {
      type: "TIERED_RATE";
      brackets: Array<{ upTo?: number | string | null; rate: number | string }>;
      multiplier?: number | string;
      cap?: number | string;
      floor?: number | string;
    }
  | {
      type: "TABLE";
      by: string;
      map: Record<string, FormulaConfig | Record<string, unknown>>;
      default?: FormulaConfig | Record<string, unknown>;
      multiplier?: number | string;
      cap?: number | string;
      floor?: number | string;
    };

/** Shared Door/Brain factor predicate */
export type FactorSpec = {
  field?: string;
  op?: string;
  value?: unknown;
  id?: string;
};

/** UAF boolean composition — array means AND all leaves */
export type FactorSet = {
  match?:
    | "all"
    | "any"
    | "atLeast"
    | "exactly"
    | "atMost"
    | "not"
    | "oneOf"
    | "anyGroup"
    | "allGroups"
    | string;
  count?: number;
  min?: number;
  id?: string;
  factors?: Array<FactorSpec | FactorSet>;
  groups?: Array<FactorSpec | (FactorSet & { id?: string })>;
  items?: Array<FactorSpec | FactorSet>;
  rules?: Array<FactorSpec | FactorSet>;
};

export type CreateDigestionRuleBody = {
  code: string;
  name?: string;
  eventType: string;
  operation?: string;
  isEnabled?: boolean;
  priority?: number;
  minAmount?: number | string;
  eligibleCurrencies?: string[];
  eligibleMccs?: string[];
  maxAgeDays?: number;
  pointCurrency?: string;
  formula: FormulaConfig | Record<string, unknown> | string;
  processType?: string;
  whenFactors?: FactorSpec[] | FactorSet | Record<string, unknown>;
};

export type IngestPolicy = {
  id?: number;
  isEnabled?: boolean;
  isAutoCreateWallet?: boolean;
  autoWalletSettlementCurrency?: string;
  autoWalletEnsureCurrency?: string;
  autoWalletAssociatedFrom?: string;
  autoWalletNamePrefix?: string;
  autoWalletCoaProfileCode?: string | null;
  /** Door entry factors — docs/FACTORS.md */
  entryFactors?: FactorSpec[] | FactorSet | null;
  createDt?: string;
  updateDt?: string;
};

export type FailedIngest = {
  id?: number;
  eventId?: string;
  ownerId?: string;
  eventType?: string;
  amount?: number | string;
  currency?: string;
  occurredAt?: string;
  failureCode?: string;
  reason?: string;
  status?: string;
  rawPayload?: unknown;
  createDt?: string;
  updateDt?: string;
};

export type AsOfBalance = {
  ownerId?: string;
  asOf?: string;
  currency?: string;
  ledgerBalance?: number | string;
  availableBalance?: number | string;
  accounts?: unknown[];
};
