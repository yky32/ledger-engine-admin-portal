"use client";

import { ResourceCrud } from "@/components/resource/resource-crud";

export default function DepositsPage() {
  return (
    <ResourceCrud
      title="Deposits"
      description="Create deposits via /movements/deposits or /ledger/deposits. List uses movement query."
      listPath="/ledger-accounts/movements"
      listFilters={[{ name: "type", label: "Type filter", defaultValue: "DEPOSIT" }]}
      createPath="/movements/deposits"
      createFields={[
        { name: "targetWalletId", label: "Target wallet ID", required: true },
        { name: "currency", label: "Currency", required: true, defaultValue: "LP" },
        { name: "amount", label: "Amount", type: "number", required: true },
        { name: "mode", label: "Mode", defaultValue: "AUTO", placeholder: "AUTO / MANUAL" },
        { name: "originatorId", label: "Originator ID" },
        { name: "movementKey", label: "Movement key (idempotency)" },
        { name: "description", label: "Description" },
      ]}
      detailPathTemplate="/ledger-accounts/movements/{id}"
      columns={["id", "status", "currency", "amount", "type", "targetWalletId"]}
    />
  );
}
