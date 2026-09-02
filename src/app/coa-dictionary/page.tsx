"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, Badge, Empty, Alert } from "@/components/ui/kit";
import { ActionBar } from "@/components/ui/action";
import { PageShell } from "@/components/layout/page-shell";
import { FilterBar } from "@/components/ui/filter-bar";
import { engine } from "@/lib/engine";
import { errMsg, clsx } from "@/lib/format";
import type { CoaDictionaryRow } from "@/lib/types";
import { Trash2 } from "lucide-react";

const KIND_ORDER = ["STEM", "PATH", "ENTITY", "TYPE", "SUB_TYPE", "BUFFER"] as const;

const KIND_LABEL: Record<string, string> = {
  STEM: "Stem — entity-type (01-02)",
  PATH: "Path — entity-type-subType (01-02-01)",
  ENTITY: "Entity (2 digits)",
  TYPE: "Account type (2 digits)",
  SUB_TYPE: "Sub-type (2 digits)",
  BUFFER: "Buffer (2 digits)",
};

const SIDES = ["BOTH", "HOUSE", "CUSTOMER"] as const;

function asList(data: unknown): CoaDictionaryRow[] {
  return Array.isArray(data) ? (data as CoaDictionaryRow[]) : data ? [data as CoaDictionaryRow] : [];
}

