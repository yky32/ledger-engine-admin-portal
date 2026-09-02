"use client";

import Link from "next/link";
import { clsx } from "@/lib/format";

/** Compact flow strip — engine pipeline Door → Brain → Accounting → Ledger */
export function FlowStrip({ active }: { active?: "door" | "brain" | "accounting" | "ledger" }) {
  const steps: {
    id: "door" | "brain" | "accounting" | "ledger";
    n: string;
    title: string;
    href: string;
  }[] = [
    { id: "door", n: "1", title: "Door", href: "/ingest-policies" },
    { id: "brain", n: "2", title: "Brain", href: "/digestion-rules" },
    { id: "accounting", n: "3", title: "Accounting", href: "/accounting-rules" },
    { id: "ledger", n: "4", title: "Ledger", href: "/wallets-list" },
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
