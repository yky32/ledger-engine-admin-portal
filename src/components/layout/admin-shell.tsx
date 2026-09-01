"use client";

import { Sidebar } from "./sidebar";
import { ApiCallBar } from "./api-call-bar";

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-slate-200/80 bg-white/80 px-4 backdrop-blur sm:px-6">
          <div className="hidden shrink-0 text-xs font-medium text-slate-500 lg:block">
            Dev ops console
          </div>
          <ApiCallBar />
          <div className="flex shrink-0 items-center gap-2 text-[11px] text-slate-400">
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
