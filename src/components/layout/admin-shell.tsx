"use client";

import { ViewProvider } from "@/lib/view";

import { LabBanner } from "./lab-banner";
import { Sidebar } from "./sidebar";
import { ViewSwitcher } from "./view-switcher";

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <ViewProvider>
      <div className="flex h-screen overflow-hidden bg-slate-100">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-12 shrink-0 items-center gap-2 border-b border-slate-200/80 bg-white/80 px-4 backdrop-blur sm:px-6">
            <ViewSwitcher />
            <div className="ml-auto flex shrink-0 items-center gap-2 text-[11px] text-slate-400">
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              local
            </div>
          </header>
          <LabBanner />
          <main className="scrollbar-thin flex-1 overflow-y-auto">
            <div className="w-full px-4 py-5">{children}</div>
          </main>
        </div>
      </div>
    </ViewProvider>
  );
}
