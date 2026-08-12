"use client";

import { ResourceCrud } from "@/components/resource/resource-crud";

export default function WalletsPage() {
  return (
    <ResourceCrud
      title="Wallets (onboarding)"
      description="POST /wallets — create still uses ownerId (stored as ownerId). GET uses ownerId."
      listPath="/wallets"
      listQueryFields={[
        {
          name: "ownerId",
          label: "ownerId (lookup)",
          placeholder: "01A…",
        },
      ]}
      createPath="/wallets"
      createFields={[
        {
          name: "ownerId",
          label: "ownerId",
          required: true,
          placeholder: "01A…",
        },
        {
          name: "settlementCurrency",
          label: "settlementCurrency",
          defaultValue: "HKD",
          required: true,
        },
        { name: "name", label: "name" },
      ]}
      columns={["ownerId", "name", "type", "walletType", "status", "settlementCurrency"]}
      getRowId={(r) => String(r.ownerId ?? r.id ?? "")}
      listPathBuilder={(f) => {
        if (!f.ownerId) return "/wallets/_";
        return `/wallets/${encodeURIComponent(f.ownerId)}?currencies=LP,HKD`;
      }}
    />
  );
}
