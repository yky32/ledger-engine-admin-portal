"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, Badge, Empty, JsonBlock, ApiPath } from "@/components/ui/kit";
import { PageShell } from "@/components/layout/page-shell";
import { FilterBar } from "@/components/ui/filter-bar";
import { engine } from "@/lib/engine";
import { errMsg } from "@/lib/format";

type CoaRow = {
  id?: number;
  code?: string;
  name?: string;
  transactionCode?: string | null;
  isDefault?: boolean;
  isEnabled?: boolean;
  entity?: string;
  type?: string;
  subType?: string;
  buffer?: string;
  currency?: string;
  poolAllowNegative?: boolean;
};

export default function CoaQueryListPage() {
  const [rows, setRows] = useState<CoaRow[]>([]);
  const [code, setCode] = useState("");
  const [selected, setSelected] = useState<CoaRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calledPath, setCalledPath] = useState("/coa-profiles");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = code.trim();
      if (q) {
        setCalledPath("/coa-profiles");
        const r = await engine.coaProfiles();
        const list = Array.isArray(r.data) ? (r.data as CoaRow[]) : [];
        const hit = list.filter(
          (x) =>
            x.code?.toUpperCase() === q.toUpperCase() ||
            x.transactionCode?.toUpperCase() === q.toUpperCase(),
        );
        setRows(hit.length ? hit : list.filter((x) => x.code?.toUpperCase().includes(q.toUpperCase())));
      } else {
        setCalledPath("/coa-profiles");
        const r = await engine.coaProfiles();
        const list = Array.isArray(r.data) ? (r.data as CoaRow[]) : [];
        setRows(list.filter((x) => (x.code || "").toUpperCase() !== "DEFAULT"));
      }
    } catch (e) {
      setRows([]);
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <PageShell
      flow="books"
      title="Customer COA — 01-01-01"
      description="Custodian chart for member wallets (CUSTOMER_CUST_HKD / LP). Not house 01-02 / 01-04. Edit under Brain — Customer COA."
      api={[
        { method: "GET", path: "/coa-profiles" },
        { method: "GET", path: "/coa-profiles/default" },
      ]}
      actions={
        <Link href="/coa" className="btn-secondary text-xs">
          Edit customer COA →
        </Link>
      }
    >
      <FilterBar loading={loading} error={error} onSubmit={() => void load()}>
        <label className="field min-w-[200px]">
          <span className="field-label">code / transactionCode (optional)</span>
          <input
            className="field-input font-mono"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="CUSTOMER_CUST_LP"
          />
        </label>
      </FilterBar>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card
          title={`Profiles (${rows.length})`}
          className="lg:col-span-3"
          right={<ApiPath method="GET" path={calledPath} />}
        >
          {rows.length === 0 ? (
            <Empty>{loading ? "Loading…" : "No COA profiles"}</Empty>
          ) : (
            <div className="table-wrap max-h-[640px] overflow-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>id</th>
                    <th>code</th>
                    <th>name</th>
                    <th>txn</th>
                    <th>default</th>
                    <th>on</th>
                    <th>entity</th>
                    <th>type</th>
                    <th>sub</th>
                    <th>buf</th>
                    <th>ccy</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={r.id ?? r.code}
                      className={selected?.id === r.id ? "bg-emerald-50" : "cursor-pointer"}
                      onClick={() => setSelected(r)}
                    >
                      <td className="font-mono text-[10px]">{r.id ?? "—"}</td>
                      <td className="font-mono text-xs font-medium">{r.code}</td>
                      <td className="max-w-[160px] truncate">{r.name || "—"}</td>
                      <td className="font-mono text-[10px]">{r.transactionCode || r.code || "—"}</td>
                      <td>{r.isDefault ? <Badge tone="ok">yes</Badge> : "—"}</td>
                      <td>
                        <Badge tone={r.isEnabled ? "ok" : "neutral"}>{r.isEnabled ? "on" : "off"}</Badge>
                      </td>
                      <td className="font-mono text-[10px]">{r.entity}</td>
                      <td className="font-mono text-[10px]">{r.type}</td>
                      <td className="font-mono text-[10px]">{r.subType}</td>
                      <td className="font-mono text-[10px]">{r.buffer}</td>
                      <td>{r.currency || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card
          title={selected ? `Row · ${selected.code}` : "Row JSON"}
          className="lg:col-span-2"
          right={
            selected?.id ? (
              <Link href="/coa" className="text-xs text-emerald-700 hover:underline">
                Edit →
              </Link>
            ) : null
          }
        >
          {selected ? <JsonBlock value={selected} maxHeight={480} /> : <Empty>Click a row</Empty>}
        </Card>
      </div>
    </PageShell>
  );
}
