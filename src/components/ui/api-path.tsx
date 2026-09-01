"use client";

export type ApiRef = { method: string; path: string };

/** Visible engine API for debugging (METHOD /path). */
export function ApiPath({
  method,
  path,
  status,
  ms,
  onClick,
}: {
  method: string;
  path: string;
  status?: number | null;
  ms?: number | null;
  onClick?: () => void;
}) {
  const tone =
    status == null
      ? "text-slate-400"
      : status === 0 || status >= 400
        ? "text-rose-600"
        : status >= 300
          ? "text-amber-600"
          : "text-emerald-600";
  const inner = (
    <>
      <span className="font-semibold text-slate-500">{method}</span>
      <span className="truncate">{path}</span>
      {status !== undefined ? (
        <span className={`font-semibold ${tone}`}>
          {status == null ? "…" : status === 0 ? "ERR" : status}
        </span>
      ) : null}
      {ms != null ? <span className="text-slate-400">{ms}ms</span> : null}
    </>
  );
  const cls =
    "inline-flex max-w-full items-center gap-1 truncate rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-700 ring-1 ring-slate-200";
  if (onClick) {
    return (
      <button type="button" onClick={onClick} title="Copy METHOD /path" className={cls}>
        {inner}
      </button>
    );
  }
  return <code className={cls}>{inner}</code>;
}
