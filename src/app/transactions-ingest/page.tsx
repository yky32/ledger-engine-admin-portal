"use client";

import { ResourceCrud } from "@/components/resource/resource-crud";
import { nowIso } from "@/lib/utils";

export default function TransactionsIngestPage() {
  return (
    <ResourceCrud
      title="Fire webhook (upstream sim)"
      description="POST /integrations/webhooks/transactions — play POS. Auto-wallet if ingest-policy allows. Prefer ownerId."
      listPath="/wallets"
      listFilters={[
        {
          name: "ownerId",
          label: "Lookup wallet after fire",
          defaultValue: "",
        },
      ]}
      createPath="/integrations/webhooks/transactions"
      createFields={[
        {
          name: "eventId",
          label: "eventId",
          required: true,
          defaultValue: `admin-${Date.now()}`,
          placeholder: "unique id",
        },
        {
          name: "ownerId",
          label: "ownerId (CUST)",
          required: true,
          placeholder: "01A12345678",
        },
        {
          name: "eventType",
          label: "eventType",
          required: true,
          defaultValue: "PURCHASE",
          placeholder: "PURCHASE / SIGNUP / REDEEM",
        },
        { name: "amount", label: "amount", type: "number", required: true, defaultValue: "200" },
        { name: "currency", label: "currency", required: true, defaultValue: "HKD" },
        {
          name: "occurredAt",
          label: "occurredAt (ISO)",
          required: true,
          defaultValue: nowIso(),
        },
      ]}
      mode="lookup"
      buildListPath={(f) =>
        f.ownerId
          ? `/wallets/${encodeURIComponent(f.ownerId)}?currencies=LP,HKD`
          : "/wallets/_"
      }
      columns={["ownerId", "settlementCurrency", "status", "ownerId"]}
    />
  );
}
