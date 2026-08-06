"use client";

import { ResourceCrud } from "@/components/resource/resource-crud";

export default function TransactionsIngestPage() {
  return (
    <ResourceCrud
      title="Transaction ingest (webhook)"
      description="Phase 2 loyalty events — POST /integrations/webhooks/transactions. Wallet must already exist."
      listPath="/wallets"
      listFilters={[{ name: "ownerId", label: "Lookup wallet ownerId (optional)" }]}
      createPath="/integrations/webhooks/transactions"
      createFields={[
        { name: "eventId", label: "Event ID", required: true, placeholder: "order-001" },
        { name: "userId", label: "User ID", required: true },
        { name: "eventType", label: "Event type", required: true, defaultValue: "PURCHASE", placeholder: "PURCHASE / REDEEM / SIGNUP" },
        { name: "amount", label: "Amount", type: "number", required: true },
        { name: "currency", label: "Currency", required: true, defaultValue: "LP" },
        { name: "occurredAt", label: "Occurred at (ISO)", placeholder: "2026-08-06T00:00:00Z" },
      ]}
      mode="lookup"
      buildListPath={(f) =>
        f.ownerId ? `/wallets?ownerId=${encodeURIComponent(f.ownerId)}` : "/wallets?ownerId=_none_"
      }
      columns={["walletId", "ownerId", "currency", "status"]}
    />
  );
}
