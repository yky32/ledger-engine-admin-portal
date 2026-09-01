"use client";

import { useEffect, useState } from "react";
import { formatApiCall, subscribeApiCalls, type ApiCall } from "@/lib/api";
import { clsx } from "@/lib/format";

function statusClass(status: number | null) {
  if (status == null) return "text-slate-400";
  if (status === 0 || status >= 400) return "text-rose-600";
  if (status >= 300) return "text-amber-600";
  return "text-emerald-600";
}

function statusLabel(c: ApiCall) {
  if (c.status == null) return "…";
  if (c.status === 0) return "ERR";
  return String(c.status);
}

export function ApiCallBar() {
  const [calls, setCalls] = useState<ApiCall[]>([]);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => subscribeApiCalls(setCalls), []);

  const last = calls[0];

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* */
    }
  };

  return (
    <div className="relative min-w-0 flex-1 px-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={last ? `${formatApiCall(last)} — click for history` : "No engine calls yet"}
        className="flex w-full min-w-0 items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-1 text-left ring-1 ring-slate-200 hover:bg-white"
      >
        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          API
        </span>
        {last ? (
          <>
            <code className="min-w-0 flex-1 truncate font-mono text-[11px] text-slate-800">
              <span className="font-semibold text-slate-500">{last.method}</span> {last.path}
            </code>
            <span className={clsx("shrink-0 font-mono text-[11px] font-semibold", statusClass(last.status))}>
              {statusLabel(last)}
            </span>
            {last.ms != null ? (
              <span className="hidden shrink-0 font-mono text-[10px] text-slate-400 sm:inline">
                {last.ms}ms
              </span>
            ) : null}
          </>
        ) : (
          <span className="font-mono text-[11px] text-slate-400">no calls yet</span>
        )}
      </button>

      {open ? (
        <div className="absolute left-3 right-3 top-full z-30 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Engine calls (latest first)
            </span>
            {last ? (
              <button
                type="button"
                className="text-[11px] text-emerald-700 hover:underline"
                onClick={() => void copy(formatApiCall(last))}
              >
                {copied ? "copied" : "copy last"}
              </button>
            ) : null}
          </div>
          {calls.length === 0 ? (
            <p className="px-3 py-3 text-xs text-slate-400">Interact with a page to see GET/POST paths.</p>
          ) : (
            <ul className="max-h-72 overflow-auto font-mono text-[11px]">
              {calls.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-slate-50"
                    onClick={() => void copy(formatApiCall(c))}
                    title="Copy"
                  >
                    <span className="w-12 shrink-0 font-semibold text-slate-500">{c.method}</span>
                    <span className="min-w-0 flex-1 truncate text-slate-800">{c.path}</span>
                    <span className={clsx("w-8 shrink-0 text-right font-semibold", statusClass(c.status))}>
                      {statusLabel(c)}
                    </span>
                    <span className="w-10 shrink-0 text-right text-slate-400">
                      {c.ms != null ? `${c.ms}ms` : ""}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
