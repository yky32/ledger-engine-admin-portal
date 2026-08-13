"use client";

import { Sidebar } from "./sidebar";

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/80 px-6 backdrop-blur">
          <div className="text-xs font-medium text-slate-500">
            Dev ops console · engine-first
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            local
          </div>
        </header>
        <main className="scrollbar-thin flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl px-6 py-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
