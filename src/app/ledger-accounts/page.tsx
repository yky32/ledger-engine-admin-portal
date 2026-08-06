"use client";

import { ResourceCrud } from "@/components/resource/resource-crud";

export default function LedgerAccountsPage() {
  return (
    <ResourceCrud
      title="Ledger accounts"
      description="COA-style /ledger-accounts — create, get, list balances."
      listPath="/ledger-accounts"
      createPath="/ledger-accounts"
      createFields={[
        { name: "entity", label: "Entity", placeholder: "e.g. 01" },
        { name: "type", label: "Type", placeholder: "ASSET / LIABILITY / …" },
        { name: "subType", label: "Sub type" },
        { name: "buffer", label: "Buffer" },
        { name: "mainAccount", label: "Main account" },
        { name: "subAccount", label: "Sub account" },
        { name: "currency", label: "Currency", required: true, defaultValue: "LP" },
      ]}
      detailPathTemplate="/ledger-accounts/{id}"
      columns={["id", "fullNumber", "currency", "status", "ledgerBalance", "availableBalance", "type"]}
    />
  );
}
