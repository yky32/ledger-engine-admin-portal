"use client";

import { ResourceCrud } from "@/components/resource/resource-crud";

export default function DigestionRulesPage() {
  return (
    <ResourceCrud
      title="Digestion rules"
      description="Brain — runtime filter + formula (DB). No restart. GET/POST/PUT /digestion-rules"
      listPath="/digestion-rules"
      listFilters={[
        { name: "enabledOnly", label: "enabledOnly (true/false)", defaultValue: "" },
        { name: "code", label: "code (exact)", defaultValue: "" },
      ]}
      createPath="/digestion-rules"
      createFields={[
        { name: "code", label: "code", required: true, placeholder: "PURCHASE_DEFAULT" },
        { name: "name", label: "name", required: true },
        { name: "eventType", label: "eventType", required: true, defaultValue: "PURCHASE" },
        { name: "operation", label: "operation", required: true, defaultValue: "EARN" },
        { name: "isEnabled", label: "isEnabled", defaultValue: "true" },
        { name: "priority", label: "priority", type: "number", defaultValue: "10" },
        { name: "minAmount", label: "minAmount", type: "number", defaultValue: "0.01" },
        {
          name: "eligibleCurrencies",
          label: "eligibleCurrencies (JSON array)",
          type: "textarea",
          defaultValue: '["HKD","USD"]',
        },
        { name: "maxAgeDays", label: "maxAgeDays", type: "number", defaultValue: "7" },
        { name: "pointCurrency", label: "pointCurrency", defaultValue: "LP" },
        { name: "formula", label: "formula", required: true, defaultValue: "RATE:0.01" },
      ]}
      detailPathTemplate="/digestion-rules/{id}"
      updatePathTemplate="/digestion-rules/{id}"
      updateFields={[
        { name: "name", label: "name" },
        { name: "formula", label: "formula" },
        { name: "isEnabled", label: "isEnabled" },
        { name: "priority", label: "priority", type: "number" },
        { name: "minAmount", label: "minAmount", type: "number" },
        {
          name: "eligibleCurrencies",
          label: "eligibleCurrencies (JSON array)",
          type: "textarea",
        },
        { name: "maxAgeDays", label: "maxAgeDays", type: "number" },
      ]}
      columns={[
        "id",
        "code",
        "eventType",
        "operation",
        "formula",
        "priority",
        "isEnabled",
        "pointCurrency",
      ]}
      buildListPath={(f) => {
        const qs = new URLSearchParams();
        if (f.enabledOnly) qs.set("enabledOnly", f.enabledOnly);
        if (f.code) qs.set("code", f.code);
        const q = qs.toString();
        return q ? `/digestion-rules?${q}` : "/digestion-rules";
      }}
    />
  );
}
