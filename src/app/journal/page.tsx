"use client";
import SimpleResourcePage from "@/components/resource/simple-resource";

export default function Page() {
  return (
    <SimpleResourcePage
      title="Journal"
      description="Legacy journal helpers — prefer movements APIs"
      listPath="/movements"
    />
  );
}
