"use client";
import SimpleResourcePage from "@/components/resource/simple-resource";

export default function Page() {
  return (
    <SimpleResourcePage
      title="Ledger wallets"
      description="GET /ledger-wallets"
      listPath="/ledger-wallets"
    />
  );
}
