"use client";

import { useEffect, useState } from "react";
import { PageHeader, Card, JsonBlock } from "@/components/ui/kit";
import { ActionBar } from "@/components/ui/action";
import { engine } from "@/lib/engine";
import { errMsg, nowIso, randomEventId, randomOwnerId } from "@/lib/format";

export default function WebhookPage() {
  const [ownerId, setOwnerId] = useState("");
  const [eventId, setEventId] = useState(randomEventId());
  const [eventType, setEventType] = useState("PURCHASE");
  const [amount, setAmount] = useState("100");
  const [currency, setCurrency] = useState("HKD");
  const [occurredAt, setOccurredAt] = useState(nowIso());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<unknown>(null);

  useEffect(() => {
    try {
      const s = sessionStorage.getItem("review.ownerId");
      if (s) setOwnerId(s);
    } catch {
      /* */
    }
  }, []);

  const fire = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await engine.webhookTxn({
        eventId: eventId.trim(),
        ownerId: ownerId.trim(),
        eventType,
        amount: Number(amount),
        currency,
        occurredAt,
        metadata: { source: "admin-portal" },
      });
      setResult(r.data);
    } catch (e) {
      setError(errMsg(e));
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Fire webhook"
        description="POST /integrations/webhooks/transactions — ownerId + eventId idempotency."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Payload">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="field sm:col-span-2">
              <span className="field-label">ownerId</span>
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
            <label className="field sm:col-span-2">
              <span className="field-label">eventId</span>
              <div className="flex gap-2">
                <input
                  className="field-input font-mono"
                  value={eventId}
                  onChange={(e) => setEventId(e.target.value)}
                />
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setEventId(randomEventId())}
                >
                  Gen
                </button>
              </div>
            </label>
            <label className="field">
              <span className="field-label">eventType</span>
              <select
                className="field-select"
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
              >
                {["PURCHASE", "REDEEM", "SIGNUP", "REFUND"].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">currency</span>
              <select
                className="field-select"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                {["HKD", "USD", "JPY", "LP"].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">amount</span>
              <input
                className="field-input font-mono"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </label>
            <label className="field">
              <span className="field-label">occurredAt</span>
              <input
                className="field-input font-mono text-xs"
                value={occurredAt}
                onChange={(e) => setOccurredAt(e.target.value)}
              />
            </label>
          </div>
          <div className="mt-4">
            <ActionBar loading={loading} error={error}>
              <button type="button" className="btn-primary" onClick={fire} disabled={loading}>
                Send
              </button>
            </ActionBar>
          </div>
        </Card>
        <Card title="Response">
          {result ? <JsonBlock value={result} /> : <p className="text-sm text-slate-500">—</p>}
        </Card>
      </div>
    </div>
  );
}
