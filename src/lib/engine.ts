/**
 * Typed client for ledger-engine REST (paths/methods/body fields from backend source).
 *
 * Browser → `/api/ledger/*` rewrite → LEDGER_ENGINE_URL
 */
import { ledger, qs } from "@/lib/api";
import type {
  AsOfBalance,
  CreateDigestionRuleBody,
  CreateWalletOnboardBody,
  DepositBody,
  DigestionRule,
  FailedIngest,
  HoldReleaseBody,
  IngestPolicy,
  IngestResult,
  LedgerLeg,
  MovementView,
  TransactionalEventBody,
  TransferBody,
  WalletView,
  WithdrawalBody,
} from "@/lib/types";

function strMeta(meta?: Record<string, unknown>): Record<string, string> | undefined {
  if (!meta) return undefined;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(meta)) {
    if (v === undefined || v === null) continue;
    out[k] = typeof v === "string" ? v : String(v);
  }
  return out;
}

export const engine = {
  /* ─── Health ─── */
  health: async () => {
    try {
      return await ledger.get<unknown>("/actuator/health");
    } catch (e1) {
      try {
        return await ledger.get<unknown>("/dashboards");
      } catch {
        throw e1;
      }
    }
  },

  /* ─── Product wallets (/wallets) ─── */
  /** GET /wallets/{ownerId} */
  getWallet: (ownerId: string) =>
    ledger.get<WalletView>(`/wallets/${encodeURIComponent(ownerId)}`),

  /** GET /wallets?ownerId= */
  getWalletByQuery: (ownerId: string) =>
    ledger.get<WalletView>(`/wallets${qs({ ownerId })}`),

  /** POST /wallets */
  onboardWallet: (body: CreateWalletOnboardBody) =>
    ledger.post<WalletView>("/wallets", body),

  /** GET /wallets/{ownerId}/movements?page&size&… */
  movements: (
    ownerId: string,
    params?: {
      page?: number;
      size?: number;
      orderType?: string;
      currency?: string;
      status?: string;
      startDt?: string;
      endDt?: string;
    },
  ) =>
    ledger.get<MovementView[]>(
      `/wallets/${encodeURIComponent(ownerId)}/movements${qs({
        page: 1,
        size: 50,
        ...params,
      })}`,
    ),

  /** GET /wallets/{ownerId}/balances/as-of?at&currency */
  asOf: (ownerId: string, at?: string, currency?: string) =>
    ledger.get<AsOfBalance>(
      `/wallets/${encodeURIComponent(ownerId)}/balances/as-of${qs({ at, currency })}`,
    ),

  /** POST /wallets/holds */
  hold: (body: HoldReleaseBody) => ledger.post<MovementView>("/wallets/holds", body),

  /** POST /wallets/releases */
  release: (body: HoldReleaseBody) => ledger.post<MovementView>("/wallets/releases", body),

  /* ─── Ingest / loyalty ─── */
  /**
   * POST /integrations/webhooks/transactions
   * Body: TransactionalEvent (ownerId, eventId, eventType, amount, currency, occurredAt?, metadata?)
   */
  webhookTxn: (body: TransactionalEventBody | Record<string, unknown>) => {
    const b = { ...body } as Record<string, unknown>;
    if (b.metadata && typeof b.metadata === "object") {
      b.metadata = strMeta(b.metadata as Record<string, unknown>);
    }
    // ensure amount is number for Jackson BigDecimal
    if (typeof b.amount === "string" && b.amount !== "") {
      b.amount = Number(b.amount);
    }
    return ledger.post<IngestResult>("/integrations/webhooks/transactions", b);
  },

  /** GET /integrations/failed-transactions */
  failedList: (params?: {
    page?: number;
    size?: number;
    status?: string;
    ownerId?: string;
    failureCode?: string;
    eventId?: string;
  }) =>
    ledger.get<FailedIngest[]>(
      `/integrations/failed-transactions${qs({ page: 1, size: 50, ...params })}`,
    ),

  failedGet: (id: string | number) =>
    ledger.get<FailedIngest>(`/integrations/failed-transactions/${id}`),

  /** POST /integrations/failed-transactions/{id}/review */
  failedReview: (id: string | number) =>
    ledger.post(`/integrations/failed-transactions/${id}/review`),

  /** POST /integrations/failed-transactions/{id}/replay */
  failedReplay: (id: string | number) =>
    ledger.post(`/integrations/failed-transactions/${id}/replay`),

  /** POST /integrations/failed-transactions/replay  body: { ids: number[] } */
  failedReplayBulk: (ids: number[]) =>
    ledger.post(`/integrations/failed-transactions/replay`, { ids }),

  /**
   * GET /integrations/ledger-entries?eventId= | ?movementId=
   * Exactly one of eventId | movementId required.
   */
  legs: (params: { eventId?: string; movementId?: string | number; operation?: string }) => {
    if (!params.eventId && params.movementId == null) {
      return Promise.reject(new Error("legs: provide eventId or movementId"));
    }
    if (params.eventId && params.movementId != null) {
      return Promise.reject(new Error("legs: provide only one of eventId or movementId"));
    }
    return ledger.get<LedgerLeg[]>(`/integrations/ledger-entries${qs(params)}`);
  },

  /* ─── Digestion (Brain) ─── */
  /** GET /digestion-rules?enabledOnly&code */
  digestionRules: (params?: { enabledOnly?: boolean; code?: string }) =>
    ledger.get<DigestionRule[] | DigestionRule>(`/digestion-rules${qs(params || {})}`),

  digestionGet: (id: number | string) =>
    ledger.get<DigestionRule>(`/digestion-rules/${id}`),

  /** POST /digestion-rules */
  digestionCreate: (body: CreateDigestionRuleBody | Record<string, unknown>) =>
    ledger.post<DigestionRule>("/digestion-rules", body),

  /** PUT /digestion-rules/{id} */
  digestionUpdate: (id: string | number, body: Record<string, unknown>) =>
    ledger.put<DigestionRule>(`/digestion-rules/${id}`, body),

  digestionEnable: (id: string | number) =>
    ledger.post<DigestionRule>(`/digestion-rules/${id}/enable`),

  digestionDisable: (id: string | number) =>
    ledger.post<DigestionRule>(`/digestion-rules/${id}/disable`),

  /* ─── Door ─── */
  /** GET /ingest-policy */
  ingestPolicyGet: () => ledger.get<IngestPolicy>("/ingest-policy"),

  /** PUT /ingest-policy */
  ingestPolicyPut: (body: Partial<IngestPolicy>) =>
    ledger.put<IngestPolicy>("/ingest-policy", body),

  /* ─── Product movements (/movements) — require ownerId, NOT walletId on write ─── */
  /** GET /movements?walletId= (required) */
  movementsListByWalletId: (walletId: number | string, page = 1, size = 50) =>
    ledger.get(`/movements${qs({ walletId, page, size })}`),

  deposit: (body: DepositBody) => ledger.post("/movements/deposits", body),
  withdraw: (body: WithdrawalBody) => ledger.post("/movements/withdrawals", body),
  transferInWallet: (body: TransferBody) =>
    ledger.post("/movements/transfers/in-wallet", body),

  /* ─── Config / FX / rules ─── */
  /** GET /configurations?target&scope=global */
  configGet: (target: string, scope = "global") =>
    ledger.get(`/configurations${qs({ target, scope })}`),

  /** PUT /configurations  body: name?, target, scope?, value */
  configPut: (body: {
    name?: string;
    target: string;
    scope?: string;
    value: unknown;
  }) => ledger.put("/configurations", body),

  fxList: (page = 1, size = 100) => ledger.get(`/fx-rates${qs({ page, size })}`),
  fxCreate: (body: { base: string; target: string; rate: number | string }) =>
    ledger.post("/fx-rates", body),

  rulesList: (page = 1, size = 50) => ledger.get(`/rules${qs({ page, size })}`),
  ruleCreate: (body: Record<string, unknown>) => ledger.post("/rules", body),

  ruleExecutionsList: (page = 1, size = 50) =>
    ledger.get(`/rule-executions${qs({ page, size })}`),

  /* ─── Legacy ledger-wallets / ledger-accounts (exist on backend) ─── */
  ledgerWalletsList: (page = 1, size = 50) =>
    ledger.get(`/ledger-wallets${qs({ page, size })}`),
  ledgerAccountsList: (page = 1, size = 50) =>
    ledger.get(`/ledger-accounts${qs({ page, size })}`),
};
