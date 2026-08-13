"use client";

import { useCallback, useState } from "react";
import { ApiError } from "@/lib/api";
import { errMsg } from "@/lib/format";
import { Alert, Spinner } from "@/components/ui/kit";

export function useAsyncAction<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TResult | null>(null);

  const run = useCallback(
    async (...args: TArgs) => {
      setLoading(true);
      setError(null);
      try {
        const r = await fn(...args);
        setResult(r);
        return r;
      } catch (e) {
        const msg =
          e instanceof ApiError
            ? `${e.code ? e.code + " · " : ""}${e.message}`
            : errMsg(e);
        setError(msg);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [fn],
  );

  return { loading, error, result, run, setError, setResult };
}

export function ActionBar({
  loading,
  error,
  ok,
  children,
}: {
  loading?: boolean;
  error?: string | null;
  ok?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">{children}</div>
      {loading ? <Spinner /> : null}
      {error ? <Alert tone="error">{error}</Alert> : null}
      {ok ? <Alert tone="ok">{ok}</Alert> : null}
    </div>
  );
}
