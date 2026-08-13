"use client";

import { useEffect, useState } from "react";
import { PageHeader, Card, JsonBlock, Alert } from "@/components/ui/kit";
import { ActionBar } from "@/components/ui/action";
import { engine } from "@/lib/engine";
import { errMsg } from "@/lib/format";
import type { IngestPolicy } from "@/lib/types";

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
      setOk("Saved");
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Ingest policy"
        description="Webhook door — global on/off + auto-create wallet. PUT /ingest-policy"
      />
      {!policy ? (
        <ActionBar loading={loading} error={error}>
          <button type="button" className="btn-secondary" onClick={load}>
            Load
          </button>
        </ActionBar>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Edit">
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!policy.isEnabled}
                  onChange={(e) =>
                    setPolicy({ ...policy, isEnabled: e.target.checked })
                  }
                />
                isEnabled (master switch)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!policy.isAutoCreateWallet}
                  onChange={(e) =>
                    setPolicy({ ...policy, isAutoCreateWallet: e.target.checked })
                  }
                />
                isAutoCreateWallet
              </label>
              {(
                [
                  ["autoWalletSettlementCurrency", "settlement ccy"],
                  ["autoWalletEnsureCurrency", "ensure ccy"],
                  ["autoWalletAssociatedFrom", "associatedFrom label"],
                  ["autoWalletNamePrefix", "name prefix"],
                ] as const
              ).map(([k, label]) => (
                <label key={k} className="field">
                  <span className="field-label">{label}</span>
                  <input
                    className="field-input"
                    value={String(policy[k] ?? "")}
                    onChange={(e) =>
                      setPolicy({ ...policy, [k]: e.target.value })
                    }
                  />
                </label>
              ))}
              <ActionBar loading={loading} error={error} ok={ok}>
                <button type="button" className="btn-primary" onClick={save}>
                  Save
                </button>
                <button type="button" className="btn-secondary" onClick={load}>
                  Reload
                </button>
              </ActionBar>
              <Alert tone="info">
                Digestion rules decide scoring. This only gates admission + auto wallet.
              </Alert>
            </div>
          </Card>
          <Card title="Raw">
            <JsonBlock value={policy} />
          </Card>
        </div>
      )}
    </div>
  );
}
