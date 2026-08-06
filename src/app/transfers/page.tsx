"use client";

import { ResourceCrud } from "@/components/resource/resource-crud";

export default function TransfersPage() {
  return (
    <ResourceCrud
      title="In-wallet transfers"
      description="POST /movements/transfers/in-wallet"
      listPath="/ledger-accounts/movements"
      createPath="/movements/transfers/in-wallet"
      createFields={[
        { name: "fromWalletId", label: "From wallet ID", required: true },
        { name: "toWalletId", label: "To wallet ID", required: true },
        { name: "currency", label: "Currency", required: true, defaultValue: "LP" },
        { name: "amount", label: "Amount", type: "number", required: true },
        { name: "mode", label: "Mode", defaultValue: "AUTO" },
        { name: "movementKey", label: "Movement key" },
        { name: "description", label: "Description" },
      ]}
      detailPathTemplate="/ledger-accounts/movements/{id}"
      columns={["id", "status", "currency", "amount", "type"]}
    />
  );
}
