"use client";

import { ResourceCrud } from "@/components/resource/resource-crud";

export default function MovementsPage() {
  return (
    <ResourceCrud
      title="Ledger movements"
      description="Query /ledger-accounts/movements — list, get, settle, status."
      listPath="/ledger-accounts/movements"
      listFilters={[
        { name: "walletId", label: "Wallet ID (optional)" },
        { name: "status", label: "Status (optional)" },
      ]}
      detailPathTemplate="/ledger-accounts/movements/{id}"
      updatePathTemplate="/ledger-accounts/movements/{id}/statuses"
      updateMethod="PUT"
      updateFields={[
        { name: "status", label: "Status", required: true, placeholder: "PENDING / SETTLED / FAILED / …" },
      ]}
      columns={["id", "status", "currency", "amount", "type", "mode", "createDt"]}
    />
  );
}
