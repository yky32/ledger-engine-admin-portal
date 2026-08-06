import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Wallet,
  BookOpen,
  ArrowLeftRight,
  Scale,
  PlayCircle,
  Users,
  Landmark,
  Globe2,
  Settings2,
  Webhook,
  Building2,
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
  { href: "/transfers", label: "Transfers", icon: ArrowLeftRight, group: "Money" },
  { href: "/transactions-ingest", label: "Txn ingest (webhook)", icon: Webhook, group: "Money" },
  { href: "/journal", label: "Journal post", icon: FileStack, group: "Money" },
  { href: "/rules", label: "Rules", icon: Scale, group: "Accounting" },
  { href: "/rule-executions", label: "Rule executions", icon: PlayCircle, group: "Accounting" },
  { href: "/recipients", label: "Recipients", icon: Users, group: "Ops" },
  { href: "/linked-bank-accounts", label: "Linked banks", icon: Landmark, group: "Ops" },
  { href: "/virtual-accounts", label: "Virtual accounts", icon: Building2, group: "Ops" },
  { href: "/wallet-applications", label: "Wallet applications", icon: FileStack, group: "Ops" },
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
