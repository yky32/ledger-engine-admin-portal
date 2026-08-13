"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader, Card, JsonBlock } from "@/components/ui/kit";
import { ActionBar } from "@/components/ui/action";
import { FieldLabel, ExplainBox, HelpTip } from "@/components/ui/help";
import { engine } from "@/lib/engine";
import { errMsg, randomOwnerId } from "@/lib/format";
import { FlowStrip } from "@/components/layout/flow-strip";

export default function WalletsPage() {
  const [ownerId, setOwnerId] = useState(randomOwnerId());
  const [name, setName] = useState("");
  const [settlement, setSettlement] = useState("HKD");
  const [vanityCode, setVanityCode] = useState("");
  const [extraLp, setExtraLp] = useState(true);
  const [lookupId, setLookupId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<unknown>(null);

  const create = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await engine.onboardWallet({
        ownerId: ownerId.trim(),
        settlementCurrency: settlement,
        name: name.trim() || undefined,
        vanityCode: vanityCode.trim() || undefined,
        accounts: extraLp ? [{ currency: "LP" }] : undefined,
      });
      setResult(r.data);
      setLookupId(ownerId.trim());
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  const lookup = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await engine.getWallet(lookupId.trim());
      setResult(r.data);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <FlowStrip active="ops" />
      <PageHeader
        title="Wallet onboard (CRM path)"
        description="Explicit 1 ownerId → 1 Wallet. Alternative to Door lazy auto-create."
      />
      <div className="mb-4 grid gap-3 lg:grid-cols-2">
        <ExplainBox title="When to use explicit onboard" tone="ops">
          <p>
            CRM already knows the member: call onboard before first purchase. Identity is always{" "}
            <code className="text-xs">ownerId</code> (e.g. 01A########) — never vanity/lucky
            numbers as PK.
          </p>
        </ExplainBox>
        <ExplainBox title="vs Door auto-create">
          <p>
            If Ingest policy <code className="text-xs">isAutoCreateWallet=true</code>, first
            eligible webhook can create the wallet. Explicit onboard is for controlled CRM join
            flows.
          </p>
        </ExplainBox>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Onboard">
          <div className="space-y-3">
            <label className="field">
              <FieldLabel
                tipTitle="ownerId"
                tip="External CRM / membership id. Unique. All wallet GET APIs use this — not snowflake wallet id."
              >
                ownerId
              </FieldLabel>
              <div className="flex gap-2">
                <input
                  className="field-input font-mono"
                  value={ownerId}
                  onChange={(e) => setOwnerId(e.target.value)}
                />
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setOwnerId(randomOwnerId())}
                >
                  Gen
                </button>
              </div>
            </label>
            <label className="field">
              <span className="field-label">name</span>
              <input className="field-input" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="field">
              <FieldLabel
                tipTitle="vanityCode"
                tip="Optional customer-facing lucky/premium display code. Mutable, unique when set. Never used as PK, FK, or webhook identity — that is ownerId."
              >
                vanityCode
              </FieldLabel>
              <input
                className="field-input font-mono"
                value={vanityCode}
                onChange={(e) => setVanityCode(e.target.value)}
                placeholder="optional"
              />
            </label>
            <label className="field">
              <FieldLabel
                tipTitle="settlementCurrency"
                tip="Primary account currency on the wallet (e.g. HKD). Points usually live on an extra LP book (checkbox below)."
              >
                settlementCurrency
              </FieldLabel>
              <select
                className="field-select"
                value={settlement}
                onChange={(e) => setSettlement(e.target.value)}
              >
                {["HKD", "USD", "CNY", "JPY"].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={extraLp}
                onChange={(e) => setExtraLp(e.target.checked)}
              />
              Also open LP book
              <HelpTip title="LP book" wide>
                Loyalty points double-entry posts to the LP account under this wallet. Without
                LP, earn from Digestion has nowhere to credit.
              </HelpTip>
            </label>
            <ActionBar loading={loading} error={error}>
              <button type="button" className="btn-primary" onClick={create}>
                Create
              </button>
              {lookupId ? (
                <Link href="/review" className="btn-secondary text-xs">
                  Review
                </Link>
              ) : null}
            </ActionBar>
          </div>
        </Card>
        <Card title="Lookup">
          <div className="space-y-3">
            <label className="field">
              <span className="field-label">ownerId</span>
              <input
                className="field-input font-mono"
                value={lookupId}
                onChange={(e) => setLookupId(e.target.value)}
              />
            </label>
            <button type="button" className="btn-secondary" onClick={lookup} disabled={loading}>
              GET wallet
            </button>
            {result ? <JsonBlock value={result} /> : null}
          </div>
        </Card>
      </div>
    </div>
  );
}
