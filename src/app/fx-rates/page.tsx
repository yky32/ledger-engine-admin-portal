"use client";

import { ResourceCrud } from "@/components/resource/resource-crud";

export default function FxRatesPage() {
  return (
    <ResourceCrud
      title="FX rates"
      description="Full CRUD-ish — POST/PUT/GET /fx-rates"
      listPath="/fx-rates"
      listFilters={[
        { name: "base", label: "Base currency" },
        { name: "target", label: "Target currency" },
      ]}
      createPath="/fx-rates"
      createFields={[
        { name: "base", label: "Base", required: true, defaultValue: "USD" },
        { name: "target", label: "Target", required: true, defaultValue: "LP" },
        { name: "rate", label: "Rate", type: "number", required: true },
      ]}
      detailPathTemplate="/fx-rates/{id}"
      updatePathTemplate="/fx-rates/{id}"
      updateMethod="PUT"
      updateFields={[
        { name: "base", label: "Base", required: true },
        { name: "target", label: "Target", required: true },
        { name: "rate", label: "Rate", type: "number", required: true },
      ]}
      columns={["id", "base", "target", "rate", "createDt", "updateDt"]}
    />
  );
}
