"use client";
import SimpleResourcePage from "@/components/resource/simple-resource";

export default function Page() {
  return (
    <SimpleResourcePage
      title="Rules (legacy)"
      description="GET/POST /rules — not Digestion Brain"
      listPath="/rules"
      createPath="/rules"
      pageable
      sample={{
        name: "demo",
        description: "legacy",
        direction: "CREDIT",
        amount: 1,
        content: "{}",
      }}
    />
  );
}
