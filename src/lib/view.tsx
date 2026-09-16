"use client";

import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

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
 * Active console view (Ops / Lab / Docs).
 *
 * The view is DERIVED from the current route during render — never stored in
 * state — so switching views is a single navigation and a single re-render,
 * with no effects fighting the router. localStorage is only a fallback for
 * routes no view owns (legacy shims like /digestion-rules), restored after
 * mount to stay hydration-safe.
 */
export function ViewProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [stored, setStored] = useState<AdminView | null>(readStoredView());

  const setView = useCallback((v: AdminView) => {
    setStored(v);
    try {
      window.localStorage.setItem(VIEW_KEY, v);
    } catch {
      // storage unavailable (private mode) — view stays route-derived
    }
  }, []);

  const view = viewForPath(pathname) ?? stored ?? "ops";
  const value = useMemo(() => ({ view, setView }), [view, setView]);

  return <ViewContext.Provider value={value}>{children}</ViewContext.Provider>;
}

export function useView() {
  return useContext(ViewContext);
}