export default function CoaDictionaryPage() {
  const [rows, setRows] = useState<CoaDictionaryRow[]>([]);
  const [q, setQ] = useState("");
  const [kindFilter, setKindFilter] = useState("");
  const [selected, setSelected] = useState<CoaDictionaryRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [formKind, setFormKind] = useState("STEM");
  const [formCode, setFormCode] = useState("01-02");
  const [formName, setFormName] = useState("");
  const [formDef, setFormDef] = useState("");
  const [formExample, setFormExample] = useState("");
  const [formSide, setFormSide] = useState("HOUSE");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await engine.coaDictionary();
      const list = asList(r.data);
      setRows(list);
      setSelected((cur) => {
        if (!cur?.id) return cur;
        return list.find((x) => String(x.id) === String(cur.id)) ?? cur;
      });
    } catch (e) {
      setRows([]);
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const kind = kindFilter.trim().toUpperCase();
    return rows.filter((r) => {
      if (kind && String(r.kind || "").toUpperCase() !== kind) return false;
      if (!needle) return true;
      const blob = [r.code, r.name, r.definition, r.kind, r.side, r.example]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return blob.includes(needle);
    });
  }, [rows, q, kindFilter]);

  const groups = useMemo(() => {
    const map = new Map<string, CoaDictionaryRow[]>();
    for (const r of filtered) {
      const k = String(r.kind || "STEM").toUpperCase();
      const list = map.get(k) ?? [];
      list.push(r);
      map.set(k, list);
    }
    const keys = [...map.keys()].sort((a, b) => {
      const ra = KIND_ORDER.indexOf(a as (typeof KIND_ORDER)[number]);
      const rb = KIND_ORDER.indexOf(b as (typeof KIND_ORDER)[number]);
      return (ra < 0 ? 99 : ra) - (rb < 0 ? 99 : rb) || a.localeCompare(b);
    });
    return keys.map((kind) => ({
      kind,
      rows: (map.get(kind) ?? []).slice().sort((a, b) => String(a.code).localeCompare(String(b.code))),
    }));
  }, [filtered]);

  const pick = (r: CoaDictionaryRow) => {
    setSelected(r);
    setFormKind(String(r.kind || "STEM").toUpperCase());
    setFormCode(r.code || "");
    setFormName(r.name || "");
    setFormDef(r.definition || "");
    setFormExample(r.example || "");
    setFormSide(String(r.side || "BOTH").toUpperCase());
    setOk(null);
  };

  const save = async () => {
    if (!selected?.id) return;
    setLoading(true);
    setError(null);
    setOk(null);
    try {
      const r = await engine.coaDictionaryUpdate(selected.id, {
        kind: formKind,
        code: formCode,
        name: formName,
        definition: formDef,
        example: formExample,
        side: formSide,
      });
      setOk(`Saved ${formKind} ${formCode}`);
      setSelected(r.data);
      await load();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  const create = async () => {
    setLoading(true);
    setError(null);
    setOk(null);
    try {
      const r = await engine.coaDictionaryCreate({
        kind: formKind,
        code: formCode,
        name: formName,
        definition: formDef,
        example: formExample,
        side: formSide,
      });
      setOk(`Created ${formKind} ${formCode}`);
      setSelected(r.data);
      await load();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  const remove = async (r: CoaDictionaryRow) => {
    if (r.id == null) return;
    if (!window.confirm(`Delete dictionary ${r.kind} ${r.code}?`)) return;
    setLoading(true);
    setError(null);
    setOk(null);
    try {
      await engine.coaDictionaryDelete(r.id);
      if (selected?.id != null && String(selected.id) === String(r.id)) setSelected(null);
      setOk(`Deleted ${r.code}`);
      await load();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  const seed = async () => {
    setLoading(true);
    setError(null);
    setOk(null);
    try {
      const r = await engine.coaDictionaryEnsure();
      setRows(asList(r.data));
      setOk("UA dictionary seeded (existing definitions kept)");
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell
      flow="books"
      title="COA dictionary"
      description="Stored meanings of chart digits and stems. 01-02 = house operating. Profiles are the live books; this is the definition list."
      api={[
        { method: "GET", path: "/coa-dictionary" },
        { method: "POST", path: "/coa-dictionary" },
        { method: "PUT", path: "/coa-dictionary/{id}" },
        { method: "DELETE", path: "/coa-dictionary/{id}" },
        { method: "POST", path: "/coa-dictionary/ensure" },
      ]}
      actions={
        <button type="button" className="btn-secondary text-xs" onClick={() => void seed()} disabled={loading}>
          Seed UA dictionary
        </button>
      }
      ok={ok}
      error={error}
    >
      <FilterBar loading={loading} onSubmit={() => void load()} submitLabel="Reload">
        <label className="field min-w-[180px]">
          <span className="field-label">lookup</span>
          <input
            className="field-input font-mono"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="01-02"
          />
        </label>
        <label className="field min-w-[160px]">
          <span className="field-label">kind</span>
          <select
            className="field-select"
            value={kindFilter}
            onChange={(e) => setKindFilter(e.target.value)}
          >
            <option value="">ALL</option>
            {KIND_ORDER.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </label>
      </FilterBar>

      <Alert tone="info">
        <strong>01-02</strong> is a stem (entity 01 credit card + type 02 operating) — house operating books
        <span className="font-mono"> 01-02-01-9999</span>. Customer custodian is <span className="font-mono">01-01</span>.
        Edit the definition on the right; it is saved in PG.
      </Alert>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          {groups.length === 0 ? (
            <Empty>{loading ? "Loading…" : "No dictionary rows — Seed UA dictionary."}</Empty>
          ) : (
            groups.map((g) => (
              <Card key={g.kind} title={KIND_LABEL[g.kind] || g.kind} description={`${g.rows.length} definition(s)`}>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>code</th>
                        <th>name</th>
                        <th>side</th>
                        <th>definition</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.rows.map((r) => (
                        <tr
                          key={String(r.id ?? r.code)}
                          className={clsx(
                            "cursor-pointer",
                            selected?.id != null && String(selected.id) === String(r.id)
                              ? "bg-emerald-50"
                              : undefined,
                          )}
                          onClick={() => pick(r)}
                        >
                          <td className="whitespace-nowrap font-mono text-xs font-semibold">{r.code}</td>
                          <td className="text-xs">{r.name || "—"}</td>
                          <td>
                            <Badge
                              tone={
                                r.side === "HOUSE" ? "info" : r.side === "CUSTOMER" ? "ok" : "neutral"
                              }
                            >
                              {r.side || "—"}
                            </Badge>
                          </td>
                          <td className="max-w-[280px] truncate text-[11px] text-slate-600">
                            {r.definition || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            ))
          )}
        </div>

        <Card
          className="lg:col-span-2"
          title={selected?.id ? `Edit · ${selected.kind} ${selected.code}` : "New definition"}
          description="PUT updates the stored explanation. POST creates a new kind+code."
        >
          <div className="space-y-3">
            <label className="field">
              <span className="field-label">kind</span>
              <select
                className="field-select"
                value={formKind}
                onChange={(e) => setFormKind(e.target.value)}
              >
                {KIND_ORDER.map((k) => (
                  <option key={k} value={k}>
                    {KIND_LABEL[k] || k}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">code</span>
              <input
                className="field-input font-mono"
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
                placeholder="01-02"
              />
            </label>
            <label className="field">
              <span className="field-label">name</span>
              <input
                className="field-input"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="House operating"
              />
            </label>
            <label className="field">
              <span className="field-label">side</span>
              <select
                className="field-select"
                value={formSide}
                onChange={(e) => setFormSide(e.target.value)}
              >
                {SIDES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">example</span>
              <input
                className="field-input font-mono text-xs"
                value={formExample}
                onChange={(e) => setFormExample(e.target.value)}
                placeholder="01-02-01-9999-00-HKD"
              />
            </label>
            <label className="field">
              <span className="field-label">definition</span>
              <textarea
                className="field-input min-h-[140px] text-sm"
                value={formDef}
                onChange={(e) => setFormDef(e.target.value)}
                placeholder="What this chart code means for UAF finance / customer books."
              />
            </label>
            <ActionBar loading={loading}>
              {selected?.id ? (
                <button type="button" className="btn-primary" onClick={() => void save()}>
                  Save definition
                </button>
              ) : null}
              <button type="button" className="btn-secondary" onClick={() => void create()}>
                Create
              </button>
              {selected?.id ? (
                <button
                  type="button"
                  className="btn-ghost text-rose-700"
                  onClick={() => void remove(selected)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              ) : null}
            </ActionBar>
          </div>
        </Card>
      </div>
    </PageShell>
  );
}
