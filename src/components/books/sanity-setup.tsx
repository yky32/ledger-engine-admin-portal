"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, Badge } from "@/components/ui/kit";
import { errMsg } from "@/lib/format";
import { runSanitySetup, type SanityStep } from "@/lib/sanity-setup";

export function SanitySetup() {
  const [loading, setLoading] = useState(false);
  const [steps, setSteps] = useState<SanityStep[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      setSteps(await runSanitySetup());
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  const allOk = steps != null && steps.length > 0 && steps.every((s) => s.ok);

  return (
    <Card
      className="mb-6"
      title="1-click setup · all parties"
      description="Door · Brain · Accounting · COA · Tiering. Then fire a CC_TXN."
    >
      <button type="button" className="btn-primary text-sm" onClick={() => void run()} disabled={loading}>
        {loading ? "Setting up…" : "Setup all · Door + Brain + Accounting + COA + Tier"}
      </button>
      {error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}
      {steps ? (
        <ul className="mt-3 space-y-1.5 text-sm">
          {steps.map((s) => (
            <li key={s.key} className="flex flex-wrap items-baseline gap-2">
              <Badge tone={s.ok ? "ok" : "error"}>{s.ok ? "ok" : "fail"}</Badge>
              <span className="font-medium text-slate-800">{s.label}</span>
              <span className="font-mono text-[11px] text-slate-500">{s.detail}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-xs text-slate-500">
          Door OPEN anyone · Brain RATE 0.01 LP on CC_TXN · UA accounting sequences · HOUSE +
          01-01-01 · tier SILVER at 1 LP.
        </p>
      )}
      {allOk ? (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/60 px-3 py-3 text-sm text-emerald-950">
          <p className="font-semibold">Ready — test the path</p>
          <ol className="mt-1 list-decimal space-y-1 pl-5 text-xs">
            <li>
              <Link href="/transactions-ingest" className="font-medium text-emerald-800 underline">
                Webhook
              </Link>{" "}
              · preset CC_TXN · 100 HKD · Send live (auto-wallet + ~1 LP → SILVER)
            </li>
            <li>
              <Link href="/wallets-list" className="font-medium text-emerald-800 underline">
                Wallets
              </Link>{" "}
              · books, tier column, refund
            </li>
            <li>
              <Link href="/ledger-entries" className="font-medium text-emerald-800 underline">
                Double-entry
              </Link>{" "}
              · DE legs
            </li>
            <li>
              <Link href="/failed-transactions" className="font-medium text-emerald-800 underline">
                Fail queue
              </Link>{" "}
              · if anything skipped
            </li>
          </ol>
        </div>
      ) : null}
    </Card>
  );
}
