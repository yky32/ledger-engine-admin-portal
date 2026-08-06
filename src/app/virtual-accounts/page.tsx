"use client";

import { ResourceCrud } from "@/components/resource/resource-crud";

export default function VirtualAccountsPage() {
  return (
    <ResourceCrud
      title="Virtual accounts"
      description="Applications + VA list — /virtual-accounts"
      listPath="/virtual-accounts"
      createPath="/virtual-accounts/applications"
      createFields={[
        { name: "type", label: "Type", required: true, placeholder: "COLLECTION / …" },
        { name: "extIdentifier", label: "Ext identifier" },
        { name: "extType", label: "Ext type" },
        { name: "remark", label: "Remark" },
        { name: "metadata", label: "Metadata", type: "textarea" },
      ]}
      detailPathTemplate="/virtual-accounts/applications/{id}"
      updatePathTemplate="/virtual-accounts/applications/{id}/status"
      updateMethod="PATCH"
      updateFields={[
        { name: "status", label: "Status", required: true },
        { name: "remark", label: "Remark" },
      ]}
      columns={["id", "status", "type", "extIdentifier", "virtualAccountId", "createDt"]}
    />
  );
}
