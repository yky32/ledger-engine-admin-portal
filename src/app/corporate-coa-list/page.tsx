"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, Badge, Empty, JsonBlock, ApiPath } from "@/components/ui/kit";
import { PageShell } from "@/components/layout/page-shell";
import { FilterBar } from "@/components/ui/filter-bar";
import { engine } from "@/lib/engine";
import { errMsg } from "@/lib/format";
import { isHouseCoaCode } from "@/lib/recipes";

type CoaRow = {
  id?: number | string;
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
  walletId?: number | string | null;
};

export default function CorporateCoaListPage() {
  const [rows, setRows] = useState<CoaRow[]>([]);
  const [code, setCode] = useState("");
  const [selected, setSelected] = useState<CoaRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await engine.coaProfiles();
      let list = (Array.isArray(r.data) ? (r.data as CoaRow[]) : []).filter((x) =>
        isHouseCoaCode(x.code),
      );
      const q = code.trim().toUpperCase();
      if (q) {
        list = list.filter(
          (x) =>
            x.code?.toUpperCase().includes(q) ||
            x.transactionCode?.toUpperCase().includes(q) ||
            x.name?.toUpperCase().includes(q),
        );
      }
      setRows(list);
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
      flow="ledger"
      title="House COA — company books"
      description="UAF finance wallet (ownerId HOUSE). Operating 01-02 and expense 01-04 only — not customer 01-01-01. Edit under House COA."
      api={[{ method: "GET", path: "/coa-profiles" }]}
      actions={
        <Link href="/corporate-coa" className="btn-secondary text-xs">
          Edit house COA →
        </Link>
      }
    >
      <FilterBar loading={loading} error={error} onSubmit={() => void load()}>
        <label className="field min-w-[200px]">
          <span className="field-label">code / name (optional)</span>
          <input
            className="field-input font-mono"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="HOUSE_LP"
          />
        </label>
      </FilterBar>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card
          title={`House profiles (${rows.length})`}
          className="lg:col-span-3"
          right={<ApiPath method="GET" path="/coa-profiles" />}
        >
          {rows.length === 0 ? (
            <Empty>{loading ? "Loading…" : "No house COA — create under Corporate COA"}</Empty>
          ) : (
            <div className="table-wrap max-h-[640px] overflow-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>code</th>
                    <th>name</th>
                    <th>entity</th>
                    <th>type</th>
                    <th>sub</th>
                    <th>buf</th>
                    <th>ccy</th>
                    <th>walletId</th>
                    <th>pool−</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={String(r.id ?? r.code)}
                      className={
                        selected && String(selected.id) === String(r.id)
                          ? "cursor-pointer bg-emerald-50"
                          : "cursor-pointer"
                      }
                      onClick={() => setSelected(r)}
                    >
                      <td className="font-mono text-xs font-medium">{r.code}</td>
                      <td className="max-w-[180px] truncate">{r.name || "—"}</td>
                      <td className="font-mono text-[10px]">{r.entity}</td>
                      <td className="font-mono text-[10px]">{r.type}</td>
                      <td className="font-mono text-[10px]">{r.subType}</td>
                      <td className="font-mono text-[10px]">{r.buffer}</td>
                      <td>{r.currency || "—"}</td>
                      <td className="font-mono text-[10px]">{r.walletId ?? "—"}</td>
                      <td>
                        <Badge tone={r.poolAllowNegative ? "warn" : "neutral"}>
                          {r.poolAllowNegative ? "yes" : "no"}
                        </Badge>
                      </td>
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
            <Link href="/corporate-coa" className="text-xs text-emerald-700 hover:underline">
              Edit →
            </Link>
          }
        >
          {selected ? <JsonBlock value={selected} maxHeight={400} /> : <Empty>Click a row</Empty>}
        </Card>
      </div>
    </PageShell>
  );
}
