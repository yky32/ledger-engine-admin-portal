"use client";

import { useState } from "react";
import { Card, JsonBlock } from "@/components/ui/kit";
import { ActionBar } from "@/components/ui/action";
import { FieldLabel, ExplainBox } from "@/components/ui/help";
import { PageShell } from "@/components/layout/page-shell";
import { engine } from "@/lib/engine";
import { errMsg, randomEventId } from "@/lib/format";
import type { MovementView } from "@/lib/types";

type RailKind = "deposit" | "withdraw" | "transfer";

const CONFIG: Record<
  RailKind,
  {
    title: string;
    description: string;
    api: { method: string; path: string }[];
    explain: string;
  }
> = {
  deposit: {
    title: "Deposit",
    description: "Credit an onboarded owner wallet — POST /movements/deposits",
    api: [{ method: "POST", path: "/movements/deposits" }],
    explain:
      "Creates a DEPOSIT movement and posts a single-sided credit on the owner's currency book. Use a unique movementKey for idempotency.",
  },
  withdraw: {
    title: "Withdrawal",
    description: "Debit an onboarded owner wallet — POST /movements/withdrawals",
    api: [{ method: "POST", path: "/movements/withdrawals" }],
    explain:
      "Creates a WITHDRAWAL movement and debits the owner's book. Optional targetId can tag an external payout destination.",
  },
  transfer: {
    title: "In-wallet transfer",
    description: "Move value between two owners in the same currency — POST /movements/transfers/in-wallet",
    api: [{ method: "POST", path: "/movements/transfers/in-wallet" }],
    explain:
      "Both owners must be onboarded for the chosen currency. The engine posts a balanced debit/credit pair across the two wallet books.",
  },
};

export function RailsMovementPage({ kind }: { kind: RailKind }) {
  const cfg = CONFIG[kind];
  const [movementKey, setMovementKey] = useState(() => `${kind.slice(0, 3)}-${randomEventId()}`);
  const [ownerId, setOwnerId] = useState("");
  const [fromOwnerId, setFromOwnerId] = useState("");
  const [toOwnerId, setToOwnerId] = useState("");
  const [currency, setCurrency] = useState("LP");
  const [amount, setAmount] = useState("100");
  const [mode, setMode] = useState("AUTO");
  const [targetId, setTargetId] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MovementView | null>(null);

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      const amt = Number(amount);
      if (!Number.isFinite(amt) || amt <= 0) {
        throw new Error("amount must be a positive number");
      }
      const base = {
        movementKey: movementKey.trim(),
        currency,
        amount: amt,
        mode,
        description: description.trim() || undefined,
      };
      let data: MovementView;
      if (kind === "deposit") {
        if (!ownerId.trim()) throw new Error("ownerId is required");
        data = (await engine.deposit({ ...base, ownerId: ownerId.trim() })).data;
      } else if (kind === "withdraw") {
        if (!ownerId.trim()) throw new Error("ownerId is required");
        data = (
          await engine.withdraw({
            ...base,
            ownerId: ownerId.trim(),
            targetId: targetId.trim() || undefined,
          })
        ).data;
      } else {
        if (!fromOwnerId.trim() || !toOwnerId.trim()) {
          throw new Error("fromOwnerId and toOwnerId are required");
        }
        data = (
          await engine.transferInWallet({
            ...base,
            fromOwnerId: fromOwnerId.trim(),
            toOwnerId: toOwnerId.trim(),
          })
        ).data;
      }
      setResult(data);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell flow="ledger" title={cfg.title} description={cfg.description} api={cfg.api}>
      <div className="mb-4">
        <ExplainBox title="Canonical rails API" tone="ops">
          <p>{cfg.explain}</p>
          <p className="mt-2 text-xs text-muted">
            Legacy wallet-id paths under <code>/ledger/*</code> remain for parity tests only — this
            console uses <code>/movements/*</code>.
          </p>
        </ExplainBox>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Request">
          <div className="space-y-3">
            <label className="field">
              <FieldLabel tip="Unique idempotency key for this movement">movementKey</FieldLabel>
              <input
                className="field-input font-mono"
                value={movementKey}
                onChange={(e) => setMovementKey(e.target.value)}
              />
            </label>

            {kind === "transfer" ? (
              <>
                <label className="field">
                  <FieldLabel tip="Source wallet ownerId">fromOwnerId</FieldLabel>
                  <input
                    className="field-input font-mono"
                    value={fromOwnerId}
                    onChange={(e) => setFromOwnerId(e.target.value)}
                  />
                </label>
                <label className="field">
                  <FieldLabel tip="Destination wallet ownerId">toOwnerId</FieldLabel>
                  <input
                    className="field-input font-mono"
                    value={toOwnerId}
                    onChange={(e) => setToOwnerId(e.target.value)}
                  />
                </label>
              </>
            ) : (
              <label className="field">
                <FieldLabel tip="Wallet ownerId (same as webhook / review)">ownerId</FieldLabel>
                <input
                  className="field-input font-mono"
                  value={ownerId}
                  onChange={(e) => setOwnerId(e.target.value)}
                />
              </label>
            )}

            <label className="field">
              <FieldLabel tip="Book currency">currency</FieldLabel>
              <select className="field-select" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                {["LP", "HKD", "USD"].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>

            <label className="field">
              <FieldLabel tip="Positive amount in currency units">amount</FieldLabel>
              <input
                className="field-input font-mono"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </label>

            <label className="field">
              <FieldLabel tip="AUTO settles immediately; MANUAL stays pending until PUT /movements/{id}/settle">
                mode
              </FieldLabel>
              <select className="field-select" value={mode} onChange={(e) => setMode(e.target.value)}>
                {["AUTO", "MANUAL"].map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </label>

            {kind === "withdraw" && (
              <label className="field">
                <FieldLabel tip="Optional external payout target reference">targetId</FieldLabel>
                <input
                  className="field-input font-mono"
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                />
              </label>
            )}

            <label className="field">
              <span className="field-label">description</span>
              <input
                className="field-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>

            <ActionBar loading={loading} error={error}>
              <button type="button" className="btn-primary" onClick={submit}>
                Submit {cfg.title.toLowerCase()}
              </button>
            </ActionBar>
          </div>
        </Card>

        <Card title="Response">
          {result ? (
            <JsonBlock value={result} />
          ) : (
            <p className="text-sm text-muted">Submit to see movement response (status, orderType, walletId).</p>
          )}
        </Card>
      </div>
    </PageShell>
  );
}
