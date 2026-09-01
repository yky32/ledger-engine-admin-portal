"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Plus, Search, Trash2, Pencil } from "lucide-react";
import { ApiError, ledger } from "@/lib/api";
import { asArray, asRecord } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { JsonBlock } from "@/components/ui/json-block";
import { Alert } from "@/components/ui/alert";

export type CrudField = {
  name: string;
  label: string;
  type?: "text" | "number" | "textarea";
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
};

type Props = {
  title: string;
  description: string;
  /** GET path for list (may include query placeholders filled by listParams) */
  listPath: string;
  /** optional fixed query keys shown as filters */
  listFilters?: { name: string; label: string; defaultValue?: string; required?: boolean }[];
  createPath?: string;
  createMethod?: "POST" | "PUT" | "PATCH";
  createFields?: CrudField[];
  /** static JSON body template merged with form fields */
  createDefaults?: Record<string, unknown>;
  /** get detail by id path e.g. /accounting-rules/{id} */
  detailPathTemplate?: string;
  updatePathTemplate?: string;
  updateMethod?: "PUT" | "PATCH" | "POST";
  updateFields?: CrudField[];
  deletePathTemplate?: string;
  /** map row → id string */
  getRowId?: (row: Record<string, unknown>) => string;
  columns?: string[];
  /** custom list path builder from filter values */
  buildListPath?: (filters: Record<string, string>) => string;
  /** when list is not a collection endpoint, use lookup mode */
  mode?: "list" | "lookup";
};

function pickColumns(rows: Record<string, unknown>[], preferred?: string[]): string[] {
  if (preferred?.length) return preferred;
  const keys = new Set<string>();
  for (const r of rows.slice(0, 5)) {
    Object.keys(r).forEach((k) => keys.add(k));
  }
  const all = [...keys];
  const priority = ["id", "walletId", "name", "ownerId", "userId", "currency", "status", "amount", "type"];
  return [
    ...priority.filter((p) => all.includes(p)),
    ...all.filter((k) => !priority.includes(k)).slice(0, 8),
  ].slice(0, 10);
}

function cell(v: unknown): string {
  if (v == null) return "—";
  if (typeof v === "object") return JSON.stringify(v).slice(0, 80);
  return String(v);
}

