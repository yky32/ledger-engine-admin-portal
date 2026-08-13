"use client";

import Link from "next/link";
import { clsx } from "@/lib/format";

/** Compact flow strip — SYSTEM_BUSINESS_FLOW §3 */
export function FlowStrip({ active }: { active?: "ops" | "shoot" | "engine" | "books" }) {
  const steps: {
    id: "ops" | "shoot" | "engine" | "books";
    n: string;
    title: string;
    href: string;
  }[] = [
    { id: "ops", n: "1", title: "Ops config", href: "/ingest-policy" },
    { id: "shoot", n: "2", title: "Shoot txn", href: "/simulator" },
    { id: "engine", n: "3", title: "Engine digest", href: "/review" },
    { id: "books", n: "4", title: "Books / audit", href: "/ledger-entries" },
  ];

  return (
    <div className="mb-5 flex flex-wrap items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
      <span className="mr-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        Flow
      </span>
      {steps.map((s, i) => (
        <div key={s.id} className="flex items-center gap-1.5">
          {i > 0 ? <span className="text-slate-300">→</span> : null}
          <Link
            href={s.href}
            className={clsx(
              "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition",
              active === s.id
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-slate-50 text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100",
            )}
          >
            <span
              className={clsx(
                "flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold",
                active === s.id ? "bg-white/20" : "bg-slate-200 text-slate-600",
              )}
            >
              {s.n}
            </span>
            {s.title}
          </Link>
        </div>
      ))}
      <Link href="/" className="ml-auto text-[11px] text-emerald-700 hover:underline">
        Full map
      </Link>
    </div>
  );
}
