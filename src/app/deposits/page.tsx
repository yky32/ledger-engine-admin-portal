"use client";
import SimpleResourcePage from "@/components/resource/simple-resource";

export default function Page() {
  return (
    <SimpleResourcePage
      title="Deposits"
      description="POST /movements/deposits or /ledger/deposits"
      listPath="/movements"
      createPath="/movements/deposits"
      sample={{
        walletId: 0,
        amount: 100,
        currency: "HKD",
        movementKey: "dep-demo-1",
      }}
    />
  );
}
