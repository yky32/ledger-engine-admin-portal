"use client";
import SimpleResourcePage from "@/components/resource/simple-resource";

export default function Page() {
  return (
    <SimpleResourcePage
      title="Rule executions"
      description="GET/POST /rule-executions"
      listPath="/rule-executions"
      createPath="/rule-executions"
      pageable
      sample={{ name: "demo", orderType: "DEPOSIT", metadata: "{}" }}
    />
  );
}
