"use client";

import { PageShell } from "@/components/layout/page-shell";
import { CapabilityStatement } from "@/components/books/capability-statement";

export default function CapabilityPage() {
  return (
    <PageShell
      title="Capability"
      description="UAF Reward System row plus presented use cases (fulfill vs cannot)."
    >
      <CapabilityStatement />
    </PageShell>
  );
}
