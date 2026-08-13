import { ledger, qs } from "@/lib/api";
import type {
  DigestionRule,
  FailedIngest,
  IngestPolicy,
  IngestResult,
  LedgerEntry,
  MovementView,
  WalletView,
} from "@/lib/types";

export const engine = {
  // wallets
  getWallet: (ownerId: string) =>
    ledger.get<WalletView>(`/wallets/${encodeURIComponent(ownerId)}`),
  onboardWallet: (body: {
    ownerId: string;
    settlementCurrency: string;
    name?: string;
    vanityCode?: string;
    accounts?: { currency: string }[];
  }) => ledger.post<WalletView>("/wallets", body),

  movements: (ownerId: string, params?: Record<string, string | number | undefined>) =>
    ledger.get<MovementView[]>(
      `/wallets/${encodeURIComponent(ownerId)}/movements${qs({ page: 1, size: 50, ...params })}`,
    ),

  asOf: (ownerId: string, asOf?: string, currency?: string) =>
    ledger.get(
      `/wallets/${encodeURIComponent(ownerId)}/balances/as-of${qs({ asOf, currency })}`,
    ),

  hold: (body: {
    ownerId: string;
    currency: string;
    amount: number | string;
    movementKey?: string;
    description?: string;
  }) => ledger.post<MovementView>("/wallets/holds", body),

  release: (body: {
    ownerId: string;
    currency: string;
    amount: number | string;
    movementKey?: string;
    description?: string;
  }) => ledger.post<MovementView>("/wallets/releases", body),

  // ingest
  webhookTxn: (body: Record<string, unknown>) =>
    ledger.post<IngestResult>("/integrations/webhooks/transactions", body),

  failedList: (params?: Record<string, string | number | undefined>) =>
    ledger.get<FailedIngest[]>(
      `/integrations/failed-transactions${qs({ page: 1, size: 50, ...params })}`,
    ),
  failedGet: (id: string | number) =>
    ledger.get<FailedIngest>(`/integrations/failed-transactions/${id}`),
  failedReview: (id: string | number) =>
    ledger.post(`/integrations/failed-transactions/${id}/review`),
  failedReplay: (id: string | number) =>
    ledger.post(`/integrations/failed-transactions/${id}/replay`),
  failedReplayBulk: (ids: (string | number)[]) =>
    ledger.post(`/integrations/failed-transactions/replay`, { ids }),

  legs: (params: { eventId?: string; movementId?: string | number }) =>
    ledger.get<LedgerEntry[]>(`/integrations/ledger-entries${qs(params)}`),

  // config
  digestionRules: () =>
    ledger.get<DigestionRule[]>(`/digestion-rules${qs({ page: 1, size: 200 })}`),
  digestionCreate: (body: Record<string, unknown>) =>
    ledger.post<DigestionRule>("/digestion-rules", body),
  digestionUpdate: (id: string | number, body: Record<string, unknown>) =>
    ledger.put<DigestionRule>(`/digestion-rules/${id}`, body),
  digestionEnable: (id: string | number) =>
    ledger.post(`/digestion-rules/${id}/enable`),

  ingestPolicyGet: () => ledger.get<IngestPolicy>("/ingest-policy"),
  ingestPolicyPut: (body: Partial<IngestPolicy>) =>
    ledger.put<IngestPolicy>("/ingest-policy", body),

  configGet: (target: string, scope = "global") =>
    ledger.get(`/configurations${qs({ target, scope })}`),
  configPut: (body: { name?: string; target: string; scope?: string; value: unknown }) =>
    ledger.put("/configurations", body),

  fxList: () => ledger.get(`/fx-rates${qs({ page: 1, size: 100 })}`),
  movementsList: (params?: Record<string, string | number | undefined>) =>
    ledger.get(`/movements${qs({ page: 1, size: 50, ...params })}`),

  health: async () => {
    // actuator may not be under rewrite with path - try common
    try {
      return await ledger.get("/actuator/health");
    } catch {
      return await ledger.get("/dashboards");
    }
  },
};
