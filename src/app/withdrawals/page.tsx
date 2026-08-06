"use client";

import { ResourceCrud } from "@/components/resource/resource-crud";

export default function WithdrawalsPage() {
  return (
    <ResourceCrud
      title="Withdrawals"
      description="POST /movements/withdrawals (and /ledger/withdrawals)."
      listPath="/ledger-accounts/movements"
      createPath="/movements/withdrawals"
      createFields={[
        { name: "originatorWalletId", label: "Originator wallet ID", required: true },
        { name: "currency", label: "Currency", required: true, defaultValue: "LP" },
        { name: "amount", label: "Amount", type: "number", required: true },
        { name: "mode", label: "Mode", defaultValue: "AUTO" },
        { name: "targetId", label: "Target ID" },
        { name: "movementKey", label: "Movement key" },
        { name: "description", label: "Description" },
      ]}
      detailPathTemplate="/ledger-accounts/movements/{id}"
      columns={["id", "status", "currency", "amount", "type"]}
    />
  );
}
