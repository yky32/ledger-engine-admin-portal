"use client";

import Link from "next/link";

/**
 * Credit-card spend runtime path. Same order as the engine.
 * Refund skips Door/Brain and still hits books + tier.
 */
export function CcTxnPath() {
  const steps = [
    { n: "1", title: "CC txn", href: "/transactions-ingest", note: "eventType=CC_TXN" },
    { n: "2", title: "Ingest", href: "/ingest-policies", note: "Door admit" },
    { n: "3", title: "Digest", href: "/digestion-rules", note: "Brain points" },
    { n: "4", title: "Books", href: "/ledger-entries", note: "DE legs" },
    { n: "5", title: "Tier", href: "/wallet-tier-policies", note: "if policy on" },
  ];
  return (
    <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
        Credit-card spend
      </p>
      <h2 className="mt-1 text-base font-semibold text-slate-900">
        CC_TXN → ingest → digest → books → check tier
      </h2>
      <p className="mt-1 max-w-3xl text-sm text-slate-600">
        One webhook. Door admits, Brain scores LP, accounting posts DE, then{" "}
        <code className="font-mono text-xs">wallet.tier</code> is assessed from this wallet’s LP
        total — same TX as settle. Needs Tiering <strong>Enabled + Save</strong>. Refund skips
        Door/Brain and still re-checks tier.
      </p>
      <ol className="mt-3 flex flex-wrap items-stretch gap-2">
        {steps.map((s, i) => (
          <li key={s.n} className="flex items-center gap-2">
            {i > 0 ? <span className="text-slate-300">→</span> : null}
            <Link
              href={s.href}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 hover:border-emerald-300"
            >
              <div className="font-mono text-[10px] text-slate-400">{s.n}</div>
              <div className="text-sm font-semibold text-slate-900">{s.title}</div>
              <div className="font-mono text-[10px] text-slate-500">{s.note}</div>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
