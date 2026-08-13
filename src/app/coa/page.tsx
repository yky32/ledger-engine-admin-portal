"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader, Card, Badge, JsonBlock, Empty, Alert } from "@/components/ui/kit";
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
  bindings?: Record<string, unknown>;
};

/**
 * Simple COA: one table, bindings JSON for MEMBER_SETTLEMENT / MEMBER_LP / PROGRAM_POOL.
 */
export default function CoaPage() {
  const [rows, setRows] = useState<CoaRow[]>([]);
  const [selected, setSelected] = useState<CoaRow | null>(null);
  const [bindingsText, setBindingsText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [newCode, setNewCode] = useState("BANK_A");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await engine.coaProfileDefault(); // ensure DEFAULT seeded
      const r = await engine.coaProfiles();
      const list = Array.isArray(r.data) ? (r.data as CoaRow[]) : [];
      setRows(list);
      if (!selected && list[0]) {
        setSelected(list[0]);
        setBindingsText(JSON.stringify(list[0].bindings ?? {}, null, 2));
      } else if (selected?.id) {
        const fresh = list.find((x) => x.id === selected.id) || list[0];
        if (fresh) {
          setSelected(fresh);
          setBindingsText(JSON.stringify(fresh.bindings ?? {}, null, 2));
        }
      }
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [selected?.id]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    if (!selected?.id) return;
    setLoading(true);
    setError(null);
    setOk(null);
    try {
      const bindings = JSON.parse(bindingsText) as Record<string, unknown>;
      const r = await engine.coaProfileUpdate(selected.id, { bindings, name: selected.name });
      setOk("Saved to DB");
      setSelected(r.data as CoaRow);
      setBindingsText(JSON.stringify((r.data as CoaRow).bindings ?? {}, null, 2));
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
      const base = selected?.bindings ?? (await engine.coaProfileDefault()).data;
      const bindings =
        selected?.bindings ??
        ((base as CoaRow).bindings as Record<string, unknown>);
      const r = await engine.coaProfileCreate({
        code: newCode.trim().toUpperCase(),
        name: newCode.trim(),
        isDefault: false,
        bindings,
      });
      setOk(`Created ${(r.data as CoaRow).code}`);
      setSelected(r.data as CoaRow);
      setBindingsText(JSON.stringify((r.data as CoaRow).bindings ?? {}, null, 2));
      await load();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <FlowStrip active="ops" />
      <EngineStatusBanner />
      <PageHeader
        title="COA profiles"
        description="One table · bindings JSON · roles MEMBER_SETTLEMENT / MEMBER_LP / PROGRAM_POOL. Docs: COA_PROFILE.md"
      />
      <Alert tone="info">
        Onboard uses <strong>default</strong> profile segments for fullNumber. Clone DEFAULT → change entity/type
        codes for a bank client. See{" "}
        <Link href="/records" className="underline">
          DB records
        </Link>
        .
      </Alert>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <Card title={`Profiles (${rows.length})`} className="lg:col-span-2">
          {rows.length === 0 ? (
            <Empty>Loading / empty</Empty>
          ) : (
            <ul className="space-y-1">
              {rows.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    className={
                      selected?.id === r.id
                        ? "w-full rounded-lg border border-emerald-400 bg-emerald-50 px-3 py-2 text-left text-xs"
                        : "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs hover:bg-slate-50"
                    }
                    onClick={() => {
                      setSelected(r);
                      setBindingsText(JSON.stringify(r.bindings ?? {}, null, 2));
                      setOk(null);
                    }}
                  >
                    <span className="font-mono font-semibold">{r.code}</span>
                    {r.isDefault ? (
                      <Badge tone="ok">default</Badge>
                    ) : null}{" "}
                    <span className="text-slate-500">{r.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <input
              className="field-input font-mono max-w-[120px] text-xs"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              placeholder="BANK_A"
            />
            <button type="button" className="btn-secondary text-xs" onClick={clone} disabled={loading}>
              Clone selected / default
            </button>
            <button type="button" className="btn-secondary text-xs" onClick={load} disabled={loading}>
              Reload
            </button>
          </div>
        </Card>

        <Card
          title={selected ? `bindings · ${selected.code}` : "bindings"}
          description="Saved JSON in coa_profile.bindings"
          className="lg:col-span-3"
        >
          {!selected ? (
            <Empty>Select a profile</Empty>
          ) : (
            <>
              <textarea
                className="field-input min-h-[320px] font-mono text-[11px]"
                value={bindingsText}
                onChange={(e) => setBindingsText(e.target.value)}
              />
              <div className="mt-3">
                <ActionBar loading={loading} error={error} ok={ok}>
                  <button type="button" className="btn-primary" onClick={save} disabled={loading}>
                    Save bindings to DB
                  </button>
                </ActionBar>
              </div>
              <details className="mt-3">
                <summary className="cursor-pointer text-xs text-slate-500">Parsed preview</summary>
                <div className="mt-2">
                  <JsonBlock
                    value={(() => {
                      try {
                        return JSON.parse(bindingsText);
                      } catch {
                        return { error: "invalid JSON" };
                      }
                    })()}
                    maxHeight={200}
                  />
                </div>
              </details>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
