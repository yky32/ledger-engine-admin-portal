"use client";

import { useEffect, useState } from "react";
import { Card, JsonBlock, Empty } from "@/components/ui/kit";
import { ActionBar } from "@/components/ui/action";
import { ledger, qs } from "@/lib/api";
import { errMsg } from "@/lib/format";
import { PageShell, type FlowStep } from "@/components/layout/page-shell";

/**
 * Generic list/create helper for secondary resources.
 * - pageable: append ?page=1&size=50 (1-based engine pageable APIs)
 * - autoload: default true; set false for endpoints that need params
 */
export default function SimpleResourcePage({
  title,
  description,
  listPath,
  createPath,
  sample,
  pageable = true,
  autoload = true,
  showFlow,
}: {
  title: string;
  description: string;
  listPath: string;
  createPath?: string;
  sample?: Record<string, unknown>;
  pageable?: boolean;
  autoload?: boolean;
  showFlow?: FlowStep;
}) {
  const [body, setBody] = useState(sample ? JSON.stringify(sample, null, 2) : "{\n}\n");
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      let path = listPath;
      if (pageable && !listPath.includes("?")) {
        path = `${listPath}${qs({ page: 1, size: 50 })}`;
      }
      const r = await ledger.get(path);
      setData(r.data);
      setLoaded(true);
    } catch (e) {
      setError(errMsg(e));
      setData(null);
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoload) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const create = async () => {
    if (!createPath) return;
    setLoading(true);
    setError(null);
    try {
      const json = JSON.parse(body);
      const r = await ledger.post(createPath, json);
      setData(r.data);
      if (autoload || loaded) await load();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell
      flow={showFlow}
      title={title}
      description={description}
      api={[
        { method: "GET", path: listPath },
        ...(createPath ? [{ method: "POST" as const, path: createPath }] : []),
      ]}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        {createPath ? (
          <Card title="Create / POST body">
            <textarea
              className="field-input min-h-[220px] font-mono text-xs"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <div className="mt-3">
              <ActionBar loading={loading} error={error}>
                <button type="button" className="btn-primary" onClick={create}>
                  POST
                </button>
                <button type="button" className="btn-secondary" onClick={load}>
                  Refresh list
                </button>
              </ActionBar>
            </div>
          </Card>
        ) : (
          <Card title="Actions">
            <ActionBar loading={loading} error={error}>
              <button type="button" className="btn-secondary" onClick={load}>
                {autoload ? "Refresh" : "Load"}
              </button>
            </ActionBar>
            {!autoload && !loaded ? (
              <p className="mt-2 text-xs text-slate-500">Click Load — no auto request on open.</p>
            ) : null}
          </Card>
        )}
        <Card title="Data">
          {data != null ? (
            <JsonBlock value={data} maxHeight={480} />
          ) : loaded && !error ? (
            <Empty>Empty</Empty>
          ) : !loaded && !autoload ? (
            <Empty>Not loaded</Empty>
          ) : null}
        </Card>
      </div>
    </PageShell>
  );
}
