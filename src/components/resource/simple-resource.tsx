"use client";

import { useEffect, useState } from "react";
import { PageHeader, Card, JsonBlock } from "@/components/ui/kit";
import { ActionBar } from "@/components/ui/action";
import { ledger, qs } from "@/lib/api";
import { errMsg } from "@/lib/format";

/** Generic list/create helper for secondary resources. */
export default function SimpleResourcePage({
  title,
  description,
  listPath,
  createPath,
  sample,
}: {
  title: string;
  description: string;
  listPath: string;
  createPath?: string;
  sample?: Record<string, unknown>;
}) {
  const [body, setBody] = useState(
    sample ? JSON.stringify(sample, null, 2) : "{\n}\n",
  );
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const path = listPath.includes("?")
        ? listPath
        : `${listPath}${qs({ page: 1, size: 50 })}`;
      const r = await ledger.get(path);
      setData(r.data);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
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
      await load();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader title={title} description={description} />
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
                Refresh
              </button>
            </ActionBar>
          </Card>
        )}
        <Card title="Data">
          {data ? <JsonBlock value={data} maxHeight={480} /> : null}
        </Card>
      </div>
    </div>
  );
}
