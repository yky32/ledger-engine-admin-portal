"use client";

import { ResourceCrud } from "@/components/resource/resource-crud";

export default function WalletsPage() {
  return (
    <ResourceCrud
      title="Wallets (onboarding)"
      description="Phase 1 customer wallets — POST /wallets, GET by owner, batch onboard."
      listPath="/wallets"
      listFilters={[
        { name: "ownerId", label: "Owner ID", required: true, defaultValue: "" },
      ]}
      createPath="/wallets"
      createFields={[
        { name: "userId", label: "User ID", required: true, placeholder: "CUST-10001" },
        { name: "currency", label: "Currency", required: true, defaultValue: "LP" },
        { name: "name", label: "Name", placeholder: "Display name" },
        { name: "externalId", label: "External ID" },
        { name: "externalType", label: "External type", defaultValue: "crm" },
      ]}
      detailPathTemplate="/wallets/{id}"
      getRowId={(r) => `${r.ownerId ?? r.userId}/${r.currency ?? "LP"}`}
      columns={["walletId", "ownerId", "currency", "status", "alias", "externalId", "externalType"]}
      mode="lookup"
      buildListPath={(f) => {
        if (!f.ownerId) return "/wallets?ownerId=";
        return `/wallets?ownerId=${encodeURIComponent(f.ownerId)}`;
      }}
    />
  );
}
