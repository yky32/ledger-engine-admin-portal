import type { LucideIcon } from "lucide-react";
import {
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
  Workflow,
  Building2,
} from "lucide-react";

/**
 * Nav mirrors docs/SYSTEM_BUSINESS_FLOW.md end-to-end picture:
 *   Ops config → Upstream shoot → Engine (Door/Brain/Books/Audit) → Outcomes
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
  // Overview
  {
    href: "/",
    label: "Business flow",
    icon: Workflow,
    group: "Overview",
    blurb: "E2E map · how pieces connect",
  },
  {
    href: "/health",
    label: "Engine health",
    icon: Activity,
    group: "Overview",
  },

  // 1) Ops configures once
  {
    href: "/ingest-policy",
    label: "1 · Door — Ingest policy",
    icon: DoorOpen,
    group: "① Ops configures",
    blurb: "Accept webhooks? Auto-wallet?",
    step: "ops",
  },
  {
    href: "/digestion-rules",
    label: "1 · Brain — Digestion rules",
    icon: Brain,
    group: "① Ops configures",
    blurb: "Match event + score points",
    step: "ops",
  },
  {
    href: "/wallets",
    label: "Wallet onboard (CRM)",
    icon: Wallet,
    group: "① Ops configures",
    blurb: "Explicit 1 ownerId → 1 wallet",
    step: "ops",
  },

  // 2) Upstream shoots events
  {
    href: "/simulator",
    label: "2 · Shoot — Simulator",
    icon: FlaskConical,
    group: "② Upstream shoot",
    blurb: "Matrix as POS / OMS",
    step: "shoot",
  },
  {
    href: "/transactions-ingest",
    label: "2 · Shoot — Single webhook",
    icon: Webhook,
    group: "② Upstream shoot",
    blurb: "One event JSON",
    step: "shoot",
  },

  // 3) Engine digest outcomes
  {
    href: "/review",
    label: "3 · Customer LP books",
    icon: Search,
    group: "③ Engine outcomes",
    blurb: "Balance ↑↓ · movements",
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
    blurb: "Movement history",
    step: "engine",
  },

  // Money rails (secondary)
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
    label: "Transfers",
    icon: ArrowLeftRight,
    group: "Money rails",
  },
  {
    href: "/ledger-accounts",
    label: "Ledger accounts",
    icon: BookOpen,
    group: "Money rails",
  },
  {
    href: "/ledger-wallets",
    label: "Ledger wallets",
    icon: Building2,
    group: "Money rails",
  },

  // Reference
  {
    href: "/fx-rates",
    label: "FX rates",
    icon: Globe2,
    group: "Reference",
  },
  {
    href: "/rules",
    label: "Rules (legacy catalog)",
    icon: Scale,
    group: "Reference",
  },
  {
    href: "/rule-executions",
    label: "Rule executions",
    icon: PlayCircle,
    group: "Reference",
  },
  {
    href: "/configurations",
    label: "System config JSONB",
    icon: Settings2,
    group: "Reference",
  },
  {
    href: "/accounts",
    label: "COA accounts",
    icon: BookOpen,
    group: "Reference",
  },
  {
    href: "/journal",
    label: "Journal",
    icon: ListTree,
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
