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
  Medal,
} from "lucide-react";

/**
 * Sidebar follows the CC spend path:
 * Run (webhook) → Books (wallet) → Pipeline (Door / Brain / Accounting / Tier) → Chart.
 * Rails and lab tools sit last.
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
    href: "/",
    label: "Home",
    icon: Workflow,
    group: "Home",
    blurb: "CC_TXN path",
  },

  {
    href: "/transactions-ingest",
    label: "Webhook",
    icon: Webhook,
    group: "Run",
    blurb: "one CC_TXN",
  },
  {
    href: "/simulator",
    label: "Simulator",
    icon: FlaskConical,
    group: "Run",
    blurb: "event matrix",
  },
  {
    href: "/failed-transactions",
    label: "Fail queue",
    icon: AlertTriangle,
    group: "Run",
    blurb: "review / replay",
  },

  {
    href: "/wallets-list",
    label: "Wallets",
    icon: Wallet,
    group: "Books",
    blurb: "LP · tier · refund",
  },
  {
    href: "/wallets",
    label: "Onboard",
    icon: UserPlus,
    group: "Books",
  },
  {
    href: "/ledger-entries",
    label: "Double-entry",
    icon: ListTree,
    group: "Books",
    blurb: "DE legs",
  },

  {
    href: "/ingest-policies",
    label: "Door",
    icon: DoorOpen,
    group: "Pipeline",
    blurb: "admit",
  },
  {
    href: "/digestion-rules",
    label: "Brain",
    icon: Brain,
    group: "Pipeline",
    blurb: "score LP",
  },
  {
    href: "/accounting-rules",
    label: "Accounting",
    icon: Scale,
    group: "Pipeline",
    blurb: "CR/DR walk",
  },
  {
    href: "/wallet-tier-policies",
    label: "Tiering",
    icon: Medal,
    group: "Pipeline",
    blurb: "LP total → tier",
  },

  {
    href: "/corporate-coa",
    label: "House COA",
    icon: Building2,
    group: "Chart",
    blurb: "01-02 / 01-04",
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
    blurb: "what 01-02 means",
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
    href: "/demo",
    label: "Demo",
    icon: Sparkles,
    group: "More",
  },
  {
    href: "/use-cases",
    label: "Use cases",
    icon: CreditCard,
    group: "More",
  },
  {
    href: "/review",
    label: "Lookup",
    icon: Search,
    group: "More",
    blurb: "one ownerId",
  },
  {
    href: "/movements",
    label: "Movements",
    icon: ArrowLeftRight,
    group: "More",
    blurb: "by walletId",
  },
  {
    href: "/records",
    label: "DB records",
    icon: Database,
    group: "More",
  },
  {
    href: "/configurations",
    label: "Config",
    icon: Settings2,
    group: "More",
  },
];

export function navGroups(): { name: string; items: NavItem[] }[] {
  const map = new Map<string, NavItem[]>();
  for (const item of NAV) {
    if (!map.has(item.group)) map.set(item.group, []);
    map.get(item.group)!.push(item);
  }
  const order = ["Home", "Run", "Books", "Pipeline", "Chart", "Rails", "More"];
  return order
    .filter((n) => map.has(n))
    .map((name) => ({ name, items: map.get(name)! }));
}
