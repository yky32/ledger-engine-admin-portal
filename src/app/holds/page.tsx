"use client";

import { ResourceCrud } from "@/components/resource/resource-crud";

export default function HoldsPage() {
  return (
    <div className="space-y-8">
      <ResourceCrud
        title="Hold available"
        description="POST /wallets/holds — available ↓, ledger unchanged. Idempotent movementKey."
        listPath="/wallets"
        mode="lookup"
        listFilters={[
          {
            name: "associatedIdentifier",
            label: "Lookup wallet after hold (associatedIdentifier)",
            defaultValue: "",
          },
        ]}
        buildListPath={(f) =>
          f.associatedIdentifier
            ? `/wallets/${encodeURIComponent(f.associatedIdentifier)}?currencies=LP`
            : "/wallets/_"
        }
        createPath="/wallets/holds"
        createFields={[
          { name: "associatedIdentifier", label: "associatedIdentifier", required: true },
          { name: "currency", label: "currency", required: true, defaultValue: "LP" },
          { name: "amount", label: "amount", type: "number", required: true, defaultValue: "1" },
          { name: "movementKey", label: "movementKey (optional)" },
          { name: "description", label: "description" },
        ]}
        columns={["associatedIdentifier", "settlementCurrency", "status"]}
      />
      <ResourceCrud
        title="Release available"
        description="POST /wallets/releases — available ↑ (≤ ledger)."
        listPath="/wallets"
        mode="lookup"
        listFilters={[
          {
            name: "associatedIdentifier",
            label: "Lookup wallet after release",
            defaultValue: "",
          },
        ]}
        buildListPath={(f) =>
          f.associatedIdentifier
            ? `/wallets/${encodeURIComponent(f.associatedIdentifier)}?currencies=LP`
            : "/wallets/_"
        }
        createPath="/wallets/releases"
        createFields={[
          { name: "associatedIdentifier", label: "associatedIdentifier", required: true },
          { name: "currency", label: "currency", required: true, defaultValue: "LP" },
          { name: "amount", label: "amount", type: "number", required: true, defaultValue: "1" },
          { name: "movementKey", label: "movementKey (optional)" },
          { name: "description", label: "description" },
        ]}
        columns={["associatedIdentifier", "settlementCurrency", "status"]}
      />
    </div>
  );
}
