"use client";
import SimpleResourcePage from "@/components/resource/simple-resource";

/** Backend: MovementDto.DepositRequest */
export default function Page() {
  return (
    <SimpleResourcePage
      title="Deposits"
      description="POST /movements/deposits — body uses ownerId (not walletId). List needs GET /movements?walletId="
      listPath="/movements"
      createPath="/movements/deposits"
      pageable={false}
      autoload={false}
      sample={{
        movementKey: "dep-demo-1",
        ownerId: "01A12345678",
        currency: "HKD",
        amount: 100,
        mode: "AUTO",
        description: "admin deposit",
      }}
    />
  );
}
