"use client";

import { useCallback, useEffect, useState } from "react";
import { ledger, ApiError } from "@/lib/api";
import { asRecord } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { JsonBlock } from "@/components/ui/json-block";
import { Alert } from "@/components/ui/alert";

export default function IngestPolicyPage() {
  const [raw, setRaw] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    isEnabled: "true",
    isAutoCreateWallet: "true",
    autoWalletSettlementCurrency: "HKD",
    autoWalletEnsureCurrency: "LP",
    autoWalletAssociatedFrom: "CRM",
    autoWalletNamePrefix: "Auto ",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ledger.get("/ingest-policy");
      setRaw(data);
      const d = asRecord(data);
      if (d) {
        setForm({
          isEnabled: String(d.isEnabled ?? true),
          isAutoCreateWallet: String(d.isAutoCreateWallet ?? true),
          autoWalletSettlementCurrency: String(d.autoWalletSettlementCurrency ?? "HKD"),
          autoWalletEnsureCurrency: String(d.autoWalletEnsureCurrency ?? "LP"),
          autoWalletAssociatedFrom: String(d.autoWalletAssociatedFrom ?? "CRM"),
          autoWalletNamePrefix: String(d.autoWalletNamePrefix ?? "Auto "),
        });
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setLoading(true);
    setError(null);
    try {
      const body = {
        isEnabled: form.isEnabled === "true",
        isAutoCreateWallet: form.isAutoCreateWallet === "true",
        autoWalletSettlementCurrency: form.autoWalletSettlementCurrency,
        autoWalletEnsureCurrency: form.autoWalletEnsureCurrency,
        autoWalletAssociatedFrom: form.autoWalletAssociatedFrom,
        autoWalletNamePrefix: form.autoWalletNamePrefix,
      };
      const data = await ledger.put("/ingest-policy", body);
      setRaw(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Ingest policy"
        description="Door — kill-switch + auto-wallet. GET/PUT /ingest-policy (not digestion formulas)."
      />
      {error ? (
        <div className="mb-4">
          <Alert variant="error">{error}</Alert>
        </div>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Edit"
            actions={
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => void load()} disabled={loading}>
                  Reload
                </Button>
                <Button onClick={() => void save()} disabled={loading}>
                  Save PUT
                </Button>
              </div>
            }
          />
          <CardBody className="grid gap-3">
            {(
              [
                ["isEnabled", "isEnabled (true/false)"],
                ["isAutoCreateWallet", "isAutoCreateWallet"],
                ["autoWalletSettlementCurrency", "settlement ccy"],
                ["autoWalletEnsureCurrency", "ensure ccy (LP)"],
                ["autoWalletAssociatedFrom", "associatedFrom"],
                ["autoWalletNamePrefix", "name prefix"],
              ] as const
            ).map(([k, label]) => (
              <Field key={k} label={label}>
                <Input
                  value={form[k]}
                  onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
                />
              </Field>
            ))}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Raw" />
          <CardBody>
            <JsonBlock value={raw} />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
