"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, Badge, Empty, Alert, Spinner } from "@/components/ui/kit";
import { ActionBar } from "@/components/ui/action";
import { PageShell } from "@/components/layout/page-shell";
import { engine } from "@/lib/engine";
import { errMsg, clsx } from "@/lib/format";
import { EVENT_TYPES, EVENT_TYPE_LABELS, HOUSE_MAIN_ACCOUNT } from "@/lib/recipes";
import { Chip } from "@/components/factors/gate-ui";
import type { AccountingRule, AccountingRuleExecution } from "@/lib/types";

type CoaRow = {
  code?: string;
  name?: string;
  entity?: string;
  type?: string;
  subType?: string;
  buffer?: string;
  currency?: string;
  walletId?: number | string | null;
};

type MetaDetail = { id: string; seq: number };

type BookCell = {
  code: string;
  title: string;
  path: string;
  house: boolean;
  credit?: string;
  debit?: string;
};

type SequenceView = {
  key: string;
  id?: string;
  title: string;
  eventType: string;
  orderType: string;
  description?: string;
  live: boolean;
  walk: Array<{ seq: number; rule: AccountingRule; coa?: CoaRow }>;
  books: BookCell[];
};

const SPEC: SequenceView[] = [
  {
    key: "spec-hkd",
    title: "CC Transaction → HKD",
    eventType: "CC_TXN_HKD",
    orderType: "EARN",
    description: "e.g. customer has made a credit card txn of $100",
    live: false,
    walk: [],
    books: [
      {
        code: "CUSTOMER_CUST_HKD",
        title: "Customer reward account (HKD)",
        path: "01-01-01-xxxxxxxx-HKD",
        house: false,
        credit: "100",
      },
      {
        code: "HOUSE_CC_OP_HKD",
        title: "Operating (HKD)",
        path: "01-02-01-xxxxxxxx-HKD",
        house: true,
        debit: "100",
      },
    ],
  },
  {
    key: "spec-lp",
    title: "CC Transaction → LP",
    eventType: "CC_TXN_LP",
    orderType: "EARN",
    description: "e.g. customer has made a credit card txn of $100 — same-currency DE (LP/LP)",
    live: false,
    walk: [],
    books: [
      {
        code: "CUSTOMER_CUST_LP",
        title: "Customer reward account (LP)",
        path: "01-01-01-xxxxxxxx-LP",
        house: false,
        credit: "100",
      },
      {
        code: "HOUSE_CC_OP_LP",
        title: "Operating (LP)",
        path: "01-02-01-xxxxxxxx-LP",
        house: true,
        debit: "100",
      },
    ],
  },
];

/** TXN_CR_CUST_LP → family CUST, ccy LP, dir CR. Pair CR with the matching DR. */
function parseLegName(name?: string): {
  raw: string;
  family: string;
  ccy: string;
  dir: "CR" | "DR" | null;
  stem: string;
} {
  const raw = (name || "").trim();
  const n = raw.toUpperCase();
  const m = n.match(/^(?:TXN_)?(CR|DR)_(.+)$/);
  if (!m) {
    return { raw, family: "OTHER", ccy: "", dir: null, stem: n || raw };
  }
  const dir = m[1] as "CR" | "DR";
  const rest = m[2];
  const segs = rest.split("_").filter(Boolean);
  const ccy = segs.length > 1 ? segs[segs.length - 1] : "";
  const family = segs.length > 1 ? segs.slice(0, -1).join("_") : rest;
  return { raw, family, ccy, dir, stem: rest };
}

type LegPairRow = {
  family: string;
  ccy: string;
  stem: string;
  credit?: AccountingRule;
  debit?: AccountingRule;
};

const FAMILY_ORDER = ["CUST", "OP", "OTHER"];

