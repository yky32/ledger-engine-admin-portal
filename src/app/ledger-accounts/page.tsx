"use client";
import SimpleResourcePage from "@/components/resource/simple-resource";

export default function Page() {
  return (
    <SimpleResourcePage
      title="Ledger accounts"
      description="GET /ledger-accounts (paged) · POST create"
      listPath="/ledger-accounts"
      createPath="/ledger-accounts"
      pageable
      sample={{
        name: "demo",
        type: "LIABILITY",
        currency: "HKD",
      }}
    />
  );
}
