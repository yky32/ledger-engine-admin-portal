"use client";

import { PageShell } from "@/components/layout/page-shell";
import { CapabilityStatement } from "@/components/books/capability-statement";

export default function CapabilityPage() {
  return (
    <PageShell
      title="Capability"
      description="UAF Reward System architecture — LedgeRX is this row. Slide box → engine surface."
    >
      <CapabilityStatement />
    </PageShell>
  );
}