function groupLegPairs(rules: AccountingRule[]): { family: string; rows: LegPairRow[] }[] {
  const map = new Map<string, LegPairRow>();
  const unmatched: AccountingRule[] = [];
  for (const r of rules) {
    const p = parseLegName(r.name);
    if (!p.dir) {
      unmatched.push(r);
      continue;
    }
    const key = `${p.family}\0${p.ccy || p.stem}`;
    let row = map.get(key);
    if (!row) {
      row = { family: p.family, ccy: p.ccy, stem: p.stem };
      map.set(key, row);
    }
    if (p.dir === "CR") row.credit = r;
    else row.debit = r;
  }
  const byFamily = new Map<string, LegPairRow[]>();
  for (const row of map.values()) {
    const list = byFamily.get(row.family) ?? [];
    list.push(row);
    byFamily.set(row.family, list);
  }
  const families = [...byFamily.keys()].sort((a, b) => {
    const ra = FAMILY_ORDER.indexOf(a);
    const rb = FAMILY_ORDER.indexOf(b);
    return (ra < 0 ? 99 : ra) - (rb < 0 ? 99 : rb) || a.localeCompare(b);
  });
  const out = families.map((family) => ({
    family,
    rows: (byFamily.get(family) ?? []).sort(
      (a, b) => a.ccy.localeCompare(b.ccy) || a.stem.localeCompare(b.stem),
    ),
  }));
  if (unmatched.length) {
    out.push({
      family: "OTHER",
      rows: unmatched.map((r) => {
        const dir = String(r.direction ?? "").toUpperCase();
        return {
          family: "OTHER",
          ccy: "",
          stem: r.name || "",
          credit: dir === "CREDIT" ? r : undefined,
          debit: dir === "DEBIT" ? r : undefined,
        };
      }),
    });
  }
  return out;
}

function LegPairCell({ rule }: { rule?: AccountingRule }) {
  if (!rule) {
    return <span className="text-[11px] text-slate-300">—</span>;
  }
  const dir = String(rule.direction ?? "").toUpperCase();
  return (
    <div className="min-w-[12rem]">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="font-mono text-xs font-semibold">{rule.name}</span>
        <Badge tone={dir === "CREDIT" ? "ok" : "error"}>{rule.direction}</Badge>
      </div>
      <div className="mt-0.5 font-mono text-[11px] text-emerald-800">{rule.targetAccount || "—"}</div>
      <div className="text-[11px] text-slate-500">
        ×{String(rule.multiplier ?? "1")}
        {rule.description ? ` · ${rule.description}` : ""}
      </div>
    </div>
  );
}

function parseMeta(metadata: AccountingRuleExecution["metadata"]): MetaDetail[] {
  if (!metadata) return [];
  let obj: unknown = metadata;
  if (typeof metadata === "string") {
    try {
      obj = JSON.parse(metadata);
    } catch {
      return [];
    }
  }
  const rules = (obj as { rules?: unknown }).rules;
  if (!Array.isArray(rules)) return [];
  return rules
    .map((r) => {
      const row = r as { id?: string | number; seq?: number };
      return { id: String(row.id ?? ""), seq: Number(row.seq ?? 999) };
    })
    .filter((r) => r.id)
    .sort((a, b) => a.seq - b.seq);
}

function coaPath(coa: CoaRow | undefined, house: boolean, fallbackCode: string): string {
  const entity = coa?.entity || "01";
  const type = coa?.type || "01";
  const sub = coa?.subType || "01";
  const ccy = (coa?.currency || "").toUpperCase() || "???";
  const main = house ? HOUSE_MAIN_ACCOUNT : "xxxxxxxx";
  if (!coa) return fallbackCode;
  return `${entity}-${type}-${sub}-${main}-${ccy}`;
}

function bookTitle(coa: CoaRow | undefined, code: string, house: boolean): string {
  if (coa?.name) return coa.name;
  if (house) return `Operating (${coa?.currency || code})`;
  return `Customer reward (${coa?.currency || code})`;
}

function amountLabel(multiplier: unknown): string {
  const n = Number(multiplier);
  if (!Number.isFinite(n) || n === 1) return "amount × 1";
  return `amount × ${n}`;
}

