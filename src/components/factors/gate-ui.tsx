"use client";

import type { ReactNode } from "react";

import type { FactorGate } from "@/lib/factors";
import { clsx } from "@/lib/format";
import { EVENT_TYPE_LABELS, EVENT_TYPES } from "@/lib/recipes";

export type ChipTone = "violet" | "emerald" | "sky" | "rose";

export function Chip({
  active,
  onClick,
  children,
  tone = "violet",
  title,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  tone?: ChipTone;
  title?: string;
}) {
  const on = {
    violet: "bg-violet-600 text-white shadow-sm",
    emerald: "bg-emerald-600 text-white shadow-sm",
    sky: "bg-sky-600 text-white shadow-sm",
    rose: "bg-rose-600 text-white shadow-sm",
  }[tone];
  const off = {
    violet: "bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-violet-300",
    emerald: "bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-emerald-300",
    sky: "bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-sky-300",
    rose: "bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-rose-300",
  }[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={clsx(
        "rounded-full px-2.5 py-1 text-[11px] font-medium transition",
        active ? on : off,
      )}
    >
      {children}
    </button>
  );
}

export function StepHead({
  n,
  title,
  sub,
  tone = "violet",
}: {
  n: number;
  title: string;
  sub: string;
  tone?: ChipTone;
}) {
  const badge = {
    violet: "bg-violet-600",
    emerald: "bg-emerald-600",
    sky: "bg-sky-600",
    rose: "bg-rose-600",
  }[tone];
  return (
    <div className="flex items-baseline gap-2.5">
      <span
        className={clsx(
          "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white",
          badge,
        )}
      >
        {n}
      </span>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <span className="text-[11px] text-slate-500">{sub}</span>
    </div>
  );
}

/** One gate = one line: label + preset chips + free-text input. */
function GateRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="w-20 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {children}
    </div>
  );
}

/** Shared eventType × MCC × currency × age × amount AND rows (Door + Brain). */
export function AndGateGrid({
  gate,
  onChange,
  tone = "violet",
}: {
  gate: FactorGate;
  onChange: (patch: Partial<FactorGate>) => void;
  tone?: ChipTone;
}) {
  return (
    <div className="space-y-1.5">
      <GateRow label="eventType">
        {EVENT_TYPES.map((v) => (
          <Chip
            key={v}
            tone={tone}
            title={EVENT_TYPE_LABELS[v]}
            active={(gate.eventTypes ?? "") === v}
            onClick={() => onChange({ eventTypes: v })}
          >
            {v}
          </Chip>
        ))}
        <Chip
          tone={tone}
          active={!gate.eventTypes?.trim()}
          onClick={() => onChange({ eventTypes: "" })}
        >
          any
        </Chip>
        <input
          className="field-input w-44 font-mono text-xs"
          value={gate.eventTypes ?? ""}
          onChange={(e) => onChange({ eventTypes: e.target.value.toUpperCase() })}
          placeholder="CC_TXN, CC_CIP,…"
        />
      </GateRow>

      <GateRow label="MCC">
        {["101", "5411", "5411,5412", "5812"].map((v) => (
          <Chip key={v} tone={tone} active={gate.mccs === v} onClick={() => onChange({ mccs: v })}>
            {v}
          </Chip>
        ))}
        <Chip tone={tone} active={gate.mccs === ""} onClick={() => onChange({ mccs: "" })}>
          any
        </Chip>
        <input
          className="field-input w-24 font-mono text-xs"
          value={gate.mccs}
          onChange={(e) => onChange({ mccs: e.target.value })}
          placeholder="custom csv"
        />
      </GateRow>

      <GateRow label="currency">
        {["HKD", "USD", "HKD,USD", "LP"].map((v) => (
          <Chip
            key={v}
            tone={tone}
            active={gate.currencies === v}
            onClick={() => onChange({ currencies: v })}
          >
            {v}
          </Chip>
        ))}
        <Chip
          tone={tone}
          active={gate.currencies === ""}
          onClick={() => onChange({ currencies: "" })}
        >
          any
        </Chip>
        <input
          className="field-input w-28 font-mono text-xs"
          value={gate.currencies}
          onChange={(e) => onChange({ currencies: e.target.value })}
          placeholder="custom csv"
        />
      </GateRow>

      <GateRow label="age">
        {["7", "30", "90"].map((v) => (
          <Chip
            key={v}
            tone={tone}
            active={gate.ageLte === v}
            onClick={() => onChange({ ageLte: v })}
          >
            ≤{v}d
          </Chip>
        ))}
        <Chip tone={tone} active={gate.ageLte === ""} onClick={() => onChange({ ageLte: "" })}>
          any
        </Chip>
        <input
          className="field-input w-16 font-mono text-xs"
          value={gate.ageLte}
          onChange={(e) => onChange({ ageLte: e.target.value })}
          placeholder="max days"
        />
      </GateRow>

      <GateRow label="amount">
        {(
          [
            ["1", "", "≥1"],
            ["100", "", "≥100"],
            ["500", "", "≥500"],
            ["100", "999999", "100–999k"],
          ] as const
        ).map(([min, max, label]) => (
          <Chip
            key={`${min}-${max}`}
            tone={tone}
            active={gate.amtMin === min && gate.amtMax === max}
            onClick={() => onChange({ amtMin: min, amtMax: max })}
          >
            {label}
          </Chip>
        ))}
        <Chip
          tone={tone}
          active={gate.amtMin === "" && gate.amtMax === ""}
          onClick={() => onChange({ amtMin: "", amtMax: "" })}
        >
          any
        </Chip>
        <input
          className="field-input w-16 font-mono text-xs"
          value={gate.amtMin}
          onChange={(e) => onChange({ amtMin: e.target.value })}
          placeholder="min"
        />
        <input
          className="field-input w-16 font-mono text-xs"
          value={gate.amtMax}
          onChange={(e) => onChange({ amtMax: e.target.value })}
          placeholder="max"
        />
      </GateRow>
    </div>
  );
}
