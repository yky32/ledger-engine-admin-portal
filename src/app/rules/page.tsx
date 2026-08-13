"use client";
import SimpleResourcePage from "@/components/resource/simple-resource";

export default function Page() {
  return (
    <SimpleResourcePage
      title="Rules"
      description="GET/POST /rules"
      listPath="/rules"
      createPath="/rules"
      sample={{
        name: "demo-rule",
        description: "demo",
        direction: "CREDIT",
        multiplier: 1,
        targetAccount: "PROGRAM",
        content: "{}",
      }}
    />
  );
}
