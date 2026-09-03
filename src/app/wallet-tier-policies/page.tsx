"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, Alert, JsonBlock, Badge } from "@/components/ui/kit";
import { ActionBar } from "@/components/ui/action";
import { PageShell } from "@/components/layout/page-shell";
import { engine } from "@/lib/engine";
import { errMsg } from "@/lib/format";
import type { WalletTierBand, WalletTierPolicy } from "@/lib/types";

const emptyBand = (): WalletTierBand => ({ code: "", upgradeAt: "0", downgradeBelow: "" });

export default function WalletTierPoliciesPage() {
  const [enabled, setEnabled] = useState(true);
  const [entity, setEntity] = useState("01");
  const [type, setType] = useState("01");
  const [subType, setSubType] = useState("01");
  const [currency, setCurrency] = useState("LP");
  const [bands, setBands] = useState<WalletTierBand[]>([emptyBand()]);
  const [saved, setSaved] = useState<WalletTierPolicy | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const apply = (p: WalletTierPolicy) => {
    setEnabled(p.isEnabled !== false);
    setEntity(p.entity || "01");
    setType(p.type || "01");
    setSubType(p.subType || "01");
    setCurrency(p.currency || "LP");
    setBands(p.bands && p.bands.length > 0 ? p.bands.map((b) => ({ ...b })) : [emptyBand()]);
    setSaved(p);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await engine.walletTierPolicyGet();
      apply(r.data as WalletTierPolicy);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    setLoading(true);
    setError(null);
    setOk(null);
    try {
      const r = await engine.walletTierPolicyPut({
        isEnabled: enabled,
        criterion: "LEDGER_BALANCE",
        entity,
        type,
        subType,
        currency,
        bands: bands
          .filter((b) => b.code.trim())
          .map((b) => ({
            code: b.code.trim().toUpperCase(),
            upgradeAt: b.upgradeAt,
            downgradeBelow:
              b.downgradeBelow === "" || b.downgradeBelow == null ? null : b.downgradeBelow,
          })),
      });
      apply(r.data as WalletTierPolicy);
      setOk(
        enabled
          ? "Enabled — next LP book movement reassesses wallet.tier in the same TX."
          : "Saved draft (off). Settle will not change wallet.tier until you Enable.",
      );
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  const setBand = (i: number, patch: Partial<WalletTierBand>) => {
    setBands((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  };

  return (
    <PageShell
      title="Wallet tiering"
      description="Save as Enabled to start realtime wallet.tier. Until then settle does not change tiers."
      api={[
        { method: "GET", path: "/wallet-tier-policies" },
        { method: "PUT", path: "/wallet-tier-policies" },
      ]}
    >
      <Alert tone="info">
        Criterion is <code className="text-xs">LEDGER_BALANCE</code> on{" "}
        <code className="text-xs">
          {entity}-{type}-{subType} {currency}
        </code>
        . Upgrade at <code className="text-xs">upgradeAt</code>; downgrade when below{" "}
        <code className="text-xs">downgradeBelow</code> (blank = use upgradeAt). HOUSE skipped.
        Opening this page loads a disabled draft — click <strong>Enabled</strong> then <strong>Save</strong> to start assessing. Changing bands does not recalc existing wallets until their next LP movement.
      </Alert>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <Card title="Policy" className="lg:col-span-3">
          <div className="mb-3 flex flex-wrap gap-2">
            <button
              type="button"
              className={enabled ? "btn-primary text-xs" : "btn-secondary text-xs"}
              onClick={() => setEnabled(true)}
            >
              Enabled
            </button>
            <button
              type="button"
              className={!enabled ? "btn-primary text-xs" : "btn-secondary text-xs"}
              onClick={() => setEnabled(false)}
            >
              Off
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <label className="field">
              <span className="field-label">entity</span>
              <input className="field-input font-mono" value={entity} onChange={(e) => setEntity(e.target.value)} />
            </label>
            <label className="field">
              <span className="field-label">type</span>
              <input className="field-input font-mono" value={type} onChange={(e) => setType(e.target.value)} />
            </label>
            <label className="field">
              <span className="field-label">subType</span>
              <input className="field-input font-mono" value={subType} onChange={(e) => setSubType(e.target.value)} />
            </label>
            <label className="field">
              <span className="field-label">currency</span>
              <input
                className="field-input font-mono"
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              />
            </label>
          </div>

          <div className="table-wrap mt-4">
            <table className="data-table">
              <thead>
                <tr>
                  <th>code</th>
                  <th>upgradeAt</th>
                  <th>downgradeBelow</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {bands.map((b, i) => (
                  <tr key={i}>
                    <td>
                      <input
                        className="field-input font-mono text-xs"
                        value={b.code}
                        onChange={(e) => setBand(i, { code: e.target.value })}
                        placeholder="GOLD"
                      />
                    </td>
                    <td>
                      <input
                        className="field-input font-mono text-xs"
                        value={String(b.upgradeAt ?? "")}
                        onChange={(e) => setBand(i, { upgradeAt: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        className="field-input font-mono text-xs"
                        value={b.downgradeBelow == null ? "" : String(b.downgradeBelow)}
                        onChange={(e) => setBand(i, { downgradeBelow: e.target.value })}
                        placeholder="= upgradeAt"
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn-secondary text-[10px]"
                        onClick={() => setBands((rows) => rows.filter((_, idx) => idx !== i))}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            className="btn-secondary mt-2 text-xs"
            onClick={() => setBands((rows) => [...rows, emptyBand()])}
          >
            Add band
          </button>

          <div className="mt-4">
            <ActionBar loading={loading} error={error}>
              <button type="button" className="btn-secondary" onClick={() => void load()} disabled={loading}>
                Reload
              </button>
              <button type="button" className="btn-primary" onClick={() => void save()} disabled={loading}>
                Save
              </button>
            </ActionBar>
            {ok ? (
              <p className="mt-2 text-xs text-emerald-700">{ok}</p>
            ) : null}
          </div>
        </Card>
        <Card
          title="Saved JSON"
          className="lg:col-span-2"
          right={saved?.isEnabled ? <Badge tone="ok">on</Badge> : <Badge tone="neutral">off</Badge>}
        >
          {saved ? <JsonBlock value={saved} /> : <p className="text-sm text-slate-500">—</p>}
        </Card>
      </div>
    </PageShell>
  );
}
