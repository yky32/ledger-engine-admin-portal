"use client";

import { ResourceCrud } from "@/components/resource/resource-crud";

export default function HoldsPage() {
  return (
    <div className="space-y-8">
      <ResourceCrud
        title="Hold available"
        description="POST /wallets/holds — reduces available only (ledger unchanged). Query wallet by ownerId."
        listPath="/wallets"
        listQueryFields={[
          {
            name: "ownerId",
            label: "Lookup wallet after hold (ownerId)",
            placeholder: "01A…",
          },
        ]}
        listPathBuilder={(f) =>
          f.ownerId
            ? `/wallets/${encodeURIComponent(f.ownerId)}?currencies=LP`
            : "/wallets/_"
        }
        createPath="/wallets/holds"
        createFields={[
          { name: "ownerId", label: "ownerId", required: true },
          { name: "currency", label: "currency", defaultValue: "LP", required: true },
          { name: "amount", label: "amount", type: "number", defaultValue: 1, required: true },
          { name: "movementKey", label: "movementKey (idempotent)" },
          { name: "description", label: "description" },
        ]}
        columns={["ownerId", "settlementCurrency", "status"]}
      />
      <ResourceCrud
        title="Release available"
        description="POST /wallets/releases"
        listPath="/wallets"
        listQueryFields={[
          {
            name: "ownerId",
            label: "Lookup wallet (ownerId)",
            placeholder: "01A…",
          },
        ]}
        listPathBuilder={(f) =>
          f.ownerId
            ? `/wallets/${encodeURIComponent(f.ownerId)}?currencies=LP`
            : "/wallets/_"
        }
        createPath="/wallets/releases"
        createFields={[
          { name: "ownerId", label: "ownerId", required: true },
          { name: "currency", label: "currency", defaultValue: "LP", required: true },
          { name: "amount", label: "amount", type: "number", defaultValue: 1, required: true },
          { name: "movementKey", label: "movementKey" },
          { name: "description", label: "description" },
        ]}
        columns={["ownerId", "settlementCurrency", "status"]}
      />
    </div>
  );
}