function toSequence(
  ex: AccountingRuleExecution,
  rulesById: Map<string, AccountingRule>,
  coaByCode: Map<string, CoaRow>,
): SequenceView {
  const details = parseMeta(ex.metadata);
  const walk = details
    .map((d) => {
      const rule = rulesById.get(d.id);
      if (!rule) return null;
      const code = (rule.targetAccount || "").toUpperCase();
      return { seq: d.seq, rule, coa: coaByCode.get(code) };
    })
    .filter((x): x is NonNullable<typeof x> => x != null);

  const books: BookCell[] = [];
  for (const step of walk) {
    const code = (step.rule.targetAccount || "").toUpperCase();
    const coa = step.coa;
    const house = Boolean(coa?.walletId) || code.startsWith("HOUSE_");
    let cell = books.find((b) => b.code === code);
    if (!cell) {
      cell = {
        code,
        title: bookTitle(coa, code, house),
        path: coaPath(coa, house, code),
        house,
      };
      books.push(cell);
    }
    const amt = amountLabel(step.rule.multiplier);
    if (String(step.rule.direction).toUpperCase() === "CREDIT") cell.credit = amt;
    else cell.debit = amt;
  }
  books.sort((a, b) => Number(a.house) - Number(b.house));

  const et = (ex.eventType || "").trim().toUpperCase();
  const title =
    et === "CC_TXN_HKD" || (ex.name || "").toUpperCase() === "EARN_HKD"
      ? "CC Transaction → HKD"
      : et === "CC_TXN_LP" || (ex.name || "").toUpperCase() === "CC_TXN_LP"
        ? "CC Transaction → LP"
        : EVENT_TYPE_LABELS[et as keyof typeof EVENT_TYPE_LABELS]
          ? `${et} · ${EVENT_TYPE_LABELS[et as keyof typeof EVENT_TYPE_LABELS]}`
          : ex.name || et || "Default EARN";

  return {
    key: String(ex.id ?? ex.name ?? et),
    id: ex.id != null ? String(ex.id) : undefined,
    title,
    eventType: et || "(default EARN)",
    orderType: ex.orderType || "EARN",
    description: ex.description,
    live: true,
    walk,
    books,
  };
}

function TAccount({ book }: { book: BookCell }) {
  return (
    <div className="min-w-[240px] flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 bg-slate-50 px-3 py-2 text-center">
        <div className="text-xs font-semibold text-slate-800">{book.title}</div>
        <div className="mt-0.5 font-mono text-[10px] text-slate-500">{book.path}</div>
        <div className="mt-1">
          <Badge tone={book.house ? "info" : "ok"}>{book.house ? "house wallet" : "customer wallet · runtime"}</Badge>
        </div>
      </div>
      <div className="grid grid-cols-2 divide-x divide-slate-200">
        <div className="px-3 py-2 text-center">
          <div className="text-[10px] font-bold uppercase tracking-wider text-rose-700">DR</div>
          <div
            className={clsx(
              "mt-2 min-h-[2.25rem] font-mono text-lg font-semibold",
              book.debit ? "text-rose-700" : "text-slate-300",
            )}
          >
            {book.debit || "—"}
          </div>
        </div>
        <div className="px-3 py-2 text-center">
          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">CR</div>
          <div
            className={clsx(
              "mt-2 min-h-[2.25rem] font-mono text-lg font-semibold",
              book.credit ? "text-emerald-700" : "text-slate-300",
            )}
          >
            {book.credit || "—"}
          </div>
        </div>
      </div>
    </div>
  );
}

