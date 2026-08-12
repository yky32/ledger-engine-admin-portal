"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { ledger, ApiError } from "@/lib/api";
import { asRecord, nowIso } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { JsonBlock } from "@/components/ui/json-block";
import { Alert } from "@/components/ui/alert";

/**
 * Post-test review desk: paste CUST id from upstream-sim / smoke and inspect wallet, movements, legs, fails.
 */
export default function ReviewPage() {
  const [cust, setCust] = useState("");
  const [eventId, setEventId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wallet, setWallet] = useState<unknown>(null);
  const [movements, setMovements] = useState<unknown>(null);
  const [asOf, setAsOf] = useState<unknown>(null);
  const [legs, setLegs] = useState<unknown>(null);
  const [fails, setFails] = useState<unknown>(null);

  const load = useCallback(async () => {
    const id = cust.trim();
    if (!id) {
      setError("Enter associatedIdentifier (CUST id)");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [w, m, a, f] = await Promise.all([
        ledger.get(`/wallets/${encodeURIComponent(id)}?currencies=LP,HKD`),
        ledger.get(
          `/wallets/${encodeURIComponent(id)}/movements?page=1&size=50`,
        ),
        ledger.get(`/wallets/${encodeURIComponent(id)}/balances/as-of?currency=LP`),
        ledger.get(
          `/integrations/failed-transactions?associatedIdentifier=${encodeURIComponent(id)}&page=1&size=50`,
        ),
      ]);
      setWallet(w);
      setMovements(m);
      setAsOf(a);
      setFails(f);
      if (eventId.trim()) {
        const L = await ledger.get(
          `/integrations/ledger-entries?eventId=${encodeURIComponent(eventId.trim())}`,
        );
        setLegs(L);
      } else {
        setLegs(null);
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [cust, eventId]);

  const fireQuickPurchase = useCallback(async () => {
    const id = cust.trim();
    if (!id) {
      setError("Enter CUST first");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const eid = `admin-${Date.now()}-${Math.floor(Math.random() * 9999)}`;
      const res = await ledger.post("/integrations/webhooks/transactions", {
        eventId: eid,
        associatedIdentifier: id,
        eventType: "PURCHASE",
        amount: 200,
        currency: "HKD",
        occurredAt: nowIso(),
        metadata: { source: "admin-portal-review" },
      });
      setEventId(eid);
      setLegs(res);
      const [w, m, a, f] = await Promise.all([
        ledger.get(`/wallets/${encodeURIComponent(id)}?currencies=LP,HKD`),
        ledger.get(`/wallets/${encodeURIComponent(id)}/movements?page=1&size=50`),
        ledger.get(`/wallets/${encodeURIComponent(id)}/balances/as-of?currency=LP`),
        ledger.get(
          `/integrations/failed-transactions?associatedIdentifier=${encodeURIComponent(id)}&page=1&size=50`,
        ),
      ]);
      setWallet(w);
      setMovements(m);
      setAsOf(a);
      setFails(f);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [cust]);

  const walletData = asRecord(wallet);
  const acctList = Array.isArray(walletData?.accounts)
    ? (walletData!.accounts as Record<string, unknown>[])
    : [];

  return (
    <div>
      <PageHeader
        title="Customer review"
        description="After ./scripts/upstream-sim.sh — paste CUST id and inspect balances, movements, legs, fails."
      />

      <Card className="mb-4">
        <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Field label="associatedIdentifier (CUST)">
            <Input
              value={cust}
              onChange={(e) => setCust(e.target.value)}
              placeholder="01A12345678"
              className="min-w-[200px] font-mono"
            />
          </Field>
          <Field label="eventId (optional legs)">
            <Input
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              placeholder="up-… or pos-…"
              className="min-w-[200px] font-mono"
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void load()} disabled={loading}>
              {loading ? "Loading…" : "Load review"}
            </Button>
            <Button variant="secondary" onClick={() => void fireQuickPurchase()} disabled={loading}>
              Fire test PURCHASE 200 HKD
            </Button>
            <Link
              href="/failed-transactions"
              className="inline-flex items-center rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
            >
              All fails
            </Link>
          </div>
        </CardBody>
      </Card>

      {error ? (
        <div className="mb-4">
          <Alert variant="error">{error}</Alert>
        </div>
      ) : null}

      {acctList.length > 0 ? (
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {acctList.map((a, i) => (
            <Card key={String(a.id ?? i)}>
              <CardBody>
                <div className="text-xs text-zinc-500">{String(a.currency ?? "—")}</div>
                <div className="mt-1 text-sm">
                  ledger{" "}
                  <span className="font-semibold tabular-nums">
                    {String(a.ledgerBalance ?? a.ledger_balance ?? "—")}
                  </span>
                </div>
                <div className="text-sm">
                  available{" "}
                  <span className="font-semibold tabular-nums">
                    {String(a.availableBalance ?? a.available_balance ?? "—")}
                  </span>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Wallet" description="GET /wallets/{id}?currencies=LP,HKD" />
          <CardBody>
            <JsonBlock value={wallet ?? { hint: "Load a CUST" }} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="As-of LP" description="GET …/balances/as-of?currency=LP" />
          <CardBody>
            <JsonBlock value={asOf ?? { hint: "Load a CUST" }} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Movements" description="GET …/movements?page=1&size=50" />
          <CardBody>
            <JsonBlock value={movements ?? { hint: "Load a CUST" }} maxHeight={360} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader
            title="Legs (by eventId)"
            description="GET /integrations/ledger-entries?eventId="
          />
          <CardBody>
            <JsonBlock
              value={legs ?? { hint: "Set eventId then Load, or Fire test PURCHASE" }}
              maxHeight={360}
            />
          </CardBody>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader
            title="Failed ingest for this CUST"
            description="GET /integrations/failed-transactions?associatedIdentifier="
          />
          <CardBody>
            <JsonBlock value={fails ?? { hint: "Load a CUST" }} maxHeight={280} />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
