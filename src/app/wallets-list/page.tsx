"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Card, Badge, Empty, JsonBlock, ApiPath } from "@/components/ui/kit";
import { PageShell } from "@/components/layout/page-shell";
import { FilterBar } from "@/components/ui/filter-bar";
import { engine } from "@/lib/engine";
import { errMsg, money, shortId, clsx } from "@/lib/format";
import { rememberOwnerId } from "@/lib/owner-memory";
import type { LedgerLeg, MovementView, WalletAccount, WalletView } from "@/lib/types";
import { AccountBooksTable } from "@/components/books/account-books-table";
import { RefundHow } from "@/components/books/refund-how";
import { Chip } from "@/components/factors/gate-ui";

/** Wallet table columns = DB / JSON names (GET /wallets). */
const WALLET_COLS: { key: keyof WalletView; label: string; mono?: boolean }[] = [
  { key: "walletId", label: "walletId", mono: true },
  { key: "accountId", label: "accountId", mono: true },
  { key: "ownerId", label: "ownerId", mono: true },
  { key: "vanityCode", label: "vanityCode", mono: true },
  { key: "name", label: "name" },
  { key: "type", label: "type" },
  { key: "walletType", label: "walletType" },
  { key: "status", label: "status" },
  { key: "tier", label: "tier" },
  { key: "settlementCurrency", label: "settlementCurrency" },
  { key: "isActive", label: "isActive" },
  { key: "createDt", label: "createDt", mono: true },
  { key: "createBy", label: "createBy" },
  { key: "updateDt", label: "updateDt", mono: true },
  { key: "updateBy", label: "updateBy" },
];

const WALLET_TYPES = ["INDIVIDUAL", "CORPORATE"] as const;

function cell(v: unknown, key: keyof WalletView): string {
  if (v == null || v === "") return "—";
  if (key === "walletId" || key === "accountId") return shortId(String(v), 8);
  if (key === "createDt" || key === "updateDt") return fmtDt(String(v));
  if (typeof v === "boolean") return v ? "true" : "false";
  return String(v);
}

type FlowTab = "in" | "out" | "all";
type Flow = "in" | "out" | "other";

const IN_TYPES = new Set([
  "EARN",
  "DEPOSIT",
  "RELEASE",
  "ADJUSTMENT",
  "ADJUSTMENT_REFUND",
  "ADJUSTMENT_TOTAL",
]);
const OUT_TYPES = new Set([
  "BURN",
  "WITHDRAWAL",
  "HOLD",
  "CHARGE",
  "BANK_CHARGE",
  "HANDLING_CHARGE",
  "ADJUSTMENT_REFUND",
]);

function isHouse(ownerId?: string | null): boolean {
  const o = String(ownerId ?? "").toUpperCase();
  return o === "HOUSE" || o === "PROGRAM";
}

/** Customer: EARN/DEPOSIT in. HOUSE pool: EARN drains, BURN refills. */
function movementFlow(m: MovementView, ownerId: string): Flow {
  const t = String(m.orderType ?? m.type ?? "").toUpperCase();
  const program = isHouse(ownerId);
  if (t === "EARN") return program ? "out" : "in";
  if (t === "BURN") return program ? "in" : "out";
  if (IN_TYPES.has(t)) return "in";
  if (OUT_TYPES.has(t)) return "out";
  if (t === "WALLET_TRANSFER" || t === "IN_WALLET_TRANSFER" || t === "SWIFT_TRANSFER") {
    if (m.targetId && m.targetId === ownerId) return "in";
    if (m.originatorId && m.originatorId === ownerId) return "out";
  }
  return "other";
}

function accountsOf(w: WalletView | null): WalletAccount[] {
  if (!w) return [];
  if (w.accounts?.length) return w.accounts;
  if (w.account) return [w.account];
  return [];
}

function fmtDt(v?: string | null): string {
  if (!v) return "—";
  const iso = /T/.test(v) ? v : v.replace(" ", "T") + (/Z|[+-]\d\d/.test(v) ? "" : "Z");
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return v;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

function Tab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "rounded-full px-2.5 py-1 text-[11px] font-medium transition",
        active
          ? "bg-emerald-600 text-white shadow-sm"
          : "bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-emerald-300",
      )}
    >
      {children}
    </button>
  );
}

