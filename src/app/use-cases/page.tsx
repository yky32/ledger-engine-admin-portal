"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, Badge, Alert, Spinner, Empty } from "@/components/ui/kit";
import { ActionBar } from "@/components/ui/action";
import { PageShell } from "@/components/layout/page-shell";
import { engine } from "@/lib/engine";
import { errMsg, clsx } from "@/lib/format";
import { HOUSE_MAIN_ACCOUNT } from "@/lib/recipes";
import type {
  AccountingRule,
  AccountingRuleExecution,
  DigestionRule,
  UseCaseCatalogItem,
} from "@/lib/types";

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

type BookCell = {
  code: string;
  title: string;
  path: string;
  house: boolean;
  credit?: string;
  debit?: string;
};

type UseCaseDef = {
  key: "hkd" | "lp";
  title: string;
  reward: string;
  resultCurrency: "HKD" | "LP";
  eventType: string;
  bindKeys: string[];
  names: string[];
  spec: BookCell[];
};

const USE_CASES: UseCaseDef[] = [
  {
    key: "hkd",
    title: "CC Transaction → HKD",
    reward: "Cashback",
    resultCurrency: "HKD",
    eventType: "CC_TXN",
    bindKeys: ["CC_TXN_HKD"],
    names: ["EARN_HKD"],
    spec: [
      {
        code: "CUSTOMER_CUST_HKD",
        title: "Customer reward (HKD)",
        path: "01-01-01-xxxxxxxx-HKD",
        house: false,
        credit: "amount",
      },
      {
        code: "HOUSE_CC_OP_HKD",
        title: "Operating (HKD)",
        path: "01-02-01-xxxxxxxx-HKD",
        house: true,
        debit: "amount",
      },
    ],
  },
  {
    key: "lp",
    title: "CC Transaction → LP",
    reward: "Loyalty",
    resultCurrency: "LP",
    eventType: "CC_TXN",
    bindKeys: ["CC_TXN_LP"],
    names: ["CC_TXN_LP", "EARN_LP"],
    spec: [
      {
        code: "CUSTOMER_CUST_LP",
        title: "Customer reward (LP)",
        path: "01-01-01-xxxxxxxx-LP",
        house: false,
        credit: "amount",
      },
      {
        code: "HOUSE_CC_OP_LP",
        title: "Operating (LP)",
        path: "01-02-01-xxxxxxxx-LP",
        house: true,
        debit: "amount",
      },
    ],
  },
];

