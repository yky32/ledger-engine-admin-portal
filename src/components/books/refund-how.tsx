"use client";

import Link from "next/link";

/**
 * How to initiate a refund. Both paths reverse the original earn/burn books
 * (DR↔CR). Brain is not re-scored.
 */
export function RefundHow() {
  return (
    <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
        Refund
      </p>
      <h2 className="mt-1 text-base font-semibold text-slate-900">
        Reverse the original books — two ways to start
      </h2>
      <p className="mt-1 max-w-3xl text-sm text-slate-600">
        Same engine path either way: find the settled earn/burn, post{" "}
        <span className="font-mono text-xs">ADJUSTMENT_REFUND</span> with DR/CR swapped.
        Do not send a second earn. Amount on the refund event is not re-scored.
      </p>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            1 · Upstream refund event
          </div>
          <p className="mt-1 text-sm text-slate-800">
            Same <span className="font-mono text-xs">eventType</span> as the spend.
            Split <span className="font-mono text-xs">action=REFUND</span> + pointer.
          </p>
          <pre className="scrollbar-thin mt-2 overflow-auto rounded-lg bg-slate-950 p-3 font-mono text-[11px] leading-relaxed text-emerald-100/90">{`POST /integrations/webhooks/transactions
{
  "eventId": "evt-cc-txn-001-refund",
  "ownerId": "01A31658334",
  "eventType": "CC_TXN",
  "action": "REFUND",
  "originalEventId": "evt-cc-txn-001",
  "amount": "100.00",
  "currency": "HKD",
  "mainAccount": "908951901284"
}`}</pre>
          <div className="mt-2 overflow-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-2 py-1.5 font-semibold">action</th>
                  <th className="px-2 py-1.5 font-semibold">books</th>
                </tr>
              </thead>
              <tbody className="font-mono text-slate-800">
                <tr className="border-t border-slate-100">
                  <td className="px-2 py-1">SPEND</td>
                  <td className="px-2 py-1 font-sans text-slate-600">omit on first fire · Door → Brain</td>
                </tr>
                <tr className="border-t border-slate-100">
                  <td className="px-2 py-1">REFUND / VOID / CHARGEBACK</td>
                  <td className="px-2 py-1 font-sans text-slate-600">full reverse of originalEventId</td>
                </tr>
                <tr className="border-t border-slate-100">
                  <td className="px-2 py-1">PARTIAL / ADJUST</td>
                  <td className="px-2 py-1 font-sans text-slate-600">recognised · not booked yet</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[12px] text-slate-500">
            Keep <span className="font-mono">eventType=CC_TXN</span>. Amount on a reverse is not re-scored.
          </p>
          <Link href="/transactions-ingest" className="mt-2 inline-block text-xs font-medium text-emerald-700 hover:underline">
            Open Webhook →
          </Link>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            2 · REST call (ops click)
          </div>
          <p className="mt-1 text-sm text-slate-800">
            Select the settled EARN (or BURN) in wallet history, then Refund. Or call:
          </p>
          <pre className="scrollbar-thin mt-2 overflow-auto rounded-lg bg-slate-950 p-3 font-mono text-[11px] leading-relaxed text-emerald-100/90">{`POST /movements/{id}/refund

{id} = original SETTLED earn/burn movement id
→ new ADJUSTMENT_REFUND, amount negated
→ original status REFUNDED
→ same books, DR/CR swapped`}</pre>
          <p className="mt-2 text-[12px] text-slate-500">
            Idempotent: second call returns the existing refund (
            <span className="font-mono">{"{movementKey}-refund"}</span>).
          </p>
          <Link href="/wallets-list" className="mt-2 inline-block text-xs font-medium text-emerald-700 hover:underline">
            Open Wallets →
          </Link>
        </div>
      </div>
    </section>
  );
}
