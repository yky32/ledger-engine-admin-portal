"use client";
import SimpleResourcePage from "@/components/resource/simple-resource";

/** Backend: MovementDto.InWalletTransferRequest */
export default function Page() {
  return (
    <SimpleResourcePage
      title="In-wallet transfers"
      description="POST /movements/transfers/in-wallet — fromOwnerId + toOwnerId (same currency)"
      listPath="/movements"
      createPath="/movements/transfers/in-wallet"
      pageable={false}
      autoload={false}
      showFlow="engine"
      sample={{
        movementKey: "xfer-demo-1",
        fromOwnerId: "01A12345678",
        toOwnerId: "01A87654321",
        currency: "HKD",
        amount: 5,
        mode: "AUTO",
        description: "admin transfer",
      }}
    />
  );
}
