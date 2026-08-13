"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader, Card, Badge, Empty, Alert } from "@/components/ui/kit";
import { ActionBar } from "@/components/ui/action";
import { EngineStatusBanner } from "@/components/layout/engine-status-banner";
import { FlowStrip } from "@/components/layout/flow-strip";
import { engine } from "@/lib/engine";
import { errMsg } from "@/lib/format";

type CoaRow = {
  id?: number;
  code?: string;
  name?: string;
  isDefault?: boolean;
  isEnabled?: boolean;
  entity?: string;
  type?: string;
  subType?: string;
  buffer?: string;
  lpCurrency?: string;
  poolAllowNegative?: boolean;
};

const emptyForm = {
  name: "",
  entity: "10",
  type: "20",
  subType: "00",
  buffer: "00",
  lpCurrency: "LP",
  poolAllowNegative: true,
};

/** Flat COA profile — no JSON editor. */
export default function CoaPage() {
  const [rows, setRows] = useState<CoaRow[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [newCode, setNewCode] = useState("BANK_A");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await engine.coaProfileDefault();
      const r = await engine.coaProfiles();
      const list = Array.isArray(r.data) ? (r.data as CoaRow[]) : [];
      setRows(list);
      const pick =
        (selectedId && list.find((x) => x.id === selectedId)) ||
        list.find((x) => x.isDefault) ||
        list[0];
      if (pick?.id) {
        setSelectedId(pick.id);
        setForm({
          name: pick.name || "",
          entity: pick.entity || "10",
          type: pick.type || "20",
          subType: pick.subType || "00",
          buffer: pick.buffer || "00",
          lpCurrency: pick.lpCurrency || "LP",
          poolAllowNegative: pick.poolAllowNegative !== false,
        });
      }
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const select = (r: CoaRow) => {
    if (!r.id) return;
    setSelectedId(r.id);
    setOk(null);
    setForm({
      name: r.name || "",
      entity: r.entity || "10",
      type: r.type || "20",
      subType: r.subType || "00",
      buffer: r.buffer || "00",
      lpCurrency: r.lpCurrency || "LP",
      poolAllowNegative: r.poolAllowNegative !== false,
    });
  };

  const save = async () => {
    if (!selectedId) return;
    setLoading(true);
    setError(null);
    setOk(null);
    try {
      await engine.coaProfileUpdate(selectedId, { ...form });
      setOk("Saved to DB");
      await load();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  const clone = async () => {
    setLoading(true);
    setError(null);
    setOk(null);
    try {
      const r = await engine.coaProfileCreate({
        code: newCode.trim().toUpperCase(),
        isDefault: false,
        ...form,
        name: newCode.trim() || form.name || "Clone",
      });
      const created = r.data as CoaRow;
      setOk(`Created ${created.code}`);
      setSelectedId(created.id ?? null);
      await load();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  const selected = rows.find((r) => r.id === selectedId);

  return (
    <div>
      <FlowStrip active="ops" />
      <EngineStatusBanner />
      <PageHeader
        title="COA profiles"
        description="Flat table — entity / type / subType / buffer. No JSON. Onboard uses default profile."
      />
      <Alert tone="info">
        One row per client. Same segments for settlement + LP books.{" "}
        <Link href="/records" className="underline">
          DB records
        </Link>
      </Alert>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <Card title={`Profiles (${rows.length})`} className="lg:col-span-2">
          {rows.length === 0 ? (
            <Empty>Empty</Empty>
          ) : (
            <ul className="space-y-1">
              {rows.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => select(r)}
                    className={
                      selectedId === r.id
                        ? "w-full rounded-lg border border-emerald-400 bg-emerald-50 px-3 py-2 text-left text-xs"
                        : "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs hover:bg-slate-50"
                    }
                  >
                    <span className="font-mono font-semibold">{r.code}</span>{" "}
                    {r.isDefault ? <Badge tone="ok">default</Badge> : null}
                    <span className="mt-0.5 block font-mono text-[10px] text-slate-500">
                      {r.entity}-{r.type}-{r.subType}-{r.buffer}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <input
              className="field-input max-w-[120px] font-mono text-xs"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
            />
            <button type="button" className="btn-secondary text-xs" onClick={clone} disabled={loading}>
              Clone as new
            </button>
            <button type="button" className="btn-secondary text-xs" onClick={load} disabled={loading}>
              Reload
            </button>
          </div>
        </Card>

        <Card
          title={selected ? `Edit · ${selected.code}` : "Edit"}
          className="lg:col-span-3"
          description="Digits only for entity/type/subType/buffer"
        >
          {!selectedId ? (
            <Empty>Select profile</Empty>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="field sm:col-span-2">
                <span className="field-label">name</span>
                <input
                  className="field-input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </label>
              {(
                [
                  ["entity", "entity"],
                  ["type", "type"],
                  ["subType", "subType"],
                  ["buffer", "buffer"],
                  ["lpCurrency", "lpCurrency"],
                ] as const
              ).map(([k, label]) => (
                <label key={k} className="field">
                  <span className="field-label">{label}</span>
                  <input
                    className="field-input font-mono"
                    value={form[k]}
                    onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                  />
                </label>
              ))}
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input
                  type="checkbox"
                  checked={form.poolAllowNegative}
                  onChange={(e) => setForm({ ...form, poolAllowNegative: e.target.checked })}
                />
                poolAllowNegative (PROGRAM)
              </label>
              <div className="sm:col-span-2">
                <ActionBar loading={loading} error={error} ok={ok}>
                  <button type="button" className="btn-primary" onClick={save} disabled={loading}>
                    Save to DB
                  </button>
                </ActionBar>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
