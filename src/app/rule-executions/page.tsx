"use client";
import SimpleResourcePage from "@/components/resource/simple-resource";

export default function Page() {
  return (
    <SimpleResourcePage
      title="Rule executions"
      description="GET/POST /rule-executions"
      listPath="/rule-executions"
      createPath="/rule-executions"
      sample={{
        name: "DEPOSIT_DEFAULT",
        description: "demo",
        orderType: "DEPOSIT",
        metadata: "[]",
      }}
    />
  );
}
