"use client";

import { ResourceCrud } from "@/components/resource/resource-crud";

export default function RecipientsPage() {
  return (
    <ResourceCrud
      title="Recipients"
      description="CRUD /recipients"
      listPath="/recipients"
      createPath="/recipients"
      createFields={[
        { name: "transferChannel", label: "Transfer channel", placeholder: "SWIFT / LOCAL / …" },
        { name: "status", label: "Status", defaultValue: "ACTIVE" },
        { name: "metadata", label: "Metadata (JSON)", type: "textarea" },
        { name: "tenantId", label: "Tenant ID", type: "number" },
      ]}
      detailPathTemplate="/recipients/{id}"
      updatePathTemplate="/recipients/{id}/statuses"
      updateMethod="PUT"
      updateFields={[
        { name: "status", label: "Status", required: true },
        { name: "transferChannel", label: "Transfer channel" },
        { name: "metadata", label: "Metadata", type: "textarea" },
      ]}
      deletePathTemplate="/recipients/{id}"
      columns={["id", "transferChannel", "status", "tenantId", "createDt"]}
    />
  );
}
