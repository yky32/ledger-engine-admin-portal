"use client";

import { ResourceCrud } from "@/components/resource/resource-crud";

export default function RuleExecutionsPage() {
  return (
    <ResourceCrud
      title="Rule executions"
      description="POST/GET /rule-executions"
      listPath="/rule-executions"
      createPath="/rule-executions"
      createFields={[
        { name: "name", label: "Name", required: true },
        { name: "description", label: "Description" },
        { name: "orderType", label: "Order type", required: true, placeholder: "PURCHASE / REDEEM / …" },
        { name: "metadata", label: "Metadata (JSON string)", type: "textarea" },
      ]}
      detailPathTemplate="/rule-executions/{id}"
      columns={["id", "name", "orderType", "createDt"]}
    />
  );
}
