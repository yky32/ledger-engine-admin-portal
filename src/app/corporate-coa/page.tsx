"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader, Card, Badge, Empty, Alert, JsonBlock } from "@/components/ui/kit";
import { ActionBar } from "@/components/ui/action";
import { FieldLabel } from "@/components/ui/help";
import { EngineStatusBanner } from "@/components/layout/engine-status-banner";
import { FlowStrip } from "@/components/layout/flow-strip";
import { engine } from "@/lib/engine";
import { errMsg, money } from "@/lib/format";
import { HOUSE_COA_PRESETS, isHouseCoaCode } from "@/lib/recipes";
import type { WalletAccount } from "@/lib/types";

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

type HouseBooks = {
  walletId?: number | string | null;
  ownerId?: string;
  profiles?: CoaRow[];
  accounts?: WalletAccount[];
};

const emptyForm = {
  code: "HOUSE_CC_OP_HKD",
  name: "CC Operating Corporate HKD",
  entity: "01",
  type: "02",
  subType: "02",
  buffer: "00",
  currency: "HKD",
  poolAllowNegative: true,
};

function formFromRow(r: CoaRow) {
  return {
    code: r.code || "HOUSE_CC_OP_HKD",
    name: r.name || "",
    entity: r.entity || "01",
    type: r.type || "02",
    subType: r.subType || "02",
    buffer: r.buffer || "00",
    currency: r.currency || "LP",
    poolAllowNegative: r.poolAllowNegative !== false,
  };
}

