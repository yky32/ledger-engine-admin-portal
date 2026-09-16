import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  CreditCard,
  Database,
  FlaskConical,
  Layers,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Workflow,
} from "lucide-react";

import type { AdminView } from "@/lib/view";

/**
 * Sidebar is filtered by view (Ops / Lab / Docs), not by pipeline stage.
 * Screens being consolidated away (Door/Brain/COA/lookups/…) are absent —
 * they stay reachable by URL until their replacements land.
 */
export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  group: string;
  view: AdminView;
  blurb?: string;
};

export const NAV: NavItem[] = [
  {
    href: "/",
    label: "Home",
    icon: Workflow,
    group: "Overview",
    view: "ops",
    blurb: "CC_TXN path",
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
    href: "/rules",
    label: "Rules",
    icon: SlidersHorizontal,
    group: "Configure",
    view: "ops",
    blurb: "Door · Brain · Tier · Accounting",
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
    group: "Lab",
    view: "lab",
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
