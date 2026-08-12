"use client";

import { ResourceCrud } from "@/components/resource/resource-crud";

export default function LedgerEntriesPage() {
  return (
    <ResourceCrud
      title="Ledger legs"
      description="Double-entry legs — provide exactly one of movementId or eventId."
      listPath="/integrations/ledger-entries"
      listFilters={[
        { name: "eventId", label: "eventId", defaultValue: "" },
        { name: "movementId", label: "movementId", defaultValue: "" },
        { name: "operation", label: "operation (earn/burn optional)", defaultValue: "" },
      ]}
      mode="lookup"
      columns={["id", "entryId", "accountId", "direction", "amount", "currency"]}
      buildListPath={(f) => {
        const qs = new URLSearchParams();
        if (f.eventId) qs.set("eventId", f.eventId);
        if (f.movementId) qs.set("movementId", f.movementId);
        if (f.operation) qs.set("operation", f.operation);
        return `/integrations/ledger-entries?${qs.toString()}`;
      }}
    />
  );
}
