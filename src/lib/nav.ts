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
  CreditCard,
  Brain,
  DoorOpen,
  AlertTriangle,
  Search,
  Lock,
  ListTree,
  FlaskConical,
  Activity,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  group: string;
  blurb?: string;
};

export const NAV: NavItem[] = [
  { href: "/", label: "Home", icon: LayoutDashboard, group: "Overview", blurb: "Status & shortcuts" },
  { href: "/simulator", label: "Simulator", icon: FlaskConical, group: "Loyalty", blurb: "Multi-txn matrix" },
  { href: "/review", label: "Customer review", icon: Search, group: "Loyalty", blurb: "Wallet · mv · legs · fails" },
  { href: "/transactions-ingest", label: "Fire webhook", icon: Webhook, group: "Loyalty", blurb: "POST /integrations/webhooks" },
  { href: "/failed-transactions", label: "Failed ingest", icon: AlertTriangle, group: "Loyalty", blurb: "Review · Replay" },
  { href: "/ledger-entries", label: "Ledger legs", icon: ListTree, group: "Loyalty", blurb: "DE by event / movement" },
  { href: "/digestion-rules", label: "Digestion rules", icon: Brain, group: "Config", blurb: "Scoring brain" },
  { href: "/ingest-policy", label: "Ingest policy", icon: DoorOpen, group: "Config", blurb: "Webhook door" },
  { href: "/holds", label: "Hold / Release", icon: Lock, group: "Config", blurb: "Available lock" },
  { href: "/wallets", label: "Wallets", icon: Wallet, group: "Core", blurb: "Onboard by ownerId" },
  { href: "/movements", label: "Movements", icon: ArrowLeftRight, group: "Core", blurb: "GET /movements" },
  { href: "/deposits", label: "Deposits", icon: CreditCard, group: "Money" },
  { href: "/withdrawals", label: "Withdrawals", icon: CreditCard, group: "Money" },
  { href: "/transfers", label: "Transfers", icon: ArrowLeftRight, group: "Money" },
  { href: "/ledger-accounts", label: "Accounts", icon: BookOpen, group: "Money" },
  { href: "/fx-rates", label: "FX rates", icon: Globe2, group: "Reference" },
  { href: "/rules", label: "Rules", icon: Scale, group: "Reference" },
  { href: "/rule-executions", label: "Rule executions", icon: PlayCircle, group: "Reference" },
  { href: "/configurations", label: "System config", icon: Settings2, group: "Reference" },
  { href: "/health", label: "Engine health", icon: Activity, group: "Overview" },
];

export function navGroups(): { name: string; items: NavItem[] }[] {
  const map = new Map<string, NavItem[]>();
  for (const item of NAV) {
    if (!map.has(item.group)) map.set(item.group, []);
    map.get(item.group)!.push(item);
  }
  const order = ["Overview", "Loyalty", "Config", "Core", "Money", "Reference"];
  return order
    .filter((n) => map.has(n))
    .map((name) => ({ name, items: map.get(name)! }));
}
