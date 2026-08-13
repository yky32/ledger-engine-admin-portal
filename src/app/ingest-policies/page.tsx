"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader, Card, JsonBlock, Alert } from "@/components/ui/kit";
import { ActionBar } from "@/components/ui/action";
import { FieldLabel, HelpTip, ExplainBox } from "@/components/ui/help";
import { FlowStrip } from "@/components/layout/flow-strip";
import { engine } from "@/lib/engine";
import { errMsg } from "@/lib/format";
import type { IngestPolicy } from "@/lib/types";
import { EngineStatusBanner } from "@/components/layout/engine-status-banner";

/**
 * Field copy aligned with ledger-engine/docs/INGEST_POLICY.md
 * + SYSTEM_BUSINESS_FLOW door concept.
 */
const TIPS = {
  isEnabled: {
    title: "isEnabled — master switch (Door)",
    body: (
      <>
        <p>
          <strong>When true:</strong> engine accepts inbound webhooks (
          <code className="text-emerald-200">POST /integrations/webhooks/transactions</code>
          ).
        </p>
        <p className="mt-1">
          <strong>When false:</strong> every event is rejected early as{" "}
          <code className="text-emerald-200">SKIPPED / DISABLED</code> — no digestion, no
          wallet create, no earn. Use as an incident kill-switch.
        </p>
        <p className="mt-1 text-slate-400">
          This does <em>not</em> score points. Scoring is Digestion (Brain).
        </p>
      </>
    ),
  },
  isAutoCreateWallet: {
    title: "isAutoCreateWallet — lazy onboard",
    body: (
      <>
        <p>
          After the Door is open and Digestion says the event is eligible, if this customer
          has <strong>no wallet yet</strong>:
        </p>
        <ul className="mt-1 list-disc space-y-0.5 pl-4">
          <li>
            <strong>true:</strong> create wallet in the <em>same transaction</em> as earn
            (adopt / POS-first path).
          </li>
          <li>
            <strong>false:</strong> fail with <code className="text-emerald-200">NO_WALLET</code>{" "}
            — CRM must call onboard first.
          </li>
        </ul>
        <p className="mt-1 text-slate-400">
          Auto-create only runs when digestion already matched; junk events won&apos;t open
          wallets.
        </p>
      </>
    ),
  },
  settlement: {
    title: "Settlement currency (primary book)",
    body: (
      <>
        <p>
          Currency of the <strong>primary account</strong> when auto-creating a wallet (e.g.{" "}
          <code className="text-emerald-200">HKD</code>).
        </p>
        <p className="mt-1">
          This is the wallet&apos;s default settlement currency — cash-side book for the
          member. Loyalty points usually sit on a <em>separate</em> ensure currency (LP).
        </p>
        <p className="mt-1 text-slate-400">
          Example adopt: settlement HKD + ensure LP → member has both books under one
          ownerId.
        </p>
      </>
    ),
  },
  ensure: {
    title: "Ensure currency (extra book)",
    body: (
      <>
        <p>
          Second account always opened on auto-create — almost always{" "}
          <code className="text-emerald-200">LP</code> (loyalty points).
        </p>
        <p className="mt-1">
          Earn/burn double-entry posts to this book. Without an LP book, points cannot
          settle even if Digestion scores them.
        </p>
        <p className="mt-1 text-slate-400">
          You pointed here on the form: this is <em>not</em> settlement cash — it is the
          points ledger line under the same wallet.
        </p>
      </>
    ),
  },
  associatedFrom: {
    title: "associatedFrom label (legacy display)",
    body: (
      <>
        <p>
          Soft label stored when auto-creating (e.g.{" "}
          <code className="text-emerald-200">CRM</code>, <code className="text-emerald-200">POS</code>
          ). Helps ops see <em>who/what</em> triggered lazy onboard.
        </p>
        <p className="mt-1 text-slate-400">
          Not a second identity key. Real identity is always{" "}
          <code className="text-emerald-200">ownerId</code> on the wallet.
        </p>
      </>
    ),
  },
  namePrefix: {
    title: "Name prefix",
    body: (
      <>
        <p>
          Display name prefix for auto wallets, e.g.{" "}
          <code className="text-emerald-200">Sim </code> + ownerId →{" "}
          <code className="text-emerald-200">Sim 01A12345678</code>.
        </p>
        <p className="mt-1 text-slate-400">Cosmetic only — does not affect balances or joins.</p>
      </>
    ),
  },
} as const;

