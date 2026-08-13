"use client";
import SimpleResourcePage from "@/components/resource/simple-resource";

export default function Page() {
  return (
    <SimpleResourcePage
      title="Ledger accounts"
      description="No list-all API — GET /ledger-accounts/{id} or balances. Use Load with a known path via Health/custom later. POST create uses /ledger-accounts."
      listPath="/ledger-accounts/balances"
      createPath="/ledger-accounts"
      pageable={false}
      autoload={false}
      sample={{
        name: "demo",
        type: "LIABILITY",
        currency: "HKD",
      }}
    />
  );
}
