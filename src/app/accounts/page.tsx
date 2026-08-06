"use client";

import { ResourceCrud } from "@/components/resource/resource-crud";

export default function AccountsPage() {
  return (
    <ResourceCrud
      title="COA accounts (/accounts)"
      description="Core double-entry accounts — create via POST /accounts, lookup by id, balance & entries."
      listPath="/accounts/{id}"
      listFilters={[{ name: "id", label: "Account ID", required: true }]}
      mode="lookup"
      createPath="/accounts"
      createFields={[
        { name: "externalReference", label: "External reference", required: true, placeholder: "wallet:user:LP" },
        { name: "name", label: "Name", required: true },
        { name: "type", label: "Type", required: true, placeholder: "ASSET / LIABILITY / EQUITY / REVENUE / EXPENSE" },
        { name: "currency", label: "Currency", required: true, defaultValue: "LP" },
        { name: "allowNegative", label: "Allow negative", placeholder: "true / false", defaultValue: "false" },
      ]}
      detailPathTemplate="/accounts/{id}"
      getRowId={(r) => String(r.id ?? "")}
      columns={["id", "externalReference", "name", "type", "currency", "status"]}
      buildListPath={(f) => (f.id ? `/accounts/${encodeURIComponent(f.id)}` : "/accounts/0")}
    />
  );
}
