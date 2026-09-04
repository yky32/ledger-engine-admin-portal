"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navGroups } from "@/lib/nav";
import { clsx } from "@/lib/format";
import { Hexagon } from "lucide-react";
import { useEngineHealth, type EngineHealthState } from "@/lib/engine-health";

function EngineBadge({ state }: { state: EngineHealthState }) {
  const online = state === "up";
  const checking = state === "checking";
  return (
    <span
      title={checking ? "Engine…" : online ? "Engine online" : "Engine offline"}
      className={clsx(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
        checking
          ? "bg-slate-800 text-slate-400"
          : online
            ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30"
            : "bg-rose-500/20 text-rose-300 ring-1 ring-rose-500/30",
      )}
    >
      <span
        className={clsx(
          "h-1.5 w-1.5 rounded-full",
          checking ? "bg-slate-500" : online ? "bg-emerald-400" : "bg-rose-400",
        )}
      />
      {checking ? "…" : online ? "Online" : "Offline"}
    </span>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const groups = navGroups();
  const { state: engineState } = useEngineHealth();

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-slate-800/80 bg-slate-950 text-slate-200">
      <div className="flex items-center gap-2.5 border-b border-white/5 px-4 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30">
          <Hexagon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="truncate text-sm font-semibold tracking-tight text-white">
              LedgeRX
            </div>
            <EngineBadge state={engineState} />
          </div>
          <div className="truncate text-[11px] text-slate-400">
            ingest → digest → books → tier
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
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{item.label}</span>
                        {item.blurb ? (
                          <span
                            className={clsx(
                              "block truncate text-[10px] leading-tight",
                              active ? "text-emerald-400/80" : "text-slate-500",
                            )}
                          >
                            {item.blurb}
                          </span>
                        ) : null}
                      </span>
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
