"use client";

import { FlowStrip } from "@/components/layout/flow-strip";
import { EngineStatusBanner } from "@/components/layout/engine-status-banner";
import { PageHeader, Alert } from "@/components/ui/kit";
import type { ApiRef } from "@/components/ui/api-path";

export type FlowStep = "door" | "brain" | "accounting" | "ledger";

/**
 * Standard page chrome for every Admin surface:
 * Flow strip → engine banner → title / APIs / actions → optional ok/error → body.
 */
export function PageShell({
  flow,
  title,
  description,
  api,
  actions,
  ok,
  error,
  children,
}: {
  /** Highlight on Door → Brain → Accounting → Ledger. Omit = strip still shows, none selected. */
  flow?: FlowStep;
  title: string;
  description?: string;
  api?: ApiRef[];
  actions?: React.ReactNode;
  ok?: string | null;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div>
      <FlowStrip active={flow} />
      <EngineStatusBanner />
      <PageHeader title={title} description={description} api={api} actions={actions} />
      {error ? (
        <div className="mb-4">
          <Alert tone="error">{error}</Alert>
        </div>
      ) : null}
      {ok ? (
        <div className="mb-4">
          <Alert tone="ok">{ok}</Alert>
        </div>
      ) : null}
      {children}
    </div>
  );
}
