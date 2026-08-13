"use client";

import { FlowStrip } from "@/components/layout/flow-strip";
import SimpleResourcePage from "@/components/resource/simple-resource";

export default function Page() {
  return (
    <div>
      <FlowStrip active="books" />
      <SimpleResourcePage
        title="4 · Audit — Movements"
        description="Movement history after engine books. GET /movements"
        listPath="/movements"
      />
    </div>
  );
}
