"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navGroups } from "@/lib/nav";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950 text-zinc-100">
      <div className="border-b border-zinc-800 px-4 py-4">
        <div className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          Altech DLT
        </div>
        <div className="mt-0.5 text-sm font-semibold text-white">
          Ledger Engine Admin
        </div>
        <div className="mt-1 text-[11px] text-zinc-500">No auth · direct API</div>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {navGroups().map((group) => (
          <div key={group.name} className="mb-4">
            <div className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
              {group.name}
            </div>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname === item.href || pathname.startsWith(item.href + "/");
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] transition-colors",
                        active
                          ? "bg-emerald-500/15 text-emerald-300"
                          : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100",
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0 opacity-80" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t border-zinc-800 px-3 py-3 text-[11px] text-zinc-600">
        Proxy: <code className="text-zinc-500">/api/ledger/*</code>
      </div>
    </aside>
  );
}
