"use client";
import SimpleResourcePage from "@/components/resource/simple-resource";

export default function Page() {
  return (
    <SimpleResourcePage
      title="FX rates"
      description="GET/POST /fx-rates"
      listPath="/fx-rates"
      createPath="/fx-rates"
      pageable
      sample={{ base: "HKD", target: "USD", rate: 0.13 }}
    />
  );
}
