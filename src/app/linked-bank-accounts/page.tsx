"use client";

import { ResourceCrud } from "@/components/resource/resource-crud";

export default function LinkedBankAccountsPage() {
  return (
    <ResourceCrud
      title="Linked bank accounts"
      description="CRUD /linked-bank-accounts"
      listPath="/linked-bank-accounts/my-accounts"
      createPath="/linked-bank-accounts"
      createFields={[
        { name: "status", label: "Status", defaultValue: "ACTIVE" },
        { name: "metadata", label: "Metadata (JSON)", type: "textarea" },
        { name: "tenantId", label: "Tenant ID", type: "number" },
      ]}
      detailPathTemplate="/linked-bank-accounts/{id}"
      updatePathTemplate="/linked-bank-accounts/{id}"
      updateMethod="PUT"
      updateFields={[
        { name: "status", label: "Status" },
        { name: "metadata", label: "Metadata", type: "textarea" },
      ]}
      columns={["id", "status", "tenantId", "createDt"]}
    />
  );
}
