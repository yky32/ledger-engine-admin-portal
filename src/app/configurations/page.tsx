"use client";

import { useState } from "react";
import { ledger, ApiError } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { JsonBlock } from "@/components/ui/json-block";
import { Alert } from "@/components/ui/alert";

export default function ConfigurationsPage() {
  const [target, setTarget] = useState("program");
  const [scope, setScope] = useState("global");
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const q = new URLSearchParams({ target, scope });
      const data = await ledger.get(`/configurations?${q}`);
      setResult(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    }
  }

  async function upsert() {
    setError(null);
    try {
      const data = await ledger.put("/configurations", {
        name: name || target,
        target,
        scope,
        value,
      });
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div>
      <PageHeader
        title="System configurations"
        description="GET/PUT /configurations"
      />
      {error ? (
        <div className="mb-4">
          <Alert variant="error">{error}</Alert>
        </div>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Get / Upsert" />
          <CardBody className="space-y-3">
            <Field label="Target">
              <Input value={target} onChange={(e) => setTarget(e.target.value)} />
            </Field>
            <Field label="Scope">
              <Input value={scope} onChange={(e) => setScope(e.target.value)} />
            </Field>
            <Field label="Name (upsert)">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="defaults to target" />
            </Field>
            <Field label="Value (upsert)">
              <Textarea rows={4} value={value} onChange={(e) => setValue(e.target.value)} />
            </Field>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => void load()}>
                GET
              </Button>
              <Button onClick={() => void upsert()}>PUT upsert</Button>
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
  );
}
