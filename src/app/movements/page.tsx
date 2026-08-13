"use client";
import SimpleResourcePage from "@/components/resource/simple-resource";

export default function Page() {
  return (
    <SimpleResourcePage
      title="Movements"
      description="GET /movements (1-based page)"
      listPath="/movements"
      pageable
      showFlow="engine"
    />
  );
}
