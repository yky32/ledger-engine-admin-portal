"use client";

import Link from "next/link";

import { clsx } from "@/lib/format";

/**
 * Pill tab row for consolidated screens (/rules, /chart).
 * Tabs either navigate (href) or flip in-page state (onChange).
 */
export function TabPills<T extends string>({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: ReadonlyArray<{ id: T; label: string; href?: string }>;
  value: T;
  onChange?: (id: T) => void;
  className?: string;
}) {
  return (
    <div className={clsx("flex flex-wrap gap-1.5", className)}>
      {tabs.map((t) => {
        const styles = clsx(
          "rounded-full px-2.5 py-1 text-[11px] font-medium transition",
          t.id === value
            ? "bg-emerald-600 text-white shadow-sm"
            : "bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-emerald-300",
        );
        return t.href ? (
          <Link key={t.id} href={t.href} className={styles}>
            {t.label}
          </Link>
        ) : (
          <button key={t.id} type="button" onClick={() => onChange?.(t.id)} className={styles}>
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
