"use client";

import { EngineStatusBanner } from "@/components/layout/engine-status-banner";
import { FlowStrip } from "@/components/layout/flow-strip";
import type { ApiRef } from "@/components/ui/api-path";
import { Alert, PageHeader } from "@/components/ui/kit";

export type FlowStep = "door" | "brain" | "accounting" | "ledger" | "tier";

/**
 * Standard page chrome for every Admin surface:
 * Flow strip → engine banner → title / APIs / actions → optional ok/error → body.
 *
 * `variant="doc"` is the reading-mode chrome for Docs-view pages: no flow
 * strip, no API chips, and the `actions` slot is ignored — doc pages can't
 * carry ops controls.
 */
export function PageShell({
  variant = "app",
  flow,
  title,
  description,
  api,
  actions,
  ok,
  error,
  children,
}: {
  /** "app" (default) = full ops chrome; "doc" = reading mode. */
  variant?: "app" | "doc";
  /** Highlight on Door → Brain → Accounting → Ledger → Tier. Omit = strip still shows, none selected. */
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
      {variant === "doc" ? null : <FlowStrip active={flow} />}
      <EngineStatusBanner />
      {variant === "doc" ? (
        <div className="mb-6">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h1>
          {description ? (
            <p className="mt-1 max-w-2xl text-sm text-slate-500">{description}</p>
          ) : null}
        </div>
      ) : (
        <PageHeader title={title} description={description} api={api} actions={actions} />
      )}
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
