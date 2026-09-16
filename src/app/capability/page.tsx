"use client";

import { CapabilityStatement } from "@/components/books/capability-statement";
import { PageShell } from "@/components/layout/page-shell";

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