export default function CorporateCoaPage() {
  const [rows, setRows] = useState<CoaRow[]>([]);
  const [selectedId, setSelectedId] = useState<number | string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [house, setHouse] = useState<HouseBooks | null>(null);

  const applyHouse = (data: HouseBooks | null, fallbackProfiles?: CoaRow[]) => {
    const profiles =
      data?.profiles?.length ? data.profiles : (fallbackProfiles ?? []).filter((x) => isHouseCoaCode(x.code));
    setRows(profiles);
    setHouse(data);
    const pick =
      (selectedId != null && profiles.find((x) => String(x.id) === String(selectedId))) || profiles[0];
    if (pick?.id != null) {
      setSelectedId(pick.id);
      setForm(formFromRow(pick));
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      try {
        const h = await engine.houseEnsure("PROGRAM");
        applyHouse((h.data as HouseBooks) ?? null);
        const data = h.data as HouseBooks;
        if (data?.walletId) {
          setOk(`Company wallet ready · walletId ${data.walletId}`);
        }
      } catch {
        const r = await engine.coaProfiles();
        const list = (Array.isArray(r.data) ? (r.data as CoaRow[]) : []).filter((x) =>
          isHouseCoaCode(x.code),
        );
        applyHouse(null, list);
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
    if (r.id == null) return;
    setSelectedId(r.id);
    setOk(null);
    setForm(formFromRow(r));
  };

  const createPreset = async (preset: (typeof HOUSE_COA_PRESETS)[number]) => {
    setLoading(true);
    setError(null);
    setOk(null);
    try {
      const r = await engine.coaProfileCreate({
        code: preset.code,
        name: preset.name,
        entity: preset.entity,
        type: preset.type,
        subType: preset.subType,
        buffer: preset.buffer,
        currency: preset.currency,
        isDefault: false,
        poolAllowNegative: preset.poolAllowNegative,
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

  const createCustom = async () => {
    const c = form.code.trim().toUpperCase();
    if (!c) {
      setError("code required");
      return;
    }
    setLoading(true);
    setError(null);
    setOk(null);
    try {
      const r = await engine.coaProfileCreate({
        code: c,
        name: form.name.trim() || c,
        entity: form.entity,
        type: form.type,
        subType: form.subType,
        buffer: form.buffer,
        currency: form.currency,
        isDefault: false,
        poolAllowNegative: form.poolAllowNegative,
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

  const save = async () => {
    if (selectedId == null) return;
    setLoading(true);
    setError(null);
    setOk(null);
    try {
      await engine.coaProfileUpdate(selectedId, {
        name: form.name,
        entity: form.entity,
        type: form.type,
        subType: form.subType,
        buffer: form.buffer,
        currency: form.currency,
        poolAllowNegative: form.poolAllowNegative,
      });
      setOk("Saved to DB");
      await load();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  const assignWallet = async () => {
    setLoading(true);
    setError(null);
    setOk(null);
    try {
      const r = await engine.houseEnsure("PROGRAM");
      const data = r.data as HouseBooks;
      applyHouse(data);
      setOk(`Company wallet ready · walletId ${data.walletId} · ${data.accounts?.length ?? 0} account(s)`);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  const selected = rows.find((r) => String(r.id) === String(selectedId));
  const books = house?.accounts ?? [];
  const walletId = house?.walletId ?? selected?.walletId ?? null;

  return (
    <div>
      <FlowStrip active="ops" />
      <EngineStatusBanner />
      <PageHeader
        title="0 · House — Corporate COA"
        description="createIfNotFound one company wallet per client (UAF = this install). HOUSE_* share that walletId; accounts open under it."
        api={[
          { method: "GET", path: "/coa-profiles" },
          { method: "POST", path: "/coa-profiles" },
          { method: "PUT", path: "/coa-profiles/{id}" },
          { method: "GET", path: "/corporate-coa" },
          { method: "POST", path: "/corporate-coa" },
        ]}
        actions={
          <Link href="/coa" className="btn-secondary text-xs">
            Brain COA (member events) →
          </Link>
        }
      />

      <Alert tone="info">
        House profiles are chart codes (<code className="text-xs">HOUSE_*</code>), not webhook{" "}
        <code className="text-xs">eventType</code>. Bind <code className="text-xs">CC_TXN</code> on{" "}
        <Link href="/accounting-rules" className="underline">
          Accounting rules
        </Link>
        . Do not mark house default.
      </Alert>

      <Card className="mt-4" title="Quick create (house values)">
        <div className="flex flex-wrap gap-2">
          {HOUSE_COA_PRESETS.map((p) => (
            <button
              key={p.code}
              type="button"
              className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-left hover:bg-emerald-100 disabled:opacity-50"
              disabled={loading || rows.some((r) => r.code === p.code)}
              onClick={() => void createPreset(p)}
              title={p.name}
            >
              <span className="block font-mono text-[11px] font-semibold text-emerald-900">+ {p.code}</span>
              <span className="block font-mono text-[10px] text-emerald-800/80">
                {p.entity}-{p.type}-{p.subType}-{p.buffer} · {p.currency}
              </span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-slate-500">
          UA sheet: entity <span className="font-mono">01 CC</span> · type{" "}
          <span className="font-mono">02 Operating</span> / <span className="font-mono">04 Expense</span> · subType{" "}
          <span className="font-mono">02 Corporate</span> · main <span className="font-mono">9999</span>. Member
          custodian <span className="font-mono">01-01-01</span> stays on Brain COA.
        </p>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <Card title={`House profiles (${rows.length})`} className="lg:col-span-2">
          {rows.length === 0 ? (
            <Empty>No HOUSE_* yet — create a preset above before first earn.</Empty>
          ) : (
            <ul className="space-y-1">
              {rows.map((r) => (
                <li key={String(r.id ?? r.code)}>
                  <button
                    type="button"
                    onClick={() => select(r)}
                    className={
                      String(selectedId) === String(r.id)
                        ? "w-full rounded-lg border border-emerald-400 bg-emerald-50 px-3 py-2 text-left text-xs"
                        : "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs hover:bg-slate-50"
                    }
                  >
                    <span className="font-mono font-semibold">{r.code}</span>
                    <span className="mt-0.5 block font-mono text-[10px] text-emerald-700">
                      {r.currency} · {r.entity}-{r.type}-{r.subType}-{r.buffer}
                    </span>
                    {r.walletId != null ? (
                      <span className="mt-0.5 block font-mono text-[10px] text-slate-500">
                        walletId {r.walletId}
                      </span>
                    ) : null}
                    <span className="mt-0.5 block text-[10px] text-slate-500">{r.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title={selected ? `Edit · ${selected.code}` : "New house book"}
          className="lg:col-span-3"
          description="Same four segments as Brain COA — company numbers."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="field sm:col-span-2">
              <span className="field-label">code</span>
              <input
                className="field-input font-mono"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="HOUSE_CC_OP_HKD"
                disabled={selectedId != null}
              />
            </label>
            <label className="field sm:col-span-2">
              <span className="field-label">name</span>
              <input
                className="field-input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label className="field">
              <FieldLabel
                tipTitle="entity"
                tip="UA entity: 01 = CC, 02 = Loan. Corporate operating/expense use 01 CC."
              >
                entity
              </FieldLabel>
              <input
                className="field-input font-mono"
                value={form.entity}
                onChange={(e) => setForm({ ...form, entity: e.target.value })}
              />
            </label>
            <label className="field">
              <FieldLabel
                tipTitle="type"
                tip="UA account type: 01 Custodian (member), 02 Operating (house), 04 Expense (house)."
              >
                type
              </FieldLabel>
              <input
                className="field-input font-mono"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              />
            </label>
            <label className="field">
              <span className="field-label">subType</span>
              <input
                className="field-input font-mono"
                value={form.subType}
                onChange={(e) => setForm({ ...form, subType: e.target.value })}
              />
            </label>
            <label className="field">
              <span className="field-label">buffer</span>
              <input
                className="field-input font-mono"
                value={form.buffer}
                onChange={(e) => setForm({ ...form, buffer: e.target.value })}
              />
            </label>
            <label className="field">
              <span className="field-label">currency</span>
              <input
                className="field-input font-mono"
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.poolAllowNegative}
                onChange={(e) => setForm({ ...form, poolAllowNegative: e.target.checked })}
              />
              poolAllowNegative (PROGRAM may go negative)
            </label>
            <div className="sm:col-span-2">
              <ActionBar loading={loading} error={error} ok={ok}>
                {selectedId != null ? (
                  <button type="button" className="btn-primary" onClick={() => void save()} disabled={loading}>
                    Save
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => void createCustom()}
                    disabled={loading}
                  >
                    Create
                  </button>
                )}
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setSelectedId(null);
                    setForm(emptyForm);
                    setOk(null);
                  }}
                >
                  New
                </button>
                <button type="button" className="btn-secondary" onClick={() => void load()} disabled={loading}>
                  Reload
                </button>
              </ActionBar>
            </div>
          </div>
        </Card>
      </div>

      <Card
        className="mt-4"
        title="Company wallet + accounts"
        description="POST /corporate-coa — createIfNotFound ownerId=PROGRAM. Same walletId on every HOUSE_* book."
      >
        {walletId != null ? (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge tone="ok">wallet assigned</Badge>
            <span className="font-mono text-xs text-slate-700">walletId {walletId}</span>
            <span className="text-xs text-slate-500">ownerId {house?.ownerId || "PROGRAM"}</span>
            <Link
              href={`/wallets-list?ownerId=${encodeURIComponent(house?.ownerId || "PROGRAM")}`}
              className="text-xs text-emerald-700 hover:underline"
            >
              Incoming history →
            </Link>
          </div>
        ) : (
          <p className="mb-3 text-sm text-slate-600">
            This page createIfNotFound the singleton company wallet (ownerId PROGRAM — UAF in this install).
            Restart ledger-engine if ensure 404s, then Reload.
          </p>
        )}
        {books.length > 0 ? (
          <div className="table-wrap mb-3">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ccy</th>
                  <th>fullNumber</th>
                  <th>walletId</th>
                  <th>ledger</th>
                  <th>available</th>
                </tr>
              </thead>
              <tbody>
                {books.map((a, i) => (
                  <tr key={a.id ?? i}>
                    <td className="font-medium">{a.currency}</td>
                    <td className="font-mono text-[10px]">{a.fullNumber || "—"}</td>
                    <td className="font-mono text-[10px]">{a.walletId ?? walletId ?? "—"}</td>
                    <td className="font-mono text-xs">{money(a.ledgerBalance)}</td>
                    <td className="font-mono text-xs">{money(a.availableBalance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        <ActionBar loading={loading} error={error} ok={ok}>
          <button
            type="button"
            className="btn-primary"
            onClick={() => void assignWallet()}
            disabled={loading}
          >
            Ensure company wallet
          </button>
          <button type="button" className="btn-secondary" onClick={() => void load()} disabled={loading}>
            Reload
          </button>
        </ActionBar>
        {house ? (
          <div className="mt-3">
            <JsonBlock value={house} maxHeight={180} />
          </div>
        ) : null}
      </Card>
    </div>
  );
}
