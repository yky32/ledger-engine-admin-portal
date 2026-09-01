"use client";

import { useState } from "react";
import { PageHeader, Card, JsonBlock } from "@/components/ui/kit";
import { ActionBar } from "@/components/ui/action";
import { engine } from "@/lib/engine";
import { errMsg } from "@/lib/format";
import { EngineStatusBanner } from "@/components/layout/engine-status-banner";

export default function ConfigurationsPage() {
  const [target, setTarget] = useState("uaa");
  const [scope, setScope] = useState("global");
  const [name, setName] = useState("user-register.otp");
  const [valueJson, setValueJson] = useState(
    '{\n  "ttlSec": 300,\n  "resendSec": 60\n}\n',
  );
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await engine.configGet(target, scope);
      setData(r.data);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    setLoading(true);
    setError(null);
    try {
      const value = JSON.parse(valueJson);
      const r = await engine.configPut({ name, target, scope, value });
      setData(r.data);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="System configuration"
        description="JSONB value — e.g. name user-register.otp. GET/PUT /configurations"
        api={[
          { method: "GET", path: "/configurations" },
          { method: "PUT", path: "/configurations" },
        ]}
      />
      <EngineStatusBanner />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Upsert">
          <div className="space-y-3">
            <label className="field">
              <span className="field-label">name</span>
              <input className="field-input" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="field">
              <span className="field-label">target</span>
              <input
                className="field-input"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              />
            </label>
            <label className="field">
              <span className="field-label">scope</span>
              <input
                className="field-input"
                value={scope}
                onChange={(e) => setScope(e.target.value)}
              />
            </label>
            <label className="field">
              <span className="field-label">value (JSON)</span>
              <textarea
                className="field-input min-h-[160px] font-mono text-xs"
                value={valueJson}
                onChange={(e) => setValueJson(e.target.value)}
              />
            </label>
            <ActionBar loading={loading} error={error}>
              <button type="button" className="btn-primary" onClick={save}>
                PUT
              </button>
              <button type="button" className="btn-secondary" onClick={load}>
                GET
              </button>
            </ActionBar>
          </div>
        </Card>
        <Card title="Response">{data ? <JsonBlock value={data} /> : null}</Card>
      </div>
    </div>
  );
}
