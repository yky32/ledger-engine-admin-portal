import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  Brain,
  CreditCard,
  Database,
  DoorOpen,
  FlaskConical,
  Layers,
  ListTree,
  Medal,
  Scale,
  Settings2,
  Sparkles,
  Workflow,
} from "lucide-react";

import type { AdminView } from "@/lib/view";

/**
 * Sidebar is filtered by view (Ops / Lab / Docs), not by pipeline stage.
 * Configure entries carry their CC_TXN flow number (1 Door · 2 Brain ·
 * 3 Accounting · 5 Tiering — 4 Ledger is not operator-configurable).
 */
export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  group: string;
  view: AdminView;
  /** CC_TXN flow step shown as a number badge in the sidebar. */
  step?: number;
  /** Rendered greyed-out and non-clickable (flow steps with no config surface yet). */
  disabled?: boolean;
  blurb?: string;
};

export const NAV: NavItem[] = [
  {
    href: "/",
    label: "Overview",
    icon: Workflow,
    group: "Overview",
    view: "ops",
    blurb: "engine health",
  },
  {
    href: "/failed-transactions",
    label: "Fail queue",
    icon: AlertTriangle,
    group: "Operate",
    view: "ops",
    blurb: "review / replay",
  },
  {
    href: "/rules/door",
    label: "Door",
    icon: DoorOpen,
    group: "Configure",
    view: "ops",
    step: 1,
    blurb: "admit gate",
  },
  {
    href: "/rules/brain",
    label: "Brain",
    icon: Brain,
    group: "Configure",
    view: "ops",
    step: 2,
    blurb: "score LP",
  },
  {
    href: "/rules/accounting",
    label: "Accounting",
    icon: Scale,
    group: "Configure",
    view: "ops",
    step: 3,
    blurb: "CR/DR walk",
  },
  {
    href: "/ledger",
    label: "Ledger",
    icon: ListTree,
    group: "Configure",
    view: "ops",
    step: 4,
    disabled: true,
    blurb: "books — see Wallets",
  },
  {
    href: "/rules/tier",
    label: "Tiering",
    icon: Medal,
    group: "Configure",
    view: "ops",
    step: 5,
    blurb: "LP total → tier",
  },

  {
    href: "/simulator",
    label: "Simulator",
    icon: FlaskConical,
    group: "Lab",
    view: "lab",
    blurb: "event matrix",
  },
  {
    href: "/demo",
    label: "Demo",
    icon: Sparkles,
    group: "Lab",
    view: "lab",
  },
  {
    href: "/configurations",
    label: "Config",
    icon: Settings2,
    group: "Lab",
    view: "lab",
  },
  {
    href: "/records",
    label: "DB records",
    icon: Database,
    group: "Investigate",
    view: "ops",
    blurb: "raw rows · read-only",
  },

  {
    href: "/deposits",
    label: "Deposit",
    icon: ArrowDownToLine,
    group: "Rails",
    view: "lab",
  },
  {
    href: "/withdrawals",
    label: "Withdraw",
    icon: ArrowUpFromLine,
    group: "Rails",
    view: "lab",
  },
  {
    href: "/transfers",
    label: "Transfer",
    icon: ArrowLeftRight,
    group: "Rails",
    view: "lab",
  },

  {
    href: "/use-cases",
    label: "Use cases",
    icon: CreditCard,
    group: "Docs",
    view: "docs",
  },
  {
    href: "/capability",
    label: "Capability",
    icon: Layers,
    group: "Docs",
    view: "docs",
  },
];

const GROUP_ORDER: Record<AdminView, string[]> = {
  ops: ["Overview", "Operate", "Configure", "Investigate"],
  lab: ["Lab", "Rails"],
  docs: ["Docs"],
};

export function navGroups(view: AdminView): { name: string; items: NavItem[] }[] {
  const map = new Map<string, NavItem[]>();
  for (const item of NAV) {
    if (item.view !== view) continue;
    if (!map.has(item.group)) map.set(item.group, []);
    map.get(item.group)!.push(item);
  }
  return GROUP_ORDER[view]
    .filter((name) => map.has(name))
    .map((name) => ({ name, items: map.get(name)! }));
}

export function routesForView(view: AdminView): string[] {
  return NAV.filter((item) => item.view === view).map((item) => item.href);
}

/** Which view owns this path, or null for unlisted (legacy) routes. */
export function viewForPath(pathname: string): AdminView | null {
  for (const item of NAV) {
    const hit =
      item.href === "/"
        ? pathname === "/"
        : pathname === item.href || pathname.startsWith(`${item.href}/`);
    if (hit) return item.view;
  }
  return null;
}
