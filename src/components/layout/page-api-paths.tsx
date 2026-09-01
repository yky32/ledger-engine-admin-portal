"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { formatApiCall, subscribeApiCalls, type ApiCall } from "@/lib/api";
import { ApiPath, type ApiRef } from "@/components/ui/api-path";

function uniqueLatest(calls: ApiCall[]): ApiCall[] {
  const seen = new Set<string>();
  const out: ApiCall[] = [];
  for (const c of calls) {
    const k = `${c.method} ${c.path}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(c);
    if (out.length >= 10) break;
  }
  return out;
}

/** Live METHOD /path chips for the current page (calls since this route mounted). */
export function PageApiPaths({ fallback }: { fallback?: ApiRef[] }) {
  const pathname = usePathname();
  const sinceRef = useRef(Date.now());
  const [calls, setCalls] = useState<ApiCall[]>([]);

  useEffect(() => {
    sinceRef.current = Date.now();
    setCalls([]);
  }, [pathname]);

  useEffect(() => {
    return subscribeApiCalls((all) => {
      setCalls(uniqueLatest(all.filter((c) => c.at >= sinceRef.current)));
    });
  }, []);

  const chips = useMemo(() => {
    if (calls.length) return calls;
    return (fallback ?? []).map((a, i) => ({
      id: -1 - i,
      method: a.method,
      path: a.path,
      status: undefined as number | null | undefined,
      ms: null,
      at: 0,
    }));
  }, [calls, fallback]);

  if (!chips.length) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {chips.map((c) => (
        <ApiPath
          key={`${c.method}:${c.path}:${c.id}`}
          method={c.method}
          path={c.path}
          status={"status" in c ? c.status : undefined}
          ms={c.ms ?? undefined}
          onClick={() => {
            void navigator.clipboard.writeText(formatApiCall(c)).catch(() => undefined);
          }}
        />
      ))}
    </div>
  );
}
