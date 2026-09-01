"use client";

import { useEffect, useState } from "react";
import { PageHeader, Card, JsonBlock, Alert } from "@/components/ui/kit";
import { engine } from "@/lib/engine";
import { errMsg } from "@/lib/format";
import { EngineStatusBanner } from "@/components/layout/engine-status-banner";

export default function HealthPage() {
  const [data, setData] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await engine.health();
        setData(r.data);
      } catch (e) {
        setError(errMsg(e));
      }
    })();
  }, []);

  return (
    <div>
      <PageHeader
        title="Engine health"
        description="Best-effort /actuator/health or /dashboards via rewrite."
        api={[
          { method: "GET", path: "/actuator/health" },
          { method: "GET", path: "/dashboards" },
        ]}
      />
      <EngineStatusBanner />
      {error ? <Alert tone="error">{error}</Alert> : null}
      <Card title="Response">{data ? <JsonBlock value={data} /> : null}</Card>
    </div>
  );
}
