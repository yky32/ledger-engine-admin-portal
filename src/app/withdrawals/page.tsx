"use client";
import SimpleResourcePage from "@/components/resource/simple-resource";

export default function Page() {
  return (
    <SimpleResourcePage
      title="Withdrawals"
      description="POST /movements/withdrawals"
      listPath="/movements"
      createPath="/movements/withdrawals"
      sample={{
        walletId: 0,
        amount: 10,
        currency: "HKD",
        movementKey: "wd-demo-1",
      }}
    />
  );
}
