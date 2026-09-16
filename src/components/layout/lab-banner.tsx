"use client";

import { FlaskConical } from "lucide-react";

import { useView } from "@/lib/view";

/** Slim warning strip shown above <main> whenever the Lab view is active. */
export function LabBanner() {
  const { view } = useView();
  if (view !== "lab") return null;
  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-1.5 text-[11px] font-medium text-amber-900 sm:px-6">
      <FlaskConical className="h-3.5 w-3.5 shrink-0" />
      Lab — screens here write demo / seed state to the engine DB.
    </div>
  );
}
