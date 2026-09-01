"use client";

import { useId, useState } from "react";
import { HelpCircle } from "lucide-react";
import { clsx } from "@/lib/format";

/**
 * Inline field help — hover/focus/click shows explanation.
 * Prefer long, plain-language copy for ops/QA.
 */
export function HelpTip({
  title,
  children,
  side = "top",
  wide,
}: {
  title?: string;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  wide?: boolean;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);

  return (
    <span
      className="relative inline-flex align-middle"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="inline-flex h-4 w-4 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
        aria-describedby={open ? id : undefined}
        aria-label={title || "Help"}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={(e) => {
          e.preventDefault();
          setOpen((v) => !v);
        }}
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </button>
      {open ? (
        <span
          id={id}
          role="tooltip"
          className={clsx(
            "absolute z-50 rounded-xl border border-slate-200 bg-slate-900 px-3 py-2 text-left text-[11px] leading-relaxed text-slate-100 shadow-xl",
            wide ? "w-80" : "w-64",
            side === "top" && "bottom-full left-1/2 mb-2 -translate-x-1/2",
            side === "bottom" && "top-full left-1/2 mt-2 -translate-x-1/2",
            side === "right" && "left-full top-1/2 ml-2 -translate-y-1/2",
            side === "left" && "right-full top-1/2 mr-2 -translate-y-1/2",
          )}
        >
          {title ? (
            <span className="mb-1 block font-semibold text-emerald-300">{title}</span>
          ) : null}
          <span className="block text-slate-200">{children}</span>
        </span>
      ) : null}
    </span>
  );
}

export function FieldLabel({
  children,
  tip,
  tipTitle,
  side = "top",
}: {
  children: React.ReactNode;
  tip?: React.ReactNode;
  tipTitle?: string;
  side?: "top" | "bottom" | "left" | "right";
}) {
  return (
    <span className="field-label inline-flex items-center gap-1.5">
      <span>{children}</span>
      {tip ? (
        <HelpTip title={tipTitle} wide side={side}>
          {tip}
        </HelpTip>
      ) : null}
    </span>
  );
}

export function ExplainBox({
  title,
  children,
  tone = "info",
}: {
  title: string;
  children: React.ReactNode;
  tone?: "info" | "ops" | "warn";
}) {
  const styles = {
    info: "border-sky-200 bg-sky-50/80 text-sky-950",
    ops: "border-violet-200 bg-violet-50/80 text-violet-950",
    warn: "border-amber-200 bg-amber-50/80 text-amber-950",
  }[tone];
  return (
    <div className={clsx("rounded-xl border px-3.5 py-3 text-sm", styles)}>
      <div className="text-xs font-semibold uppercase tracking-wide opacity-70">{title}</div>
      <div className="mt-1.5 space-y-1.5 text-[13px] leading-relaxed">{children}</div>
    </div>
  );
}
