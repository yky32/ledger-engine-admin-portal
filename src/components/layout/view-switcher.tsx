"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { clsx } from "@/lib/format";
import { routesForView } from "@/lib/nav";
import { useView, VIEW_LANDING, type AdminView } from "@/lib/view";

const SEGMENTS: { view: AdminView; label: string }[] = [
  { view: "ops", label: "Ops" },
  { view: "lab", label: "Lab" },
  { view: "docs", label: "Docs" },
];

/**
 * Segmented control in the shell header. Switching keeps the current route if
 * the target view owns it, otherwise lands on that view's landing page.
 */
export function ViewSwitcher() {
  const pathname = usePathname();
  const { view, setView } = useView();

  return (
    <div className="flex shrink-0 items-center gap-0.5 rounded-lg bg-slate-100 p-0.5">
      {SEGMENTS.map((segment) => {
        const active = segment.view === view;
        const ownsCurrent = routesForView(segment.view).includes(pathname);
        return (
          <Link
            key={segment.view}
            href={ownsCurrent ? pathname : VIEW_LANDING[segment.view]}
            onClick={() => setView(segment.view)}
            className={clsx(
              "rounded-md px-2.5 py-1 text-[11px] font-medium transition",
              active
                ? segment.view === "lab"
                  ? "bg-amber-500 text-white shadow-sm"
                  : "bg-slate-900 text-white shadow-sm"
                : "text-slate-500 hover:text-slate-900",
            )}
          >
            {segment.label}
          </Link>
        );
      })}
    </div>
  );
}
