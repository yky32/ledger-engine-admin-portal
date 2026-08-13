"use client";
import SimpleResourcePage from "@/components/resource/simple-resource";

export default function Page() {
  return (
    <SimpleResourcePage
      title="Deposits"
      description="POST /movements/deposits · list via GET /movements"
      listPath="/movements"
      createPath="/movements/deposits"
      pageable
      sample={{
        walletId: 0,
        amount: 100,
        currency: "HKD",
        movementKey: "dep-demo-1",
      }}
    />
  );
}