export function ResourceCrud(props: Props) {
  const {
    title,
    description,
    listPath,
    listFilters = [],
    createPath,
    createMethod = "POST",
    createFields = [],
    createDefaults = {},
    detailPathTemplate,
    updatePathTemplate,
    updateMethod = "PUT",
    updateFields = [],
    deletePathTemplate,
    getRowId = (r) => String(r.id ?? r.walletId ?? ""),
    columns,
    buildListPath,
    mode = "list",
  } = props;

  const [filters, setFilters] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    listFilters.forEach((f) => {
      init[f.name] = f.defaultValue ?? "";
    });
    return init;
  });
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [raw, setRaw] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    createFields.forEach((f) => {
      init[f.name] = f.defaultValue ?? "";
    });
    return init;
  });
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const [updateForm, setUpdateForm] = useState<Record<string, string>>({});
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const path =
        buildListPath?.(filters) ??
        (() => {
          if (mode === "lookup" && listFilters.length) {
            // replace simple {param} in path
            let p = listPath;
            for (const [k, v] of Object.entries(filters)) {
              p = p.replace(`{${k}}`, encodeURIComponent(v));
            }
            const qs = new URLSearchParams();
            for (const f of listFilters) {
              if (!listPath.includes(`{${f.name}}`) && filters[f.name]) {
                qs.set(f.name, filters[f.name]);
              }
            }
            const q = qs.toString();
            return q ? `${p}?${q}` : p;
          }
          const qs = new URLSearchParams();
          for (const f of listFilters) {
            if (filters[f.name]) qs.set(f.name, filters[f.name]);
          }
          // default pageable (engine is 1-based page)
          if (!qs.has("page")) qs.set("page", "1");
          if (!qs.has("size")) qs.set("size", "50");
          const q = qs.toString();
          return q ? `${listPath}?${q}` : listPath;
        })();

      const data = await ledger.get(path);
      setRaw(data);
      const arr = asArray<Record<string, unknown>>(data);
      if (arr.length) {
        setRows(arr);
      } else {
        const one = asRecord(data);
        setRows(one ? [one] : []);
      }
    } catch (e) {
      setRows([]);
      setRaw(null);
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [buildListPath, filters, listFilters, listPath, mode]);

  useEffect(() => {
    // auto-load if no required empty filters
    const missing = listFilters.some((f) => f.required && !filters[f.name]);
    if (!missing) {
      void load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function buildBody(fields: CrudField[], form: Record<string, string>, defaults: Record<string, unknown> = {}) {
    const body: Record<string, unknown> = { ...defaults };
    for (const f of fields) {
      const rawVal = form[f.name];
      if (rawVal === "" || rawVal == null) {
        if (f.required) throw new Error(`${f.label} is required`);
        continue;
      }
      if (f.type === "number") {
        body[f.name] = Number(rawVal);
      } else if (rawVal === "true" || rawVal === "false") {
        body[f.name] = rawVal === "true";
      } else if (f.type === "textarea" && (rawVal.trim().startsWith("{") || rawVal.trim().startsWith("["))) {
        body[f.name] = JSON.parse(rawVal);
      } else {
        body[f.name] = rawVal;
      }
    }
    return body;
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!createPath) return;
    setError(null);
    setSuccess(null);
    try {
      const body = buildBody(createFields, createForm, createDefaults);
      const method = createMethod;
      const data =
        method === "PUT"
          ? await ledger.put(createPath, body)
          : method === "PATCH"
            ? await ledger.patch(createPath, body)
            : await ledger.post(createPath, body);
      setSuccess("Created successfully");
      setShowCreate(false);
      setRaw(data);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function onUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !updatePathTemplate) return;
    setError(null);
    setSuccess(null);
    try {
      const id = getRowId(selected);
      const path = updatePathTemplate.replace("{id}", encodeURIComponent(id));
      const body = buildBody(updateFields.length ? updateFields : createFields, updateForm);
      const data =
        updateMethod === "PATCH"
          ? await ledger.patch(path, body)
          : updateMethod === "POST"
            ? await ledger.post(path, body)
            : await ledger.put(path, body);
      setSuccess("Updated successfully");
      setRaw(data);
      setSelected(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function onDelete(row: Record<string, unknown>) {
    if (!deletePathTemplate) return;
    if (!confirm("Delete this record?")) return;
    setError(null);
    try {
      const id = getRowId(row);
      const path = deletePathTemplate.replace("{id}", encodeURIComponent(id));
      await ledger.delete(path);
      setSuccess("Deleted");
      setSelected(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  const cols = pickColumns(rows, columns);

  return (
    <div>
      <PageHeader
        title={title}
        description={description}
        api={[
          { method: "GET", path: listPath },
          ...(createPath ? [{ method: createMethod, path: createPath }] : []),
          ...(updatePathTemplate
            ? [{ method: updateMethod, path: updatePathTemplate }]
            : []),
        ]}
        actions={
          <>
            <Button variant="secondary" onClick={() => void load()} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            {createPath ? (
              <Button onClick={() => setShowCreate((v) => !v)}>
                <Plus className="h-3.5 w-3.5" />
                Create
              </Button>
            ) : null}
          </>
        }
      />

      {error ? (
        <div className="mb-4">
          <Alert variant="error">{error}</Alert>
        </div>
      ) : null}
      {success ? (
        <div className="mb-4">
          <Alert variant="success">{success}</Alert>
        </div>
      ) : null}

      {listFilters.length > 0 ? (
        <Card className="mb-4">
          <CardBody className="flex flex-wrap items-end gap-3">
            {listFilters.map((f) => (
              <div key={f.name} className="min-w-[160px]">
                <Field label={f.label + (f.required ? " *" : "")}>
                  <Input
                    value={filters[f.name] ?? ""}
                    onChange={(e) => setFilters((s) => ({ ...s, [f.name]: e.target.value }))}
                    placeholder={f.defaultValue}
                  />
                </Field>
              </div>
            ))}
            <Button onClick={() => void load()} disabled={loading}>
              <Search className="h-3.5 w-3.5" />
              Load
            </Button>
          </CardBody>
        </Card>
      ) : null}

      {showCreate && createPath ? (
        <Card className="mb-4">
          <CardHeader title="Create" description={createPath} />
          <CardBody>
            <form onSubmit={onCreate} className="grid gap-3 sm:grid-cols-2">
              {createFields.map((f) => (
                <div key={f.name} className={f.type === "textarea" ? "sm:col-span-2" : ""}>
                  <Field label={f.label + (f.required ? " *" : "")}>
                    {f.type === "textarea" ? (
                      <Textarea
                        rows={4}
                        value={createForm[f.name] ?? ""}
                        onChange={(e) => setCreateForm((s) => ({ ...s, [f.name]: e.target.value }))}
                        placeholder={f.placeholder}
                      />
                    ) : (
                      <Input
                        type={f.type === "number" ? "number" : "text"}
                        value={createForm[f.name] ?? ""}
                        onChange={(e) => setCreateForm((s) => ({ ...s, [f.name]: e.target.value }))}
                        placeholder={f.placeholder}
                        step={f.type === "number" ? "any" : undefined}
                      />
                    )}
                  </Field>
                </div>
              ))}
              <div className="sm:col-span-2 flex gap-2">
                <Button type="submit">Submit</Button>
                <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader title="Records" description={`${rows.length} row(s)`} />
          <CardBody className="overflow-x-auto p-0">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-zinc-100 bg-zinc-50 text-xs uppercase text-zinc-500">
                <tr>
                  {cols.map((c) => (
                    <th key={c} className="px-3 py-2 font-medium">
                      {c}
                    </th>
                  ))}
                  <th className="px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={cols.length + 1} className="px-3 py-8 text-center text-zinc-400">
                      {loading ? "Loading…" : "No data — set filters and Load, or Create."}
                    </td>
                  </tr>
                ) : (
                  rows.map((row, i) => {
                    const id = getRowId(row);
                    return (
                      <tr key={id || i} className="border-b border-zinc-50 hover:bg-zinc-50/80">
                        {cols.map((c) => (
                          <td key={c} className="max-w-[180px] truncate px-3 py-2 text-zinc-700">
                            {cell(row[c])}
                          </td>
                        ))}
                        <td className="px-3 py-2">
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              className="px-2 py-1 text-xs"
                              onClick={async () => {
                                setSelected(row);
                                const form: Record<string, string> = {};
                                const fields = updateFields.length ? updateFields : createFields;
                                fields.forEach((f) => {
                                  const v = row[f.name];
                                  form[f.name] =
                                    v == null
                                      ? ""
                                      : typeof v === "object"
                                        ? JSON.stringify(v)
                                        : String(v);
                                });
                                setUpdateForm(form);
                                if (detailPathTemplate && id) {
                                  try {
                                    const path = detailPathTemplate.replace(
                                      "{id}",
                                      encodeURIComponent(id),
                                    );
                                    const d = await ledger.get(path);
                                    setRaw(d);
                                    if (d && typeof d === "object") {
                                      setSelected(d as Record<string, unknown>);
                                    }
                                  } catch (err) {
                                    setError(err instanceof Error ? err.message : String(err));
                                  }
                                } else {
                                  setRaw(row);
                                }
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            {deletePathTemplate ? (
                              <Button
                                variant="ghost"
                                className="px-2 py-1 text-xs text-red-600"
                                onClick={() => void onDelete(row)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </CardBody>
        </Card>

        <div className="space-y-4 lg:col-span-2">
          {selected && updatePathTemplate ? (
            <Card>
              <CardHeader title="Update" description={`id=${getRowId(selected)}`} />
              <CardBody>
                <form onSubmit={onUpdate} className="space-y-3">
                  {(updateFields.length ? updateFields : createFields).map((f) => (
                    <Field key={f.name} label={f.label}>
                      {f.type === "textarea" ? (
                        <Textarea
                          rows={3}
                          value={updateForm[f.name] ?? ""}
                          onChange={(e) =>
                            setUpdateForm((s) => ({ ...s, [f.name]: e.target.value }))
                          }
                        />
                      ) : (
                        <Input
                          type={f.type === "number" ? "number" : "text"}
                          value={updateForm[f.name] ?? ""}
                          onChange={(e) =>
                            setUpdateForm((s) => ({ ...s, [f.name]: e.target.value }))
                          }
                          step={f.type === "number" ? "any" : undefined}
                        />
                      )}
                    </Field>
                  ))}
                  <div className="flex gap-2">
                    <Button type="submit">Save</Button>
                    <Button type="button" variant="ghost" onClick={() => setSelected(null)}>
                      Close
                    </Button>
                  </div>
                </form>
              </CardBody>
            </Card>
          ) : null}

          <Card>
            <CardHeader title="Response JSON" />
            <CardBody>
              <JsonBlock value={raw ?? selected ?? { hint: "Load or select a row" }} />
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
