import type { LucideIcon } from "lucide-react";
import {
  Wallet,
  ArrowLeftRight,
  ArrowDownToLine,
  ArrowUpFromLine,
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
  Workflow,
  Database,
  Sparkles,
  Building2,
  Users,
  Scale,
  Library,
  UserPlus,
} from "lucide-react";

/**
 * Nav follows engine REST domains, not the old numbered ops/shoot/query flow.
 * Door /ingest-policies → Brain /digestion-rules → Accounting /accounting-rules
 * → books on /wallets · /corporate-coa · /coa-profiles · /movements.
 */
export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  group: string;
  blurb?: string;
};

export const NAV: NavItem[] = [
  {
    href: "/wallets-list",
    label: "Wallets",
    icon: Wallet,
    group: "Wallets",
  },
  {
    href: "/wallets",
    label: "Onboard",
    icon: UserPlus,
    group: "Wallets",
  },

  {
    href: "/corporate-coa",
    label: "House COA",
    icon: Building2,
    group: "Chart",
    blurb: "01-02 op / 01-04 expense",
  },
  {
    href: "/coa",
    label: "Customer COA",
    icon: Users,
    group: "Chart",
    blurb: "01-01-01 HKD / LP",
  },
  {
    href: "/coa-dictionary",
    label: "Dictionary",
    icon: Library,
    group: "Chart",
    blurb: "What 01-02 means",
  },

  {
    href: "/ingest-policies",
    label: "Door",
    icon: DoorOpen,
    group: "Rules",
    blurb: "/ingest-policies",
  },
  {
    href: "/digestion-rules",
    label: "Brain",
    icon: Brain,
    group: "Rules",
    blurb: "/digestion-rules",
  },
  {
    href: "/accounting-rules",
    label: "Accounting",
    icon: Scale,
    group: "Rules",
    blurb: "/accounting-rules",
  },

  {
    href: "/simulator",
    label: "Simulator",
    icon: FlaskConical,
    group: "Ingest",
  },
  {
    href: "/transactions-ingest",
    label: "Webhook",
    icon: Webhook,
    group: "Ingest",
  },

  {
    href: "/review",
    label: "Wallet books",
    icon: Search,
    group: "Ledger",
  },
  {
    href: "/movements",
    label: "Movements",
    icon: ArrowLeftRight,
    group: "Ledger",
  },
  {
    href: "/ledger-entries",
    label: "Double-entry",
    icon: ListTree,
    group: "Ledger",
  },
  {
    href: "/failed-transactions",
    label: "Fail queue",
    icon: AlertTriangle,
    group: "Ledger",
  },

  {
    href: "/holds",
    label: "Hold",
    icon: Lock,
    group: "Rails",
  },
  {
    href: "/deposits",
    label: "Deposit",
    icon: ArrowDownToLine,
    group: "Rails",
  },
  {
    href: "/withdrawals",
    label: "Withdraw",
    icon: ArrowUpFromLine,
    group: "Rails",
  },
  {
    href: "/transfers",
    label: "Transfer",
    icon: ArrowLeftRight,
    group: "Rails",
  },

  {
    href: "/",
    label: "Business flow",
    icon: Workflow,
    group: "Guide",
  },
  {
    href: "/demo",
    label: "Demo",
    icon: Sparkles,
    group: "Guide",
  },
  {
    href: "/use-cases",
    label: "Use cases",
    icon: CreditCard,
    group: "Guide",
  },
  {
    href: "/records",
    label: "DB records",
    icon: Database,
    group: "Guide",
  },
  {
    href: "/configurations",
    label: "Config",
    icon: Settings2,
    group: "Guide",
  },
];

export function navGroups(): { name: string; items: NavItem[] }[] {
  const map = new Map<string, NavItem[]>();
  for (const item of NAV) {
    if (!map.has(item.group)) map.set(item.group, []);
    map.get(item.group)!.push(item);
  }
  const order = ["Wallets", "Chart", "Rules", "Ingest", "Ledger", "Rails", "Guide"];
  return order
    .filter((n) => map.has(n))
    .map((name) => ({ name, items: map.get(name)! }));
}
