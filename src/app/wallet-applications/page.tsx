"use client";

import { ResourceCrud } from "@/components/resource/resource-crud";

export default function WalletApplicationsPage() {
  return (
    <ResourceCrud
      title="Wallet applications"
      description="/ledger-wallet-applications — create, list, complete/fail"
      listPath="/ledger-wallet-applications"
      createPath="/ledger-wallet-applications"
      createFields={[
        { name: "ownerId", label: "Owner ID", required: true },
        { name: "currency", label: "Currency", defaultValue: "LP" },
        { name: "metadata", label: "Metadata", type: "textarea" },
      ]}
      detailPathTemplate="/ledger-wallet-applications/{id}"
      updatePathTemplate="/ledger-wallet-applications/{id}/complete"
      updateMethod="POST"
      updateFields={[{ name: "remark", label: "Remark (optional)" }]}
      columns={["id", "status", "ownerId", "currency", "createDt"]}
    />
  );
}
