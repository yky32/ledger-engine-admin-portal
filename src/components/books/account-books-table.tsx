"use client";

import { Empty } from "@/components/ui/kit";
import { money } from "@/lib/format";
import type { WalletAccount } from "@/lib/types";

/** DB account COA unique key, then full_number + balances. JSON names = DTO = camelCase of DB. */
const COA_COLS = [
  { key: "entity", label: "entity" },
  { key: "type", label: "type" },
  { key: "subType", label: "subType" },
  { key: "mainAccount", label: "mainAccount" },
  { key: "buffer", label: "buffer" },
  { key: "currency", label: "currency" },
] as const;

const WORD_TYPE = /^(ASSET|LIABILITY|EQUITY|REVENUE|EXPENSE)$/i;

const STEM_LABEL: Record<string, string> = {
  "01-01": "01-01 customer custodian",
  "01-02": "01-02 operating",
  "01-04": "01-04 expense",
};

function cell(v: unknown): string {
  if (v == null || v === "") return "—";
  return String(v);
}

function isDigitSeg(v?: string): boolean {
  return !!v && /^\d+$/.test(v);
}

/**
 * fullNumber = entity(2)+type(2)+subType(2)+mainAccount+buffer(2)+currency(3)
 * Old GET /wallets JSON only sent type=LIABILITY and omitted the rest — recover from fullNumber.
 */
function parseFullNumber(fullNumber?: string): Partial<WalletAccount> {
  const digits = (fullNumber || "").replace(/\D/g, "");
  if (digits.length < 12) return {};
  return {
    entity: digits.slice(0, 2),
    type: digits.slice(2, 4),
    subType: digits.slice(4, 6),
    mainAccount: digits.slice(6, -5),
    buffer: digits.slice(-5, -3),
  };
}

function resolveCoa(a: WalletAccount): WalletAccount {
  const parsed = parseFullNumber(a.fullNumber);
  const typeOk = isDigitSeg(a.type) && !WORD_TYPE.test(a.type || "");
  return {
    ...a,
    entity: isDigitSeg(a.entity) ? a.entity : parsed.entity,
    type: typeOk ? a.type : parsed.type,
    subType: isDigitSeg(a.subType) ? a.subType : parsed.subType,
    mainAccount: isDigitSeg(a.mainAccount) ? a.mainAccount : parsed.mainAccount,
    buffer: isDigitSeg(a.buffer) ? a.buffer : parsed.buffer,
  };
}

function stemOf(a: WalletAccount): string {
  const e = a.entity || "—";
  const t = a.type || "—";
  return `${e}-${t}`;
}

function groupAccounts(accounts: WalletAccount[]): { stem: string; rows: WalletAccount[] }[] {
  const map = new Map<string, WalletAccount[]>();
  for (const raw of accounts) {
    const a = resolveCoa(raw);
    const stem = stemOf(a);
    const list = map.get(stem) ?? [];
    list.push(a);
    map.set(stem, list);
  }
  const keys = [...map.keys()].sort((a, b) => {
    const rank = (s: string) =>
      s === "01-02" ? 0 : s === "01-04" ? 1 : s === "01-01" ? 2 : 9;
    return rank(a) - rank(b) || a.localeCompare(b);
  });
  return keys.map((stem) => ({
    stem,
    rows: (map.get(stem) ?? []).sort(
      (a, b) =>
        String(a.subType).localeCompare(String(b.subType)) ||
        String(a.currency).localeCompare(String(b.currency)),
    ),
  }));
}

export function AccountBooksTable({
  accounts,
  empty,
  showWalletId = false,
  showName = true,
}: {
  accounts: WalletAccount[];
  empty?: string;
  showWalletId?: boolean;
  showName?: boolean;
}) {
  if (accounts.length === 0) {
    return <Empty>{empty || "No accounts"}</Empty>;
  }
  const groups = groupAccounts(accounts);
  const colCount = (showWalletId ? 1 : 0) + COA_COLS.length + 1 + (showName ? 1 : 0) + 2;
  const showGroups = groups.length > 1;

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {showWalletId ? <th>walletId</th> : null}
            {COA_COLS.map((c) => (
              <th key={c.key}>{c.label}</th>
            ))}
            <th>fullNumber</th>
            {showName ? <th>name</th> : null}
            <th>ledgerBalance</th>
            <th>availableBalance</th>
          </tr>
        </thead>
        {groups.map((g) => (
          <tbody key={g.stem}>
            {showGroups ? (
              <tr>
                <td
                  colSpan={colCount}
                  className="bg-slate-50 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wide text-slate-600"
                >
                  {STEM_LABEL[g.stem] || g.stem}
                </td>
              </tr>
            ) : null}
            {g.rows.map((a, i) => (
              <tr key={a.id ?? `${g.stem}-${i}`}>
                {showWalletId ? (
                  <td className="font-mono text-[10px] text-slate-600">{cell(a.walletId)}</td>
                ) : null}
                {COA_COLS.map((c) => (
                  <td key={c.key} className="font-mono text-[10px] text-slate-700">
                    {cell(a[c.key])}
                  </td>
                ))}
                <td className="font-mono text-[10px] text-slate-600">{cell(a.fullNumber)}</td>
                {showName ? (
                  <td className="text-xs">{a.name || a.refCode || (a.primary ? "primary" : "—")}</td>
                ) : null}
                <td className="font-mono text-xs">{money(a.ledgerBalance)}</td>
                <td className="font-mono text-xs">{money(a.availableBalance)}</td>
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </div>
  );
}