function parseMeta(metadata: AccountingRuleExecution["metadata"]): Array<{ id: string; seq: number }> {
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

function coaPath(coa: CoaRow | undefined, house: boolean, fallback: string): string {
  if (!coa) return fallback;
  const entity = coa.entity || "01";
  const type = coa.type || "01";
  const sub = coa.subType || "01";
  const ccy = (coa.currency || "").toUpperCase() || "???";
  const main = house ? HOUSE_MAIN_ACCOUNT : "xxxxxxxx";
  return `${entity}-${type}-${sub}-${main}-${ccy}`;
}

function pickExecution(def: UseCaseDef, executions: AccountingRuleExecution[]): AccountingRuleExecution | null {
  const byEvent = executions.find((ex) =>
    def.bindKeys.includes((ex.eventType || "").trim().toUpperCase()),
  );
  if (byEvent) return byEvent;
  return (
    executions.find((ex) => def.names.includes((ex.name || "").trim().toUpperCase())) ?? null
  );
}

function booksFromExecution(
  ex: AccountingRuleExecution,
  rulesById: Map<string, AccountingRule>,
  coaByCode: Map<string, CoaRow>,
): { walk: Array<{ seq: number; rule: AccountingRule }>; books: BookCell[] } {
  const walk = parseMeta(ex.metadata)
    .map((d) => {
      const rule = rulesById.get(d.id);
      return rule ? { seq: d.seq, rule } : null;
    })
    .filter((x): x is { seq: number; rule: AccountingRule } => x != null);

  const books: BookCell[] = [];
  for (const step of walk) {
    const code = (step.rule.targetAccount || "").toUpperCase();
    const coa = coaByCode.get(code);
    const house = Boolean(coa?.walletId) || code.startsWith("HOUSE_");
    let cell = books.find((b) => b.code === code);
    if (!cell) {
      cell = {
        code,
        title: coa?.name || (house ? `Operating (${coa?.currency || code})` : `Customer reward (${coa?.currency || code})`),
        path: coaPath(coa, house, code),
        house,
      };
      books.push(cell);
    }
    const n = Number(step.rule.multiplier);
    const amt = Number.isFinite(n) && n !== 1 ? `amount × ${n}` : "amount";
    if (String(step.rule.direction).toUpperCase() === "CREDIT") cell.credit = amt;
    else cell.debit = amt;
  }
  books.sort((a, b) => Number(a.house) - Number(b.house));
  return { walk, books };
}

function TAccount({ book }: { book: BookCell }) {
  return (
    <div className="min-w-[220px] flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 bg-slate-50 px-3 py-2 text-center">
        <div className="text-xs font-semibold text-slate-800">{book.title}</div>
        <div className="mt-0.5 font-mono text-[10px] text-slate-500">{book.path}</div>
        <div className="mt-1">
          <Badge tone={book.house ? "info" : "ok"}>{book.house ? "house wallet" : "customer wallet · runtime"}</Badge>
        </div>
      </div>
      <div className="grid grid-cols-2 divide-x divide-slate-200">
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
      </div>
    </div>
  );
}

export default function UseCasesPage() {
  const [rules, setRules] = useState<AccountingRule[]>([]);
  const [executions, setExecutions] = useState<AccountingRuleExecution[]>([]);
  const [coa, setCoa] = useState<CoaRow[]>([]);
  const [brain, setBrain] = useState<DigestionRule[]>([]);
  const [catalog, setCatalog] = useState<UseCaseCatalogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await engine.houseEnsure("HOUSE").catch(() => null);
      const [r, e, c, d, u] = await Promise.all([
        engine.accountingRules(),
        engine.accountingRuleExecutions(),
        engine.coaProfiles(),
        engine.digestionRules().catch(() => ({ data: [] as DigestionRule[] })),
        engine.useCases(false).catch(() => ({ data: [] as UseCaseCatalogItem[] })),
      ]);
      let execs = Array.isArray(e.data) ? e.data : [];
      let legs = Array.isArray(r.data) ? r.data : [];
      if (execs.length === 0) {
        const saved = await engine.accountingRulesEnsure();
        legs = saved.data?.rules ?? [];
        execs = saved.data?.executions ?? [];
      }
      setRules(legs);
      setExecutions(execs);
      setCoa(Array.isArray(c.data) ? (c.data as CoaRow[]) : []);
      const dr = d.data;
      setBrain(Array.isArray(dr) ? dr : dr ? [dr] : []);
      const cat = u.data;
      setCatalog(Array.isArray(cat) ? cat : cat ? [cat] : []);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const rulesById = useMemo(() => {
    const m = new Map<string, AccountingRule>();
    for (const r of rules) if (r.id != null) m.set(String(r.id), r);
    return m;
  }, [rules]);

  const coaByCode = useMemo(() => {
    const m = new Map<string, CoaRow>();
    for (const p of coa) if (p.code) m.set(p.code.toUpperCase(), p);
    return m;
  }, [coa]);

  const cards = USE_CASES.map((def) => {
    const ex = pickExecution(def, executions);
    const live = ex ? booksFromExecution(ex, rulesById, coaByCode) : null;
    const brainHits = brain.filter(
      (r) =>
        (r.eventType || "").toUpperCase() === def.eventType &&
        (r.resultCurrency || "LP").toUpperCase() === def.resultCurrency,
    );
    return { def, ex, live, brainHits };
  });

  const otherCatalog = catalog.filter((row) => {
    const code = (row.code || "").toUpperCase();
    return code && !["CC_TXN", "CC_TXN_HKD", "CC_TXN_LP", "EARN_HKD", "EARN_LP"].includes(code);
  });

  return (
    <PageShell
      flow="ops"
      title="Use cases"
      description="UA sheet: CC Transaction → HKD (cashback) and CC Transaction → LP (loyalty). Same webhook eventType=CC_TXN; Brain resultCurrency picks the books."
      api={[
        { method: "GET", path: "/integrations/use-cases" },
        { method: "POST", path: "/accounting-rules/ensure" },
      ]}
      actions={
        <ActionBar loading={loading} error={error}>
          <button type="button" className="btn-secondary" onClick={() => void load()}>
            Reload
          </button>
        </ActionBar>
      }
    >

      <Alert tone="info">
        Upstream sends <code className="text-xs">eventType=CC_TXN</code>. Reward is not a suffix on that
        code — Brain <code className="text-xs">resultCurrency</code> HKD = cashback books, LP = loyalty
        books. Same-currency double-entry: DR operating / CR customer, both in the reward ccy.
      </Alert>

      {loading && executions.length === 0 ? <Spinner label="Loading use cases…" /> : null}

      <div className="mt-4 space-y-4">
        {cards.map(({ def, ex, live, brainHits }) => (
          <Card
            key={def.key}
            title={def.title}
            description={`${def.reward} · webhook ${def.eventType} · resultCurrency ${def.resultCurrency}`}
            right={
              <div className="flex flex-wrap items-center justify-end gap-1.5">
                <Badge tone={ex ? "ok" : "warn"}>{ex ? "live DB" : "spec"}</Badge>
                <Badge>{def.eventType}</Badge>
                <Badge tone="neutral">{def.resultCurrency}</Badge>
              </div>
            }
          >
            {live && live.walk.length > 0 ? (
              <ol className="mb-4 flex flex-wrap items-center gap-1.5 text-xs">
                {live.walk.map((s, i) => (
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
            ) : (
              <p className="mb-3 text-xs text-slate-500">
                Spec walk (ensure accounting sequences to load live legs).
              </p>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              {(live && live.books.length > 0 ? live.books : def.spec).map((b) => (
                <TAccount key={b.code + (b.credit || "") + (b.debit || "")} book={b} />
              ))}
            </div>

            <p className="mt-3 text-[11px] text-slate-500">
              Member <code className="text-[10px]">01-01-01</code> resolves at ingest (
              <code className="text-[10px]">xxxxxxxx</code> = event.mainAccount). House operating{" "}
              <code className="text-[10px]">01-02-01</code> uses company wallet {HOUSE_MAIN_ACCOUNT}.
              {ex?.name ? (
                <>
                  {" "}
                  Sequence <code className="text-[10px]">{ex.name}</code>
                  {ex.eventType ? (
                    <>
                      {" "}
                      · bind <code className="text-[10px]">{ex.eventType}</code>
                    </>
                  ) : (
                    " · unbound (resultCurrency fallback)"
                  )}
                  .
                </>
              ) : null}
            </p>

            <div className="mt-3 border-t border-slate-100 pt-3">
              <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                Brain rules · {def.eventType} · {def.resultCurrency}
              </div>
              {brainHits.length === 0 ? (
                <p className="text-xs text-slate-500">
                  No digestion rule with eventType {def.eventType} and resultCurrency{" "}
                  {def.resultCurrency}.{" "}
                  <Link href="/digestion-rules" className="text-emerald-700 hover:underline">
                    Create one →
                  </Link>
                </p>
              ) : (
                <ul className="flex flex-wrap gap-1.5">
                  {brainHits.map((r) => (
                    <li
                      key={String(r.id ?? r.code)}
                      className="rounded-md bg-violet-50 px-2 py-1 font-mono text-[11px] text-violet-800"
                    >
                      {r.code} · pri {r.priority} {r.isEnabled ? "" : "· off"}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/digestion-rules" className="btn-secondary text-xs">
                Brain
              </Link>
              <Link href="/accounting-rules" className="btn-secondary text-xs">
                Accounting legs
              </Link>
              <Link href="/transactions-ingest" className="btn-secondary text-xs">
                Shoot CC_TXN
              </Link>
            </div>
          </Card>
        ))}
      </div>

      <Card
        className="mt-6"
        title="Same posting, other eventTypes"
        description="CC_CIP / CC_SIP / LN_TXN reuse these books via resultCurrency unless you bind a combo to that eventType."
      >
        {otherCatalog.length === 0 && !loading ? (
          <Empty>No other catalog rows. Enable Brain rules for CC_CIP, CC_SIP, LN_TXN.</Empty>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>code</th>
                  <th>name</th>
                  <th>resultCurrency</th>
                  <th>Brain</th>
                  <th>on</th>
                </tr>
              </thead>
              <tbody>
                {otherCatalog.map((row) => (
                  <tr key={row.code}>
                    <td className="font-mono text-xs font-semibold">{row.code}</td>
                    <td className="text-xs">{row.name || "—"}</td>
                    <td className="font-mono text-xs">{row.resultCurrency || "—"}</td>
                    <td>
                      <Badge tone={row.hasBrainRule ? "ok" : "neutral"}>
                        {row.hasBrainRule ? "rule" : "no rule"}
                      </Badge>
                    </td>
                    <td>
                      <Badge tone={row.enabled ? "ok" : "neutral"}>{row.enabled ? "on" : "off"}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </PageShell>
  );
}
