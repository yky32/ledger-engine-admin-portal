"use client";
import SimpleResourcePage from "@/components/resource/simple-resource";

export default function Page() {
  return (
    <SimpleResourcePage
      title="In-wallet transfers"
      description="POST /movements/transfers/in-wallet"
      listPath="/movements"
      createPath="/movements/transfers/in-wallet"
      sample={{
        walletId: 0,
        fromCurrency: "HKD",
        toCurrency: "LP",
        amount: 1,
        movementKey: "xfer-demo-1",
      }}
    />
  );
}
