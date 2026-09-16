"use client";

import { useEffect, useState } from "react";

import { AccountingPanel } from "@/components/rules/accounting-panel";
import { BrainPanel } from "@/components/rules/brain-panel";
import { DoorPanel } from "@/components/rules/door-panel";
import { TierPanel } from "@/components/rules/tier-panel";
import { TabPills } from "@/components/ui/tab-pills";

const TABS = [
  { id: "door", label: "Door" },
  { id: "brain", label: "Brain" },
  { id: "tier", label: "Tiering" },
  { id: "accounting", label: "Accounting" },
] as const;

type RulesTab = (typeof TABS)[number]["id"];

const DEFAULT_TAB: RulesTab = "door";

function readTab(): RulesTab {
  if (typeof window === "undefined") return DEFAULT_TAB;
  const t = new URLSearchParams(window.location.search).get("tab");
  return TABS.some((x) => x.id === t) ? (t as RulesTab) : DEFAULT_TAB;
}

/**
 * Rules — one screen for the engine's configuration surfaces.
 * Each tab keeps its own PageShell (title, API chips, alerts).
 */
export default function RulesPage() {
  const [tab, setTab] = useState<RulesTab>(DEFAULT_TAB);

  useEffect(() => {
    setTab(readTab());
  }, []);

  const select = (id: RulesTab) => {
    setTab(id);
    const url = new URL(window.location.href);
    if (id === DEFAULT_TAB) url.searchParams.delete("tab");
    else url.searchParams.set("tab", id);
    window.history.replaceState(null, "", url);
  };

  return (
    <div>
      <div className="mb-4">
        <TabPills tabs={TABS} value={tab} onChange={select} />
      </div>
      {tab === "door" ? <DoorPanel /> : null}
      {tab === "brain" ? <BrainPanel /> : null}
      {tab === "tier" ? <TierPanel /> : null}
      {tab === "accounting" ? <AccountingPanel /> : null}
    </div>
  );
}
