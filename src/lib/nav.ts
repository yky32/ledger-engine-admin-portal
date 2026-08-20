import type { LucideIcon } from "lucide-react";
import {
  Wallet,
  ArrowLeftRight,
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
  Workflow,
  Database,
  BookOpen,
  Sparkles,
} from "lucide-react";

/**
 * Nav mirrors Door → Brain → Books product flow.
 * Product surfaces only — no legacy catalog routes.
 */
export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  group: string;
  blurb?: string;
  step?: string;
};

export const NAV: NavItem[] = [
  {
    href: "/",
    label: "Business flow",
    icon: Workflow,
    group: "Overview",
    blurb: "E2E map · demo path",
  },
  {
    href: "/demo",
    label: "Demo · Earn 5 LP",
    icon: Sparkles,
    group: "Overview",
    blurb: "HKD 500 · MCC 5411 walkthrough",
  },
  {
    href: "/recipes",
    label: "Posting recipes",
    icon: ListTree,
    group: "Overview",
    blurb: "eventType → atoms (CC_TXN_*)",
  },
  {
    href: "/health",
    label: "Engine health",
    icon: Activity,
    group: "Overview",
  },
  {
    href: "/records",
    label: "DB records",
    icon: Database,
    group: "Overview",
    blurb: "What is saved in PG via APIs",
  },

  {
    href: "/ingest-policies",
    label: "1 · Door — Ingest policy",
    icon: DoorOpen,
    group: "① Ops configures",
    blurb: "Admit + entryFactors FactorSet",
    step: "ops",
  },
  {
    href: "/digestion-rules",
    label: "1 · Brain — Digestion rules",
    icon: Brain,
    group: "① Ops configures",
    blurb: "whenFactors + formula / tier / table",
    step: "ops",
  },
  {
    href: "/coa",
    label: "1 · COA profiles",
    icon: BookOpen,
    group: "① Ops configures",
    blurb: "code ≡ eventType → books",
    step: "ops",
  },
  {
    href: "/wallets",
    label: "Wallet onboard (CRM)",
    icon: Wallet,
    group: "① Ops configures",
    blurb: "1 ownerId → 1 wallet · coaProfileCode",
    step: "ops",
  },

  {
    href: "/simulator",
    label: "2 · Shoot — Simulator",
    icon: FlaskConical,
    group: "② Upstream shoot",
    blurb: "Multi-customer matrix",
    step: "shoot",
  },
  {
    href: "/transactions-ingest",
    label: "2 · Shoot — Single webhook",
    icon: Webhook,
    group: "② Upstream shoot",
    blurb: "eventType · recipe · matchedPath",
    step: "shoot",
  },

  {
    href: "/review",
    label: "3 · Customer LP books",
    icon: Search,
    group: "③ Engine outcomes",
    blurb: "Balance ↑↓ · movements · coaProfile",
    step: "engine",
  },
  {
    href: "/ledger-entries",
    label: "3 · Books — DE legs",
    icon: ListTree,
    group: "③ Engine outcomes",
    blurb: "Double-entry vs PROGRAM",
    step: "engine",
  },
  {
    href: "/failed-transactions",
    label: "3 · Fail queue",
    icon: AlertTriangle,
    group: "③ Engine outcomes",
    blurb: "Ops review · replay",
    step: "engine",
  },
  {
    href: "/holds",
    label: "Hold / Release LP",
    icon: Lock,
    group: "③ Engine outcomes",
    blurb: "Available lock (not ledger)",
    step: "engine",
  },
  {
    href: "/movements",
    label: "4 · Audit — Movements",
    icon: ArrowLeftRight,
    group: "③ Engine outcomes",
    blurb: "GET /movements",
    step: "engine",
  },

  {
    href: "/deposits",
    label: "Deposits",
    icon: CreditCard,
    group: "Money rails",
  },
  {
    href: "/withdrawals",
    label: "Withdrawals",
    icon: CreditCard,
    group: "Money rails",
  },
  {
    href: "/transfers",
    label: "In-wallet transfers",
    icon: ArrowLeftRight,
    group: "Money rails",
  },

  {
    href: "/configurations",
    label: "System config",
    icon: Settings2,
    group: "Reference",
  },
];

export function navGroups(): { name: string; items: NavItem[] }[] {
  const map = new Map<string, NavItem[]>();
  for (const item of NAV) {
    if (!map.has(item.group)) map.set(item.group, []);
    map.get(item.group)!.push(item);
  }
  const order = [
    "Overview",
    "① Ops configures",
    "② Upstream shoot",
    "③ Engine outcomes",
    "Money rails",
    "Reference",
  ];
  return order
    .filter((n) => map.has(n))
    .map((name) => ({ name, items: map.get(name)! }));
}
