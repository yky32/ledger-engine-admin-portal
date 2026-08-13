"use client";
import SimpleResourcePage from "@/components/resource/simple-resource";

export default function Page() {
  return (
    <SimpleResourcePage
      title="Ledger wallets (legacy path)"
      description="GET /ledger-wallets · Prefer product /wallets + ownerId for LedgeRX loyalty"
      listPath="/ledger-wallets"
      pageable
    />
  );
}
