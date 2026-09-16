"use client";

import { BookOpen, FlaskConical, Wrench, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { clsx } from "@/lib/format";
import { routesForView } from "@/lib/nav";
import { useView, VIEW_LANDING, type AdminView } from "@/lib/view";

const SEGMENTS: {
  view: AdminView;
  label: string;
  icon: LucideIcon;
  activeTone: string;
}[] = [
  {
    view: "ops",
    label: "Ops",
    icon: Wrench,
    activeTone: "bg-emerald-600 text-white shadow-sm",
  },
  {
    view: "lab",
    label: "Lab",
    icon: FlaskConical,
    activeTone: "bg-amber-500 text-white shadow-sm",
  },
  {
    view: "docs",
    label: "Docs",
    icon: BookOpen,
    activeTone: "bg-sky-600 text-white shadow-sm",
  },
];

/**
 * Segmented control in the shell header. Switching keeps the current route if
 * the target view owns it, otherwise lands on that view's landing page.
 */
export function ViewSwitcher() {
  const pathname = usePathname();
  const { view } = useView();

  return (
    <div className="flex shrink-0 items-center gap-1 rounded-xl bg-slate-200/80 p-1">
      {SEGMENTS.map((segment) => {
        const active = segment.view === view;
        const ownsCurrent = routesForView(segment.view).includes(pathname);
        const Icon = segment.icon;
        return (
          <Link
            key={segment.view}
            href={ownsCurrent ? pathname : VIEW_LANDING[segment.view]}
            aria-current={active ? "page" : undefined}
            className={clsx(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition",
              active ? segment.activeTone : "text-slate-500 hover:bg-white/60 hover:text-slate-900",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {segment.label}
          </Link>
        );
      })}
    </div>
  );
}
