"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, Empty, Alert } from "@/components/ui/kit";
import { ActionBar } from "@/components/ui/action";
import { PageShell } from "@/components/layout/page-shell";
import { engine } from "@/lib/engine";
import { errMsg } from "@/lib/format";
import { COA_PRESETS } from "@/lib/recipes";

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

const emptyForm = {
  name: "",
  transactionCode: "",
  entity: "10",
  type: "20",
  subType: "00",
  buffer: "00",
  currency: "LP",
  poolAllowNegative: true,
};

function formFromRow(r: CoaRow) {
  return {
    name: r.name || "",
    transactionCode: r.transactionCode || "",
    entity: r.entity || "10",
    type: r.type || "20",
    subType: r.subType || "00",
    buffer: r.buffer || "00",
    currency: r.currency || (r as { lpCurrency?: string }).lpCurrency || "LP",
    poolAllowNegative: r.poolAllowNegative !== false,
  };
}

export default function CoaPage() {
  const [rows, setRows] = useState<CoaRow[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [newCode, setNewCode] = useState("CUSTOMER_CUST_LP");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await engine.coaProfiles();
      const list = (Array.isArray(r.data) ? (r.data as CoaRow[]) : []).filter(
        (x) => (x.code || "").toUpperCase() !== "DEFAULT",
      );
      setRows(list);
      const pick =
        (selectedId && list.find((x) => x.id === selectedId)) ||
        list[0];
      if (pick?.id) {
        setSelectedId(pick.id);
        setForm(formFromRow(pick));
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
    setForm(formFromRow(r));
    setNewCode(r.code || "CUSTOMER_CUST_LP");
  };

  const save = async () => {
    if (!selectedId) return;
    setLoading(true);
    setError(null);
    setOk(null);
    try {
      const body = {
        ...form,
        transactionCode: form.transactionCode.trim() || undefined,
      };
      await engine.coaProfileUpdate(selectedId, body);
      setOk("Saved to DB");
      await load();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  const createWithCode = async (code: string, preset?: (typeof COA_PRESETS)[number]) => {
    setLoading(true);
    setError(null);
    setOk(null);
    try {
      const c = code.trim().toUpperCase();
      const body = preset
        ? {
            code: c,
            name: preset.name,
            entity: preset.entity,
            type: preset.type,
            subType: preset.subType,
            buffer: preset.buffer,
            currency: preset.currency,
            isDefault: false,
            poolAllowNegative: true,
          }
        : {
            code: c,
            isDefault: false,
            ...form,
            name: form.name || c,
          };
      const r = await engine.coaProfileCreate(body);
      const created = r.data as CoaRow;
      setOk(`Created ${created.code} (transactionCode defaults = code)`);
      setSelectedId(created.id ?? null);
      setNewCode(c);
      await load();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  const selected = rows.find((r) => r.id === selectedId);
  const effectiveTxn =
    form.transactionCode.trim() || selected?.code || newCode || "(same as code)";

  return (
    <PageShell
      flow="ledger"
      title="Customer COA"
      description="Chart of accounts only (entity / type / subType / currency). Posting sequences bind eventType on Accounting rules."
      api={[
        { method: "GET", path: "/coa-profiles" },
        { method: "POST", path: "/coa-profiles" },
        { method: "PUT", path: "/coa-profiles/{id}" },
      ]}
    >
      <Alert tone="info">
        COA is the <strong>chart</strong>, not the event. Webhook <code className="text-xs">eventType</code> is
        shared by Door, Brain, and{" "}
        <Link href="/accounting-rules" className="underline">
          Accounting rules
        </Link>
        .{" "}
        <Link href="/records" className="underline">
          DB records
        </Link>
      </Alert>

      <Card title="Quick create (UA presets)" className="mt-4">
        <div className="flex flex-wrap gap-2">
          {COA_PRESETS.map((p) => (
            <button
              key={p.code}
              type="button"
              className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 font-mono text-[11px] font-semibold text-emerald-900 hover:bg-emerald-100"
              disabled={loading || rows.some((r) => r.code === p.code)}
              onClick={() => void createWithCode(p.code, p)}
              title={rows.some((r) => r.code === p.code) ? "Already exists" : p.name}
            >
              + {p.code}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-slate-500">
          Chart codes (e.g. CUSTOMER_CUST_LP). Disabled if already present.
        </p>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <Card title={`Profiles (${rows.length})`} className="lg:col-span-2">
          {rows.length === 0 ? (
            <Empty>Empty — use preset or clone</Empty>
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
                    <span className="mt-0.5 block font-mono text-[10px] text-emerald-700">
                      txn: {r.transactionCode || r.code || "—"} · {r.currency || "LP"}
                    </span>
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
              className="field-input max-w-[140px] font-mono text-xs"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              placeholder="CUSTOMER_CUST_LP"
            />
            <button
              type="button"
              className="btn-secondary text-xs"
              onClick={() => void createWithCode(newCode)}
              disabled={loading}
            >
              Create / clone
            </button>
            <button type="button" className="btn-secondary text-xs" onClick={() => void load()} disabled={loading}>
              Reload
            </button>
          </div>
        </Card>

        <Card
          title={selected ? `Edit · ${selected.code}` : "Edit"}
          className="lg:col-span-3"
          description={`Effective eventType map → ${effectiveTxn}`}
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
                  ["transactionCode", "transactionCode (blank = same as code)"],
                  ["entity", "entity"],
                  ["type", "type"],
                  ["subType", "subType"],
                  ["buffer", "buffer"],
                  ["currency", "currency (points book)"],
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
                poolAllowNegative (HOUSE)
              </label>
              <div className="sm:col-span-2">
                <ActionBar loading={loading} error={error} ok={ok}>
                  <button type="button" className="btn-primary" onClick={() => void save()} disabled={loading}>
                    Save to DB
                  </button>
                </ActionBar>
              </div>
            </div>
          )}
        </Card>
      </div>
    </PageShell>
  );
}
