"use client";
import SimpleResourcePage from "@/components/resource/simple-resource";

export default function Page() {
  return (
    <SimpleResourcePage
      title="Movements"
      description="GET /movements"
      listPath="/movements"
    />
  );
}