export default function IngestPolicyPage() {
  const [policy, setPolicy] = useState<IngestPolicy | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await engine.ingestPolicyGet();
      setPolicy(r.data);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!policy) return;
    setLoading(true);
    setError(null);
    setOk(null);
    try {
      const r = await engine.ingestPolicyPut(policy);
      setPolicy(r.data);
      setOk("Saved to DB — effective immediately (no restart)");
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <FlowStrip active="ops" />
      <EngineStatusBanner />
      <PageHeader
        title="1 · Door — Ingest policy"
        description="Webhook admission + lazy wallet. Not scoring. API GET/PUT /ingest-policies · docs/INGEST_POLICY.md"
      />

      <div className="mb-4 grid gap-3 lg:grid-cols-3">
        <ExplainBox title="What is the Door?" tone="ops">
          <p>
            First gate inside LedgeRX after upstream POS/OMS posts a webhook. Answers:{" "}
            <em>“Do we accept traffic at all?”</em> and{" "}
            <em>“If this customer has no wallet yet, may we create one?”</em>
          </p>
        </ExplainBox>
        <ExplainBox title="What it is NOT">
          <p>
            Does <strong>not</strong> choose how many LP to award. That is{" "}
            <Link href="/digestion-rules" className="font-medium underline">
              Digestion rules (Brain)
            </Link>
            . Door open + no matching brain rule → still no earn.
          </p>
        </ExplainBox>
        <ExplainBox title="Happy path (adopt)" tone="info">
          <p className="font-mono text-[11px] leading-relaxed">
            webhook → Door on → Brain match → no wallet?
            <br />
            → auto-create (settlement + ensure LP)
            <br />
            → Books: DE earn vs PROGRAM pool
          </p>
        </ExplainBox>
      </div>

      {!policy ? (
        <ActionBar loading={loading} error={error}>
          <button type="button" className="btn-secondary" onClick={load}>
            Load
          </button>
        </ActionBar>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Edit policy" description="Usually one global row for the whole engine">
            <div className="space-y-4">
              <label className="flex items-start gap-2.5 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={!!policy.isEnabled}
                  onChange={(e) => setPolicy({ ...policy, isEnabled: e.target.checked })}
                />
                <span>
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    isEnabled (master switch)
                    <HelpTip title={TIPS.isEnabled.title} wide>
                      {TIPS.isEnabled.body}
                    </HelpTip>
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    Off = all webhooks SKIPPED DISABLED (kill-switch).
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-2.5 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={!!policy.isAutoCreateWallet}
                  onChange={(e) =>
                    setPolicy({ ...policy, isAutoCreateWallet: e.target.checked })
                  }
                />
                <span>
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    isAutoCreateWallet
                    <HelpTip title={TIPS.isAutoCreateWallet.title} wide>
                      {TIPS.isAutoCreateWallet.body}
                    </HelpTip>
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    Lazy onboard after digestion qualifies the event.
                  </span>
                </span>
              </label>

              <label className="field">
                <FieldLabel tipTitle={TIPS.settlement.title} tip={TIPS.settlement.body}>
                  Settlement ccy (primary book)
                </FieldLabel>
                <input
                  className="field-input font-mono"
                  value={String(policy.autoWalletSettlementCurrency ?? "")}
                  onChange={(e) =>
                    setPolicy({
                      ...policy,
                      autoWalletSettlementCurrency: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="HKD"
                />
                <span className="text-[11px] text-slate-400">
                  Auto-wallet primary account currency (cash side).
                </span>
              </label>

              <label className="field">
                <FieldLabel tipTitle={TIPS.ensure.title} tip={TIPS.ensure.body}>
                  Ensure ccy (extra book · usually LP)
                </FieldLabel>
                <input
                  className="field-input font-mono"
                  value={String(policy.autoWalletEnsureCurrency ?? "")}
                  onChange={(e) =>
                    setPolicy({
                      ...policy,
                      autoWalletEnsureCurrency: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="LP"
                />
                <span className="text-[11px] text-slate-400">
                  Second book opened on auto-create — points land here.
                </span>
              </label>

              <label className="field">
                <FieldLabel tipTitle={TIPS.associatedFrom.title} tip={TIPS.associatedFrom.body}>
                  associatedFrom label
                </FieldLabel>
                <input
                  className="field-input"
                  value={String(policy.autoWalletAssociatedFrom ?? "")}
                  onChange={(e) =>
                    setPolicy({ ...policy, autoWalletAssociatedFrom: e.target.value })
                  }
                  placeholder="CRM"
                />
              </label>

              <label className="field">
                <FieldLabel tipTitle={TIPS.namePrefix.title} tip={TIPS.namePrefix.body}>
                  Name prefix
                </FieldLabel>
                <input
                  className="field-input"
                  value={String(policy.autoWalletNamePrefix ?? "")}
                  onChange={(e) =>
                    setPolicy({ ...policy, autoWalletNamePrefix: e.target.value })
                  }
                  placeholder="Sim "
                />
              </label>

              <ActionBar loading={loading} error={error} ok={ok}>
                <button type="button" className="btn-primary" onClick={save}>
                  Save
                </button>
                <button type="button" className="btn-secondary" onClick={load}>
                  Reload
                </button>
              </ActionBar>

              <Alert tone="info">
                Changes apply on next webhook — no deploy. Pair with{" "}
                <Link href="/digestion-rules" className="underline">
                  Brain rules
                </Link>{" "}
                then{" "}
                <Link href="/simulator" className="underline">
                  shoot
                </Link>
                .
              </Alert>
            </div>
          </Card>

          <div className="space-y-4">
            <Card title="Saved in DB (GET /ingest-policies)" description="Persisted row — not only form draft">
              <JsonBlock value={policy} />
              <p className="mt-2 text-[11px] text-slate-500">
                <Link href="/records" className="underline">
                  All DB records →
                </Link>
              </p>
            </Card>
            <ExplainBox title="Field cheat-sheet" tone="info">
              <table className="w-full text-left text-[12px]">
                <tbody className="align-top">
                  <tr>
                    <td className="py-1 pr-2 font-mono text-[11px]">isEnabled</td>
                    <td className="py-1">Accept webhooks at all?</td>
                  </tr>
                  <tr>
                    <td className="py-1 pr-2 font-mono text-[11px]">isAutoCreateWallet</td>
                    <td className="py-1">Create wallet if missing (after brain match)?</td>
                  </tr>
                  <tr>
                    <td className="py-1 pr-2 font-mono text-[11px]">settlement ccy</td>
                    <td className="py-1">Primary book e.g. HKD</td>
                  </tr>
                  <tr>
                    <td className="py-1 pr-2 font-mono text-[11px]">ensure ccy</td>
                    <td className="py-1">Extra book e.g. LP for points</td>
                  </tr>
                  <tr>
                    <td className="py-1 pr-2 font-mono text-[11px]">associatedFrom</td>
                    <td className="py-1">Ops label only</td>
                  </tr>
                  <tr>
                    <td className="py-1 pr-2 font-mono text-[11px]">namePrefix</td>
                    <td className="py-1">Display name prefix</td>
                  </tr>
                </tbody>
              </table>
            </ExplainBox>
          </div>
        </div>
      )}
    </div>
  );
}
