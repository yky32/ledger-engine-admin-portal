"use client";
import SimpleResourcePage from "@/components/resource/simple-resource";

/** Backend: MovementDto.WithdrawalRequest */
export default function Page() {
  return (
    <SimpleResourcePage
      title="Withdrawals"
      description="POST /movements/withdrawals — ownerId + currency + amount + movementKey"
      listPath="/movements"
      createPath="/movements/withdrawals"
      pageable={false}
      autoload={false}
      showFlow="engine"
      sample={{
        movementKey: "wd-demo-1",
        ownerId: "01A12345678",
        currency: "HKD",
        amount: 10,
        mode: "AUTO",
        description: "admin withdraw",
      }}
    />
  );
}
