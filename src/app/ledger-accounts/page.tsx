"use client";
import SimpleResourcePage from "@/components/resource/simple-resource";

export default function Page() {
  return (
    <SimpleResourcePage
      title="Ledger accounts"
      description="GET /ledger-accounts"
      listPath="/ledger-accounts"
    />
  );
}
