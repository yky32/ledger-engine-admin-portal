"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navGroups } from "@/lib/nav";
import { clsx } from "@/lib/format";
import { Hexagon } from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const groups = navGroups();

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-slate-800/80 bg-slate-950 text-slate-200">
      <div className="flex items-center gap-2.5 border-b border-white/5 px-4 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30">
          <Hexagon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold tracking-tight text-white">
            LedgeRX
          </div>
          <div className="truncate text-[11px] text-slate-400">
            Admin · Door · Brain · Books
          </div>
        </div>
      </div>

      <nav className="scrollbar-thin flex-1 space-y-5 overflow-y-auto px-2 py-4">
        {groups.map((g) => (
          <div key={g.name}>
            <div className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              {g.name}
            </div>
            <ul className="space-y-0.5">
              {g.items.map((item) => {
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={clsx(
                        "group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition",
                        active
                          ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/25"
                          : "text-slate-300 hover:bg-white/5 hover:text-white",
                      )}
                    >
                      <Icon
                        className={clsx(
                          "h-4 w-4 shrink-0",
                          active ? "text-emerald-400" : "text-slate-500 group-hover:text-slate-300",
                        )}
                      />
                      <span className="truncate font-medium">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/5 px-3 py-3 text-[11px] text-slate-500">
        Proxy <code className="text-slate-400">/api/ledger/*</code>
        <br />
        → <code className="text-slate-400">LEDGER_ENGINE_URL</code>
      </div>
    </aside>
  );
}
