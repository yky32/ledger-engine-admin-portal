import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Wallet,
  BookOpen,
  ArrowLeftRight,
  Scale,
  PlayCircle,
  Globe2,
  Settings2,
  Webhook,
  FileStack,
  CreditCard,
  Layers,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  group?: string;
};

export const NAV: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, group: "Overview" },
  { href: "/wallets", label: "Wallets (onboard)", icon: Wallet, group: "Core" },
  { href: "/ledger-wallets", label: "Ledger wallets", icon: Layers, group: "Core" },
  { href: "/ledger-accounts", label: "Ledger accounts", icon: BookOpen, group: "Core" },
  { href: "/accounts", label: "COA accounts", icon: Scale, group: "Core" },
  { href: "/movements", label: "Movements", icon: ArrowLeftRight, group: "Money" },
  { href: "/deposits", label: "Deposits", icon: CreditCard, group: "Money" },
  { href: "/withdrawals", label: "Withdrawals", icon: CreditCard, group: "Money" },
  { href: "/transfers", label: "In-wallet transfers", icon: ArrowLeftRight, group: "Money" },
  { href: "/transactions-ingest", label: "Txn ingest (webhook)", icon: Webhook, group: "Money" },
  { href: "/journal", label: "Journal post", icon: FileStack, group: "Money" },
  { href: "/rules", label: "Rules", icon: Scale, group: "Accounting" },
  { href: "/rule-executions", label: "Rule executions", icon: PlayCircle, group: "Accounting" },
  { href: "/fx-rates", label: "FX rates", icon: Globe2, group: "Config" },
  { href: "/configurations", label: "Configurations", icon: Settings2, group: "Config" },
];

export function navGroups(): { name: string; items: NavItem[] }[] {
  const map = new Map<string, NavItem[]>();
  for (const item of NAV) {
    const g = item.group || "Other";
    if (!map.has(g)) map.set(g, []);
    map.get(g)!.push(item);
  }
  return [...map.entries()].map(([name, items]) => ({ name, items }));
}
