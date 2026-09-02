"use client";

import { useEffect, useState } from "react";
import { Card, JsonBlock } from "@/components/ui/kit";
import { engine } from "@/lib/engine";
import { errMsg } from "@/lib/format";
import { PageShell } from "@/components/layout/page-shell";

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
    <PageShell
      title="Engine health"
      description="Best-effort /actuator/health or /dashboards via rewrite."
      api={[
        { method: "GET", path: "/actuator/health" },
        { method: "GET", path: "/dashboards" },
      ]}
      error={error}
    >
      <Card title="Response">{data ? <JsonBlock value={data} /> : null}</Card>
    </PageShell>
  );
}
