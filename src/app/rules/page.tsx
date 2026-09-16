"use client";

import { useEffect, useState } from "react";

import { AccountingPanel } from "@/components/rules/accounting-panel";
import { BrainPanel } from "@/components/rules/brain-panel";
import { DoorPanel } from "@/components/rules/door-panel";
import { TierPanel } from "@/components/rules/tier-panel";

type RulesTab = "door" | "brain" | "tier" | "accounting";

const DEFAULT_TAB: RulesTab = "door";

function readTab(): RulesTab {
  if (typeof window === "undefined") return DEFAULT_TAB;
  const t = new URLSearchParams(window.location.search).get("tab");
  if (t === "door" || t === "brain" || t === "tier" || t === "accounting") return t;
  return DEFAULT_TAB;
}

/**
 * /rules — legacy entry point. Renders the panel for old ?tab= deep links;
 * the canonical routes are /rules/{door,brain,tier,accounting}.
 */
export default function RulesPage() {
  const [tab, setTab] = useState<RulesTab>(DEFAULT_TAB);

  useEffect(() => {
    setTab(readTab());
  }, []);

  return (
    <>
      {tab === "door" ? <DoorPanel /> : null}
      {tab === "brain" ? <BrainPanel /> : null}
      {tab === "tier" ? <TierPanel /> : null}
      {tab === "accounting" ? <AccountingPanel /> : null}
    </>
  );
}
