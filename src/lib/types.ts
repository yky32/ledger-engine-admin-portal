/** Shared domain types (loose — matches engine Result data shapes). */

export type WalletView = {
  walletId?: number;
  id?: number;
  ownerId?: string;
  vanityCode?: string | null;
  name?: string | null;
  type?: string;
  walletType?: string;
  status?: string;
  settlementCurrency?: string;
  accountId?: number;
  accounts?: AccountView[];
  account?: AccountView;
  balance?: BalanceView;
};

export type AccountView = {
  id?: number;
  currency?: string;
  ledgerBalance?: number | string;
  availableBalance?: number | string;
  status?: string;
  fullNumber?: string;
  name?: string;
  primary?: boolean;
  type?: string;
};

export type BalanceView = {
  accountId?: number;
  currency?: string;
  ledgerBalance?: number | string;
  availableBalance?: number | string;
};

export type MovementView = {
  id?: number;
  movementKey?: string;
  walletId?: number;
  amount?: number | string;
  currency?: string;
  orderType?: string;
  status?: string;
  mode?: string;
  type?: string;
  originatorId?: string;
  targetId?: string;
  metadata?: string;
  createDt?: string;
  updateDt?: string;
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
  eligibleCurrencies?: string | string[];
  maxAgeDays?: number | null;
  pointCurrency?: string;
  formula?: string;
  processType?: string | null;
};

export type IngestPolicy = {
  id?: number;
  isEnabled?: boolean;
  isAutoCreateWallet?: boolean;
  autoWalletSettlementCurrency?: string;
  autoWalletEnsureCurrency?: string;
  autoWalletAssociatedFrom?: string;
  autoWalletNamePrefix?: string;
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
};

export type LedgerEntry = {
  id?: number;
  txnId?: number;
  targetId?: string;
  amount?: number | string;
  direction?: string;
  currency?: string;
  affectsLedger?: boolean;
  affectsAvailable?: boolean;
};

export type IngestResult = {
  status?: string;
  eventId?: string;
  ownerId?: string;
  points?: number | string;
  movementId?: number;
  message?: string;
  [k: string]: unknown;
};