function SequenceCard({
  seq,
  combos,
  onBind,
}: {
  seq: SequenceView;
  combos: AccountingRuleExecution[];
  onBind?: (executionId: string, eventType: string) => void;
}) {
  return (
    <Card
      title={seq.title}
      description={seq.description}
      right={
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <Badge tone={seq.live ? "ok" : "warn"}>{seq.live ? "live DB" : "spec (not in DB yet)"}</Badge>
          <Badge>{seq.eventType}</Badge>
          <Badge tone="neutral">{seq.orderType}</Badge>
        </div>
      }
    >
      {seq.walk.length > 0 ? (
        <ol className="mb-4 flex flex-wrap items-center gap-1.5 text-xs">
          {seq.walk.map((s, i) => (
            <li key={`${s.seq}-${s.rule.id}`} className="flex items-center gap-1.5">
              {i > 0 ? <span className="text-slate-300">→</span> : null}
              <span
                className={clsx(
                  "rounded-full px-2 py-0.5 font-mono text-[11px] font-medium",
                  String(s.rule.direction).toUpperCase() === "CREDIT"
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-rose-100 text-rose-800",
                )}
              >
                {s.seq}. {s.rule.direction} {s.rule.targetAccount}
              </span>
            </li>
          ))}
        </ol>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        {seq.books.map((b) => (
          <TAccount key={b.code + (b.credit || "") + (b.debit || "")} book={b} />
        ))}
      </div>
      <p className="mt-3 text-[11px] text-slate-500">
        <code className="text-[10px]">xxxxxxxx</code> is the wallet main account — customer books resolve at
        runtime (different account id per CUST). House operating uses the company wallet (
        {HOUSE_MAIN_ACCOUNT}).
      </p>
      {seq.live && seq.eventType && !seq.eventType.startsWith("(") && onBind ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Switch combo</span>
          <select
            className="field-select max-w-xs text-xs"
            value={seq.id || ""}
            onChange={(e) => {
              const next = e.target.value;
              if (next) onBind(next, seq.eventType);
            }}
          >
            {combos.map((c) => (
              <option key={String(c.id)} value={String(c.id)}>
                {c.name}
                {c.eventType ? ` · live ${c.eventType}` : " · unbound"}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </Card>
  );
}

export default function AccountingRulesPage() {
  const [rules, setRules] = useState<AccountingRule[]>([]);
  const [executions, setExecutions] = useState<AccountingRuleExecution[]>([]);
  const [coa, setCoa] = useState<CoaRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [legName, setLegName] = useState("");
  const [legDir, setLegDir] = useState<"CREDIT" | "DEBIT">("CREDIT");
  const [legMult, setLegMult] = useState("1");
  const [legCoa, setLegCoa] = useState("");
  const [legDesc, setLegDesc] = useState("");

  const [comboName, setComboName] = useState("");
  const [comboEvent, setComboEvent] = useState("");
  const [comboOrder, setComboOrder] = useState("EARN");
  const [comboWalk, setComboWalk] = useState<string[]>([]);
  const [comboPick, setComboPick] = useState("");

  const applyLists = (
    nextRules: AccountingRule[],
    nextExec: AccountingRuleExecution[],
    nextCoa?: CoaRow[],
  ) => {
    setRules(nextRules);
    setExecutions(nextExec);
    if (nextCoa) setCoa(nextCoa);
  };

  const refresh = useCallback(async () => {
    const [r, e, c] = await Promise.all([
      engine.accountingRules(),
      engine.accountingRuleExecutions(),
      engine.coaProfiles(),
    ]);
    applyLists(
      Array.isArray(r.data) ? r.data : [],
      Array.isArray(e.data) ? e.data : [],
      Array.isArray(c.data) ? (c.data as CoaRow[]) : [],
    );
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setOk(null);
    try {
      await engine.houseEnsure("HOUSE").catch(() => null);
      await refresh();
      const listed = await engine.accountingRuleExecutions();
      const execs = Array.isArray(listed.data) ? listed.data : [];
      if (execs.length === 0) {
        const saved = await engine.accountingRulesEnsure();
        applyLists(saved.data?.rules ?? [], saved.data?.executions ?? []);
        const c = await engine.coaProfiles();
        setCoa(Array.isArray(c.data) ? (c.data as CoaRow[]) : []);
        setOk("Default UA sequences written to DB");
      }
    } catch (err) {
      setRules([]);
      setExecutions([]);
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  useEffect(() => {
    void load();
  }, [load]);

  const bind = async (executionId: string, eventType: string) => {
    setError(null);
    setOk(null);
    try {
      await engine.accountingRuleExecutionUpdate(executionId, { eventType });
      setOk(`Bound ${eventType} → that combination`);
      await refresh();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const createLeg = async () => {
    setError(null);
    setOk(null);
    if (!legName.trim() || !legCoa) {
      setError("Leg needs a name and a COA targetAccount");
      return;
    }
    try {
      await engine.accountingRuleCreate({
        name: legName.trim(),
        description: legDesc.trim() || undefined,
        direction: legDir,
        multiplier: Number(legMult) || 1,
        targetAccount: legCoa,
      });
      setOk(`Created leg ${legName.trim()}`);
      setLegName("");
      setLegDesc("");
      await refresh();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const createCombo = async () => {
    setError(null);
    setOk(null);
    if (!comboName.trim() || comboWalk.length === 0) {
      setError("Combination needs a name and at least one leg");
      return;
    }
    try {
      await engine.accountingRuleExecutionCreate({
        name: comboName.trim(),
        orderType: comboOrder,
        eventType: comboEvent.trim() ? comboEvent.trim().toUpperCase() : undefined,
        rules: comboWalk.map((id, i) => ({ id, seq: i + 1 })),
      });
      setOk(`Created combination ${comboName.trim()}`);
      setComboName("");
      setComboEvent("");
      setComboWalk([]);
      await refresh();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const sequences = useMemo(() => {
    const rulesById = new Map<string, AccountingRule>();
    for (const r of rules) {
      if (r.id != null) rulesById.set(String(r.id), r);
    }
    const coaByCode = new Map<string, CoaRow>();
    for (const p of coa) {
      if (p.code) coaByCode.set(p.code.toUpperCase(), p);
    }
    const live = executions.map((ex) => toSequence(ex, rulesById, coaByCode));
    live.sort((a, b) => {
      const rank = (et: string) =>
        et === "CC_TXN_HKD" ? 0 : et === "CC_TXN_LP" ? 1 : et.startsWith("(") ? 9 : 5;
      return rank(a.eventType) - rank(b.eventType) || a.title.localeCompare(b.title);
    });
    return live;
  }, [rules, executions, coa]);

  const shown = sequences.length > 0 ? sequences : SPEC;
  const bound = sequences.filter((s) => s.live && s.eventType && !s.eventType.startsWith("("));
  const ruleById = useMemo(() => {
    const m = new Map<string, AccountingRule>();
    for (const r of rules) if (r.id != null) m.set(String(r.id), r);
    return m;
  }, [rules]);

  return (
    <PageShell
      flow="accounting"
      title="Accounting rules"
      description="Create reusable CR/DR legs, combine them into executions, bind one combination per eventType. Ingest uses that walk; switch anytime."
      api={[
        { method: "POST", path: "/accounting-rules" },
        { method: "PUT", path: "/accounting-rules/{id}" },
        { method: "POST", path: "/accounting-rule-executions" },
        { method: "PUT", path: "/accounting-rule-executions/{id}" },
        { method: "POST", path: "/accounting-rules/ensure" },
      ]}
      actions={
        <ActionBar loading={loading} error={error} ok={ok}>
          <button type="button" className="btn-secondary" onClick={() => void load()}>
            Reload
          </button>
        </ActionBar>
      }
    >

      <Alert tone="info">
        Product use cases:{" "}
        <Link href="/use-cases" className="underline">
          CC Transaction → HKD
        </Link>{" "}
        and{" "}
        <Link href="/use-cases" className="underline">
          CC Transaction → LP
        </Link>
        . Legs are reusable. An <strong>execution</strong> is an ordered combination. Binding{" "}
        <code className="text-xs">eventType</code> makes that combo live for ingest — previous binding for
        the same eventType is cleared.
      </Alert>

      <div className="mt-4 space-y-4">
        {loading && shown.length === 0 ? <Spinner label="Loading posting sequences…" /> : null}
        {shown.map((s) => (
          <SequenceCard key={s.key} seq={s} combos={executions} onBind={(id, et) => void bind(id, et)} />
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card title="New leg" description="POST /accounting-rules — one CR or DR template. targetAccount is a COA code.">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="field">
              <span className="field-label">Name</span>
              <input className="field-input" value={legName} onChange={(e) => setLegName(e.target.value)} />
            </label>
            <label className="field">
              <span className="field-label">Direction</span>
              <select className="field-select" value={legDir} onChange={(e) => setLegDir(e.target.value as "CREDIT" | "DEBIT")}>
                <option value="CREDIT">CREDIT</option>
                <option value="DEBIT">DEBIT</option>
              </select>
            </label>
            <label className="field">
              <span className="field-label">Multiplier</span>
              <input className="field-input" value={legMult} onChange={(e) => setLegMult(e.target.value)} />
            </label>
            <label className="field">
              <span className="field-label">COA targetAccount</span>
              <select className="field-select" value={legCoa} onChange={(e) => setLegCoa(e.target.value)}>
                <option value="">Select COA…</option>
                {coa.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.code} · {p.entity}-{p.type}-{p.subType} {p.currency}
                  </option>
                ))}
              </select>
            </label>
            <label className="field sm:col-span-2">
              <span className="field-label">Description</span>
              <input className="field-input" value={legDesc} onChange={(e) => setLegDesc(e.target.value)} />
            </label>
          </div>
          <button type="button" className="btn-primary mt-3 text-xs" onClick={() => void createLeg()}>
            Create leg
          </button>
        </Card>

        <Card
          title="New combination"
          description="POST /accounting-rule-executions — pick legs in order. Optional eventType binds it live."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="field">
              <span className="field-label">Name</span>
              <input className="field-input" value={comboName} onChange={(e) => setComboName(e.target.value)} />
            </label>
            <label className="field">
              <span className="field-label">Order type</span>
              <select className="field-select" value={comboOrder} onChange={(e) => setComboOrder(e.target.value)}>
                <option value="EARN">EARN</option>
                <option value="BURN">BURN</option>
                <option value="ADJUSTMENT">ADJUSTMENT</option>
              </select>
            </label>
            <label className="field sm:col-span-2">
              <span className="field-label">Bind eventType (same token as Door / Brain)</span>
              <input
                className="field-input font-mono"
                placeholder="CC_TXN — leave blank to keep unbound"
                value={comboEvent}
                onChange={(e) => setComboEvent(e.target.value.toUpperCase())}
              />
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {EVENT_TYPES.map((t) => (
                  <Chip
                    key={t}
                    active={comboEvent === t}
                    title={EVENT_TYPE_LABELS[t]}
                    onClick={() => setComboEvent(t)}
                  >
                    {t}
                  </Chip>
                ))}
              </div>
            </label>
          </div>
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <label className="field min-w-[12rem] flex-1">
              <span className="field-label">Add leg</span>
              <select className="field-select" value={comboPick} onChange={(e) => setComboPick(e.target.value)}>
                <option value="">Select a leg…</option>
                {rules.map((r) => (
                  <option key={String(r.id)} value={String(r.id)}>
                    {r.direction} {r.targetAccount} · {r.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="btn-secondary text-xs"
              onClick={() => {
                if (!comboPick) return;
                setComboWalk((w) => [...w, comboPick]);
                setComboPick("");
              }}
            >
              Add to walk
            </button>
          </div>
          {comboWalk.length > 0 ? (
            <ol className="mt-3 space-y-1">
              {comboWalk.map((id, i) => {
                const r = ruleById.get(id);
                return (
                  <li key={`${id}-${i}`} className="flex items-center gap-2 text-xs">
                    <span className="w-5 font-mono text-slate-400">{i + 1}.</span>
                    <Badge tone={String(r?.direction).toUpperCase() === "CREDIT" ? "ok" : "error"}>
                      {r?.direction ?? "?"}
                    </Badge>
                    <span className="font-mono">{r?.targetAccount ?? id}</span>
                    <span className="text-slate-400">{r?.name}</span>
                    <button
                      type="button"
                      className="ml-auto text-slate-400 hover:text-rose-600"
                      onClick={() => setComboWalk((w) => w.filter((_, j) => j !== i))}
                    >
                      remove
                    </button>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="mt-2 text-xs text-slate-500">Walk is empty — add CR/DR legs in order.</p>
          )}
          <button type="button" className="btn-primary mt-3 text-xs" onClick={() => void createCombo()}>
            Create combination
          </button>
        </Card>
      </div>

      <Card
        className="mt-6"
        title={`Legs catalog (${rules.length})`}
        description="Grouped by similar name. DEBIT on the left, CREDIT on the right (TXN_DR_CUST_LP ↔ TXN_CR_CUST_LP)."
      >
        {rules.length === 0 ? (
          <Empty>No AccountingRule rows yet.</Empty>
        ) : (
          <div className="space-y-4">
            {groupLegPairs(rules).map((g) => (
              <div key={g.family}>
                <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  {g.family}
                </div>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th className="w-20">ccy</th>
                        <th>DEBIT</th>
                        <th>CREDIT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.rows.map((row) => (
                        <tr key={`${g.family}-${row.stem}`}>
                          <td className="whitespace-nowrap font-mono text-xs font-semibold text-slate-600">
                            {row.ccy || "—"}
                          </td>
                          <td>
                            <LegPairCell rule={row.debit} />
                          </td>
                          <td>
                            <LegPairCell rule={row.credit} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {bound.length === 0 && executions.length > 0 ? (
        <p className="mt-3 text-xs text-slate-500">{executions.length} combination(s) stored, none bound to an eventType yet.</p>
      ) : null}
    </PageShell>
  );
}
