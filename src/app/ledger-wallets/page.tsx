"use client";

import { ResourceCrud } from "@/components/resource/resource-crud";

export default function LedgerWalletsPage() {
  return (
    <ResourceCrud
      title="Ledger wallets"
      description="Parity API /ledger-wallets — list, create, status update, activations."
      listPath="/ledger-wallets"
      createPath="/ledger-wallets"
      createFields={[
        { name: "accountId", label: "Account ID", type: "number", required: true },
        { name: "ownerId", label: "Owner ID", required: true },
        { name: "currency", label: "Currency", defaultValue: "LP", required: true },
        { name: "nickname", label: "Nickname" },
        { name: "extIdentifier", label: "Ext identifier" },
        { name: "extType", label: "Ext type" },
        { name: "type", label: "Association type", placeholder: "PRIMARY / SECONDARY / …" },
      ]}
      detailPathTemplate="/ledger-wallets/{id}"
      updatePathTemplate="/ledger-wallets/{id}/statuses"
      updateMethod="PUT"
      updateFields={[
        { name: "status", label: "Status", required: true, placeholder: "ACTIVE / FROZEN / CLOSED" },
        { name: "nickname", label: "Nickname" },
      ]}
      columns={["id", "alias", "ownerId", "currency", "status", "accountId", "nickname"]}
    />
  );
}
