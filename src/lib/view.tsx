"use client";

import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { viewForPath } from "@/lib/nav";

export type AdminView = "ops" | "lab" | "docs";

const VIEW_KEY = "ledgerx.admin.view";

/** Where each view's switcher segment navigates when the current route isn't owned by it. */
export const VIEW_LANDING: Record<AdminView, string> = {
  ops: "/",
  lab: "/simulator",
  // TODO: point at /cc-txn-map once the docs landing page exists.
  docs: "/use-cases",
};

function readStoredView(): AdminView | null {
  try {
    const raw = window.localStorage.getItem(VIEW_KEY);
    return raw === "ops" || raw === "lab" || raw === "docs" ? raw : null;
  } catch {
    return null;
  }
}

const ViewContext = createContext<{ view: AdminView; setView: (v: AdminView) => void }>({
  view: "ops",
  setView: () => {},
});

/**
 * Active console view (Ops / Lab / Docs). The stored choice is restored after
 * mount (never during SSR — avoids hydration mismatch), but a route owned by
 * another view always wins: deep-linking /simulator while Ops is stored flips
 * the session to Lab, because lab writes are about to happen.
 */
export function ViewProvider({ children }: { children: ReactNode }) {
  const [view, setViewState] = useState<AdminView>("ops");
  const pathname = usePathname();

  useEffect(() => {
    const stored = readStoredView();
    if (stored) setViewState(stored);
  }, []);

  useEffect(() => {
    const owner = viewForPath(pathname);
    if (owner && owner !== view) setViewState(owner);
  }, [pathname, view]);

  const setView = (v: AdminView) => {
    setViewState(v);
    try {
      window.localStorage.setItem(VIEW_KEY, v);
    } catch {
      // storage unavailable (private mode) — view stays session-only
    }
  };

  return <ViewContext.Provider value={{ view, setView }}>{children}</ViewContext.Provider>;
}

export function useView() {
  return useContext(ViewContext);
}
