"use client";

import { ResourceCrud } from "@/components/resource/resource-crud";

export default function WalletsPage() {
  return (
    <ResourceCrud
      title="Wallets (onboarding)"
      description="1 CUST → 1 Wallet. Create with settlementCurrency + optional LP account. Lookup by path id."
      listPath="/wallets"
      listFilters={[
        {
          name: "associatedIdentifier",
          label: "associatedIdentifier (required to lookup)",
          required: true,
          defaultValue: "",
        },
      ]}
      createPath="/wallets"
      createFields={[
        {
          name: "associatedIdentifier",
          label: "associatedIdentifier",
          required: true,
          placeholder: "01A12345678",
        },
        {
          name: "settlementCurrency",
          label: "settlementCurrency",
          required: true,
          defaultValue: "HKD",
        },
        { name: "name", label: "name", placeholder: "Display name" },
        { name: "associatedFrom", label: "associatedFrom", defaultValue: "CRM" },
        {
          name: "accounts",
          label: 'accounts JSON (optional LP book)',
          type: "textarea",
          defaultValue:
            '[{"currency":"LP","name":"Loyalty","refCode":"LP"}]',
        },
      ]}
      detailPathTemplate="/wallets/{id}"
      getRowId={(r) => String(r.associatedIdentifier ?? r.ownerId ?? r.id ?? "")}
      columns={[
        "id",
        "associatedIdentifier",
        "ownerId",
        "settlementCurrency",
        "status",
        "name",
      ]}
      mode="lookup"
      buildListPath={(f) => {
        if (!f.associatedIdentifier) return "/wallets/_";
        return `/wallets/${encodeURIComponent(f.associatedIdentifier)}?currencies=LP,HKD`;
      }}
    />
  );
}
