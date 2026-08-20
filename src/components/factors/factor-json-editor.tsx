"use client";

import { FACTOR_HELP, type FactorPreset } from "@/lib/factors";

/**
 * Shared Door/Brain FactorSet JSON editor + presets.
 */
export function FactorJsonEditor({
  label,
  hint,
  value,
  onChange,
  presets,
  rows = 10,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (next: string) => void;
  presets: FactorPreset[];
  rows?: number;
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <div className="field-label">{label}</div>
          {hint ? <p className="mt-0.5 text-[11px] text-slate-500">{hint}</p> : null}
        </div>
        <p className="max-w-md text-right text-[10px] leading-snug text-slate-400">
          {FACTOR_HELP.modes}
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {presets.map((p) => (
          <button
            key={p.id}
            type="button"
            title={p.blurb}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 shadow-sm hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
            onClick={() => onChange(JSON.stringify(p.value, null, 2))}
          >
            {p.label}
          </button>
        ))}
      </div>

      <textarea
        className="field-input min-h-[160px] font-mono text-xs leading-relaxed"
        style={{ minHeight: `${Math.max(rows, 8) * 1.15}rem` }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        placeholder='[] or { "match": "any", "factors": [...] }'
      />

      <p className="text-[10px] text-slate-400">
        Leaves: {FACTOR_HELP.leaves}. Ops: {FACTOR_HELP.ops}. Array = AND all.
        Engine docs: FACTORS.md
      </p>
    </div>
  );
}
