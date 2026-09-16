"use client";

import type { ReactNode } from "react";

import { clsx } from "@/lib/format";
import { HelpTip } from "@/components/ui/help";

/**
 * One editable field row: a fixed-width uppercase label (optional help tip)
 * followed by inline controls — preset chips, free-text inputs. Wraps on
 * narrow screens.
 */
export function FieldRow({
  label,
  tip,
  tipTitle,
  children,
  labelWidth = "min-w-20",
  className,
}: {
  label: string;
  tip?: ReactNode;
  tipTitle?: string;
  children: ReactNode;
  labelWidth?: string;
  className?: string;
}) {
  return (
    <div className={clsx("flex flex-wrap items-center gap-1.5", className)}>
      <span
        className={clsx(
          "flex shrink-0 items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500",
          labelWidth,
        )}
      >
        <span className="">{label}</span>
        {tip ? (
          <HelpTip title={tipTitle} wide>
            {tip}
          </HelpTip>
        ) : null}
      </span>
      {children}
    </div>
  );
}
