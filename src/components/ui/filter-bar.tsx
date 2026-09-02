"use client";

import { Card } from "@/components/ui/kit";
import { ActionBar } from "@/components/ui/action";

/**
 * Standard query row: fields / chips on the left, primary action on the right.
 * Used by every list/lookup page (wallets, COA, review, fail queue, legs).
 */
export function FilterBar({
  children,
  loading,
  error,
  ok,
  onSubmit,
  submitLabel = "Query",
}: {
  children: React.ReactNode;
  loading?: boolean;
  error?: string | null;
  ok?: string | null;
  onSubmit?: () => void;
  submitLabel?: string;
}) {
  return (
    <Card className="mb-4">
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit?.();
        }}
      >
        {children}
        {onSubmit ? (
          <ActionBar loading={loading} error={error} ok={ok}>
            <button type="submit" className="btn-primary" disabled={loading}>
              {submitLabel}
            </button>
          </ActionBar>
        ) : loading || error || ok ? (
          <ActionBar loading={loading} error={error} ok={ok}>
            <span />
          </ActionBar>
        ) : null}
      </form>
    </Card>
  );
}
