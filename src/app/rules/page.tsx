"use client";

import { ResourceCrud } from "@/components/resource/resource-crud";

export default function RulesPage() {
  return (
    <ResourceCrud
      title="Rules"
      description="Accounting rules CRUD — POST/GET /rules"
      listPath="/rules"
      createPath="/rules"
      createFields={[
        { name: "name", label: "Name", required: true },
        { name: "description", label: "Description" },
        { name: "direction", label: "Direction", placeholder: "DEBIT / CREDIT" },
        { name: "multiplier", label: "Multiplier", type: "number", defaultValue: "1" },
        { name: "targetAccount", label: "Target account" },
        { name: "content", label: "Content / formula", type: "textarea" },
      ]}
      detailPathTemplate="/rules/{id}"
      columns={["id", "name", "direction", "multiplier", "targetAccount", "createDt"]}
    />
  );
}