export default function WalletsQueryListPage() {
  const [rows, setRows] = useState<WalletView[]>([]);
  const [ownerId, setOwnerId] = useState("");
  const [selected, setSelected] = useState<WalletView | null>(null);
  const [movements, setMovements] = useState<MovementView[]>([]);
  const [legs, setLegs] = useState<LedgerLeg[]>([]);
  const [selectedMovementId, setSelectedMovementId] = useState<number | string | null>(null);
  const [tab, setTab] = useState<FlowTab>("in");
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calledPath, setCalledPath] = useState("/wallets");
  const [showJson, setShowJson] = useState(false);
  const [walletTypeFilter, setWalletTypeFilter] = useState<string>("");
  const [walletTypeQuery, setWalletTypeQuery] = useState("");
  const [refunding, setRefunding] = useState(false);

  const loadLegs = async (movementId: number | string) => {
    setSelectedMovementId(movementId);
    try {
      const r = await engine.legs({ movementId });
      setLegs(Array.isArray(r.data) ? r.data : []);
    } catch (e) {
      setLegs([]);
      setError(errMsg(e));
    }
  };

  const refundSelected = async () => {
    if (selectedMovementId == null || !selected?.ownerId) return;
    setRefunding(true);
    setError(null);
    try {
      const r = await engine.refundMovement(selectedMovementId);
      const refund = r.data as MovementView | undefined;
      await openWallet(selected);
      if (refund?.id != null) {
        await loadLegs(refund.id);
        setTab("all");
      }
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setRefunding(false);
    }
  };

  const openWallet = useCallback(async (row: WalletView) => {
    const oid = row.ownerId?.trim();
    if (!oid) return;
    rememberOwnerId(oid);
    setSelected(row);
    setTab("in");
    setLegs([]);
    setSelectedMovementId(null);
    setShowJson(false);
    setDetailLoading(true);
    setError(null);
    try {
      if (typeof window !== "undefined") {
        const u = new URL(window.location.href);
        u.searchParams.set("ownerId", oid);
        window.history.replaceState(null, "", u.pathname + "?" + u.searchParams.toString());
      }
      setCalledPath(`/wallets/${encodeURIComponent(oid)}`);
      const [w, m] = await Promise.all([
        engine.getWallet(oid).catch(() => ({ data: row })),
        engine.movements(oid, { size: 80 }),
      ]);
      const wallet = (w.data as WalletView) ?? row;
      setSelected(wallet);
      const list = Array.isArray(m.data) ? m.data : [];
      setMovements(list);
      const firstIn = list.find((x) => movementFlow(x, oid) === "in") ?? list[0];
      if (firstIn?.id != null && firstIn.id !== "") {
        await loadLegs(firstIn.id);
      }
    } catch (e) {
      setMovements([]);
      setError(errMsg(e));
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const oid = ownerId.trim();
      if (oid) {
        const path = `/wallets/${encodeURIComponent(oid)}`;
        setCalledPath(path);
        const r = await engine.getWallet(oid);
        const w = r.data as WalletView;
        setRows(w ? [w] : []);
        if (w) await openWallet(w);
      } else {
        setCalledPath("/wallets");
        const r = await engine.listWallets();
        const list = Array.isArray(r.data) ? r.data : r.data ? [r.data] : [];
        setRows(list);
      }
    } catch (e) {
      setRows([]);
      setSelected(null);
      setMovements([]);
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [ownerId, openWallet]);

  useEffect(() => {
    let q = "";
    try {
      q = new URLSearchParams(window.location.search).get("ownerId") || "";
    } catch {
      /* ignore */
    }
    if (q) setOwnerId(q);
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        if (q) {
          setCalledPath(`/wallets/${encodeURIComponent(q)}`);
          const r = await engine.getWallet(q);
          const w = r.data as WalletView;
          setRows(w ? [w] : []);
          if (w) await openWallet(w);
        } else {
          setCalledPath("/wallets");
          const r = await engine.listWallets();
          const list = Array.isArray(r.data) ? r.data : r.data ? [r.data] : [];
          setRows(list);
        }
      } catch (e) {
        setRows([]);
        setError(errMsg(e));
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredRows = useMemo(() => {
    const chip = walletTypeFilter.trim().toUpperCase();
    const q = walletTypeQuery.trim().toUpperCase();
    return rows.filter((r) => {
      const wt = String(r.walletType ?? "").toUpperCase();
      if (chip && wt !== chip) return false;
      if (q && !wt.includes(q)) return false;
      return true;
    });
  }, [rows, walletTypeFilter, walletTypeQuery]);

  const oid = selected?.ownerId ?? "";
  const books = accountsOf(selected);
  const bookIds = useMemo(
    () => new Set(books.map((a) => (a.id != null ? String(a.id) : "")).filter(Boolean)),
    [books],
  );

  const visible = useMemo(() => {
    if (tab === "all") return movements;
    return movements.filter((m) => movementFlow(m, oid) === tab);
  }, [movements, tab, oid]);

  const inCount = movements.filter((m) => movementFlow(m, oid) === "in").length;
  const outCount = movements.filter((m) => movementFlow(m, oid) === "out").length;
  const selectedMv = movements.find((m) => m.id === selectedMovementId) ?? null;

  return (
    <PageShell
      flow="ledger"
      title="Wallets"
      description="Click a row for books, incoming history, and DE legs. GET /wallets · /wallets/{ownerId}/movements · ledger-entries."
      api={[
        { method: "GET", path: "/wallets" },
        { method: "GET", path: "/wallets/{ownerId}" },
        { method: "GET", path: "/wallets/{ownerId}/movements" },
        { method: "GET", path: "/integrations/ledger-entries" },
      ]}
      actions={
        <Link href="/wallets" className="btn-secondary text-xs">
          Onboard →
        </Link>
      }
    >
      <FilterBar loading={loading} error={error} onSubmit={() => void load()}>
        <label className="field min-w-[220px]">
          <span className="field-label">ownerId (optional)</span>
          <input
            className="field-input font-mono"
            value={ownerId}
            onChange={(e) => setOwnerId(e.target.value)}
            placeholder="01A47158227"
          />
        </label>
        <label className="field min-w-[160px]">
          <span className="field-label">walletType</span>
          <input
            className="field-input font-mono text-xs"
            value={walletTypeQuery}
            onChange={(e) => setWalletTypeQuery(e.target.value)}
            placeholder="INDIVIDUAL / CORPORATE"
          />
        </label>
        <div className="flex flex-wrap items-center gap-1.5 pb-0.5">
          <Chip
            tone="emerald"
            active={walletTypeFilter === ""}
            onClick={() => setWalletTypeFilter("")}
          >
            All
          </Chip>
          {WALLET_TYPES.map((t) => (
            <Chip
              key={t}
              tone="emerald"
              active={walletTypeFilter === t}
              onClick={() => setWalletTypeFilter((cur) => (cur === t ? "" : t))}
            >
              {t}
            </Chip>
          ))}
        </div>
      </FilterBar>

      <Card
        className="mb-4"
        title={`Wallets (${filteredRows.length}${filteredRows.length !== rows.length ? ` / ${rows.length}` : ""})`}
        description="All wallet columns from GET /wallets. Click a row for books."
        right={<ApiPath method="GET" path={calledPath} />}
      >
        {rows.length === 0 ? (
          <Empty>{loading ? "Loading…" : "No wallets"}</Empty>
        ) : filteredRows.length === 0 ? (
          <Empty>No wallets match walletType filter.</Empty>
        ) : (
          <div className="table-wrap max-h-[360px] overflow-auto">
            <table className="data-table">
              <thead>
                <tr>
                  {WALLET_COLS.map((c) => (
                    <th key={c.key} className="whitespace-nowrap">
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((r, i) => (
                  <tr
                    key={r.walletId ?? r.ownerId ?? i}
                    className={
                      selected?.ownerId === r.ownerId ? "cursor-pointer bg-emerald-50" : "cursor-pointer"
                    }
                    onClick={() => void openWallet(r)}
                  >
                    {WALLET_COLS.map((c) => {
                      const raw = r[c.key];
                      if (c.key === "status") {
                        return (
                          <td key={c.key}>
                            <Badge tone={r.status === "ACTIVE" ? "ok" : "neutral"}>{r.status || "—"}</Badge>
                          </td>
                        );
                      }
                      if (c.key === "walletType") {
                        return (
                          <td key={c.key}>
                            <Badge tone={String(r.walletType).toUpperCase() === "CORPORATE" ? "info" : "neutral"}>
                              {r.walletType || "—"}
                            </Badge>
                          </td>
                        );
                      }
                      if (c.key === "isActive") {
                        return (
                          <td key={c.key}>
                            <Badge tone={r.isActive === false ? "warn" : "ok"}>
                              {r.isActive === false ? "false" : "true"}
                            </Badge>
                          </td>
                        );
                      }
                      return (
                        <td
                          key={c.key}
                          className={clsx(
                            "whitespace-nowrap text-xs",
                            c.mono && "font-mono text-[11px]",
                            c.key === "ownerId" && "font-medium",
                            c.key === "name" && "max-w-[180px] truncate",
                          )}
                        >
                          {cell(raw, c.key)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {selected ? (
        <>
          <Card
            className="mb-4"
            title={`Wallet · ${selected.ownerId}`}
            description={selected.name || "GET /wallets/{ownerId}"}
            right={
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/review?ownerId=${encodeURIComponent(selected.ownerId || "")}`}
                  className="text-xs text-emerald-700 hover:underline"
                >
                  Full review →
                </Link>
              </div>
            }
          >
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-slate-500">walletId</dt>
                <dd className="font-mono text-xs">{selected.walletId ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-slate-500">status</dt>
                <dd>
                  <Badge tone={selected.status === "ACTIVE" ? "ok" : "neutral"}>
                    {selected.status || "—"}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-slate-500">settlement</dt>
                <dd>{selected.settlementCurrency || "—"}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-slate-500">type</dt>
                <dd className="text-xs">
                  {selected.type || "—"} · {selected.walletType || "—"}
                </dd>
              </div>
            </dl>

            <div className="mt-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Books
              </div>
              <AccountBooksTable
                accounts={books}
                empty={detailLoading ? "Loading books…" : "No accounts on this wallet"}
              />
            </div>
          </Card>

          <RefundHow />

          <div className="mb-4 grid gap-4 lg:grid-cols-5">
            <Card
              title="History"
              description="GET /wallets/{ownerId}/movements"
              className="lg:col-span-3"
              right={
                <div className="flex flex-wrap gap-1.5">
                  <Tab active={tab === "in"} onClick={() => setTab("in")}>
                    Incoming ({inCount})
                  </Tab>
                  <Tab active={tab === "out"} onClick={() => setTab("out")}>
                    Out ({outCount})
                  </Tab>
                  <Tab active={tab === "all"} onClick={() => setTab("all")}>
                    All ({movements.length})
                  </Tab>
                </div>
              }
            >
              {detailLoading && movements.length === 0 ? (
                <Empty>Loading movements…</Empty>
              ) : visible.length === 0 ? (
                <Empty>
                  {tab === "in"
                    ? "No incoming yet — shoot a webhook or deposit to this ownerId."
                    : "No movements in this filter."}
                </Empty>
              ) : (
                <div className="table-wrap max-h-[420px] overflow-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>when</th>
                        <th>type</th>
                        <th>amount</th>
                        <th>status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((m) => {
                        const flow = movementFlow(m, oid);
                        const active = m.id === selectedMovementId;
                        return (
                          <tr
                            key={m.id ?? m.movementKey}
                            className={active ? "cursor-pointer bg-emerald-50" : "cursor-pointer"}
                            onClick={() => m.id != null && m.id !== "" && void loadLegs(m.id)}
                          >
                            <td className="whitespace-nowrap text-[11px] text-slate-500">
                              {fmtDt(m.createDt)}
                            </td>
                            <td>
                              <div className="text-xs font-medium">{m.orderType || m.type || "—"}</div>
                              <div className="font-mono text-[10px] text-slate-400">
                                {m.id} {m.alias ? `· ${m.alias}` : ""}
                              </div>
                            </td>
                            <td
                              className={clsx(
                                "font-mono text-xs font-semibold",
                                Number(m.amount) < 0 || flow === "out"
                                  ? "text-rose-700"
                                  : flow === "in"
                                    ? "text-emerald-700"
                                    : "text-slate-700",
                              )}
                            >
                              {Number(m.amount) < 0
                                ? ""
                                : flow === "in"
                                  ? "+"
                                  : flow === "out"
                                    ? "−"
                                    : ""}
                              {money(m.amount)} {m.currency}
                            </td>
                            <td>
                              <Badge
                                tone={
                                  m.status === "SETTLED" || m.status === "DONE"
                                    ? "ok"
                                    : m.status === "ERROR" || m.status === "REJECTED"
                                      ? "error"
                                      : "neutral"
                                }
                              >
                                {m.status || "—"}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            <Card
              title="Ledger legs"
              description={
                selectedMovementId
                  ? `GET /integrations/ledger-entries?movementId=${selectedMovementId}`
                  : "Click a movement"
              }
              className="lg:col-span-2"
            >
              {selectedMv ? (
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[11px] text-slate-500">
                    {selectedMv.orderType} · {money(selectedMv.amount)} {selectedMv.currency}
                    {selectedMv.remarks ? ` · ${selectedMv.remarks}` : ""}
                  </p>
                  {(selectedMv.orderType === "EARN" || selectedMv.orderType === "BURN") &&
                  selectedMv.status === "SETTLED" ? (
                    <button
                      type="button"
                      className="btn-secondary text-[11px]"
                      disabled={refunding}
                      onClick={() => void refundSelected()}
                    >
                      {refunding ? "Refunding…" : "Refund · reverse DR/CR"}
                    </button>
                  ) : null}
                </div>
              ) : null}
              {legs.length === 0 ? (
                <Empty>{selectedMovementId ? "No DE legs on this movement" : "Click a history row"}</Empty>
              ) : (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>dir</th>
                        <th>amount</th>
                        <th>book</th>
                      </tr>
                    </thead>
                    <tbody>
                      {legs.map((e, i) => {
                        const mine = e.accountId != null && bookIds.has(String(e.accountId));
                        const book = books.find((a) => String(a.id) === String(e.accountId));
                        const incoming = mine && String(e.direction).toUpperCase() === "CREDIT";
                        return (
                          <tr
                            key={e.entryId ?? i}
                            className={incoming ? "bg-emerald-50/80" : undefined}
                          >
                            <td>
                              <Badge
                                tone={
                                  String(e.direction).toUpperCase() === "CREDIT" ? "ok" : "warn"
                                }
                              >
                                {e.direction}
                              </Badge>
                              {mine ? (
                                <div className="mt-0.5 text-[10px] font-medium text-emerald-700">this book</div>
                              ) : (
                                <div className="mt-0.5 text-[10px] text-slate-400">counterparty</div>
                              )}
                            </td>
                            <td className="font-mono text-xs">
                              {money(e.amount)} {e.currency}
                            </td>
                            <td>
                              <div className="font-mono text-[10px] text-slate-600">
                                {e.fullNumber || book?.fullNumber || "—"}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {book?.currency || e.currency}
                                {book?.name ? ` ${book.name}` : ""}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>

          <button
            type="button"
            className="mb-4 inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-800"
            onClick={() => setShowJson((v) => !v)}
          >
            {showJson ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            Wallet JSON
          </button>
          {showJson ? (
            <Card className="mb-4" title="GET /wallets/{ownerId}">
              <JsonBlock value={selected} maxHeight={280} />
            </Card>
          ) : null}
        </>
      ) : (
        <Empty>Click a wallet row to open books and incoming history.</Empty>
      )}
    </PageShell>
  );
}
