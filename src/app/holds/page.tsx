"use client";

import { useState } from "react";
import { PageHeader, Card, JsonBlock } from "@/components/ui/kit";
import { ActionBar } from "@/components/ui/action";
import { FieldLabel, ExplainBox } from "@/components/ui/help";
import { FlowStrip } from "@/components/layout/flow-strip";
import { engine } from "@/lib/engine";
import { errMsg } from "@/lib/format";
import { EngineStatusBanner } from "@/components/layout/engine-status-banner";

export default function HoldsPage() {
  const [ownerId, setOwnerId] = useState("");
  const [currency, setCurrency] = useState("LP");
  const [amount, setAmount] = useState("1");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<unknown>(null);

  const run = async (kind: "hold" | "release") => {
    setLoading(true);
    setError(null);
    try {
      const body = {
        ownerId: ownerId.trim(),
        currency,
        amount: Number(amount),
        description: description || undefined,
      };
      const r = kind === "hold" ? await engine.hold(body) : await engine.release(body);
      setResult(r.data);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <FlowStrip active="engine" />
      <EngineStatusBanner />
      <PageHeader
        title="Hold / Release LP"
        description="Locks spendable (available) balance only — ledger/total balance unchanged. POST /wallets/holds · /releases"
      />

      <div className="mb-4 grid gap-3 lg:grid-cols-2">
        <ExplainBox title="What HOLD does" tone="ops">
          <p>
            <strong>HOLD</strong> reduces <em>available</em> balance (what customer can spend
            now) but keeps <em>ledger</em> balance the same. Used when points are reserved
            (pending order) without burning yet.
          </p>
        </ExplainBox>
        <ExplainBox title="RELEASE + legs">
          <p>
            <strong>RELEASE</strong> restores available. Legs for hold-like ops set{" "}
            <code className="text-xs">affectsLedger=false</code> so as-of ledger rebuilds ignore
            them; available as-of still sees them.
          </p>
        </ExplainBox>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Request">
          <div className="space-y-3">
            <label className="field">
              <FieldLabel
                tipTitle="ownerId"
                tip="Customer wallet key — same id used on webhooks and review."
              >
                ownerId
              </FieldLabel>
              <input
                className="field-input font-mono"
                value={ownerId}
                onChange={(e) => setOwnerId(e.target.value)}
              />
            </label>
            <label className="field">
              <FieldLabel
                tipTitle="currency"
                tip="Book to lock. Usually LP for loyalty holds."
              >
                currency
              </FieldLabel>
              <select
                className="field-select"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                {["LP", "HKD", "USD"].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <FieldLabel tipTitle="amount" tip="Must be ≤ current available balance.">
                amount
              </FieldLabel>
              <input
                className="field-input font-mono"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </label>
            <label className="field">
              <span className="field-label">description</span>
              <input
                className="field-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
            <ActionBar loading={loading} error={error}>
              <button type="button" className="btn-primary" onClick={() => run("hold")}>
                Hold
              </button>
              <button type="button" className="btn-secondary" onClick={() => run("release")}>
                Release
              </button>
            </ActionBar>
          </div>
        </Card>
        <Card title="Response">{result ? <JsonBlock value={result} /> : null}</Card>
      </div>
    </div>
  );
}
