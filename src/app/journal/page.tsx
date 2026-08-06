"use client";

import { useState } from "react";
import { ledger, ApiError } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { JsonBlock } from "@/components/ui/json-block";
import { Alert } from "@/components/ui/alert";

const SAMPLE = `{
  "idempotencyKey": "admin-post-1",
  "description": "Manual journal from admin",
  "entries": [
    { "accountId": 1, "direction": "DEBIT", "amount": 100 },
    { "accountId": 2, "direction": "CREDIT", "amount": 100 }
  ]
}`;

export default function JournalPage() {
  const [body, setBody] = useState(SAMPLE);
  const [txId, setTxId] = useState("");
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);

  async function postTxn() {
    setError(null);
    try {
      const json = JSON.parse(body);
      const data = await ledger.post("/transactions", json);
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function loadTxn() {
    setError(null);
    try {
      const data = await ledger.get(`/transactions/${encodeURIComponent(txId)}`);
      setResult(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    }
  }

  async function reverseTxn() {
    setError(null);
    try {
      const data = await ledger.post(`/transactions/${encodeURIComponent(txId)}/reversal`, {
        idempotencyKey: `rev-${txId}-${Date.now()}`,
        reason: "admin reverse",
      });
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div>
      <PageHeader
        title="Journal transactions"
        description="POST /transactions, GET /transactions/{id}, reverse."
      />
      {error ? (
        <div className="mb-4">
          <Alert variant="error">{error}</Alert>
        </div>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Post transaction" description="Balanced double-entry JSON" />
          <CardBody className="space-y-3">
            <Textarea rows={14} value={body} onChange={(e) => setBody(e.target.value)} />
            <Button onClick={() => void postTxn()}>POST /transactions</Button>
          </CardBody>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader title="Lookup / reverse" />
            <CardBody className="space-y-3">
              <Field label="Transaction UUID">
                <Input value={txId} onChange={(e) => setTxId(e.target.value)} />
              </Field>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => void loadTxn()}>
                  GET
                </Button>
                <Button variant="danger" onClick={() => void reverseTxn()}>
                  Reverse
                </Button>
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Response" />
            <CardBody>
              <JsonBlock value={result ?? {}} />
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
