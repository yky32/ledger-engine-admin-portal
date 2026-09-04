"use client";

import { useId } from "react";
import { clsx } from "@/lib/format";

export function normalizeTier(code?: string | null): string {
  return (code ?? "").trim().toUpperCase();
}

type Look = {
  chip: string;
  text: string;
  kind: "silver" | "gold" | "diamond" | "none" | "other";
};

const LOOKS: Record<string, Look> = {
  SILVER: {
    kind: "silver",
    chip: "bg-slate-100 ring-1 ring-slate-300/80",
    text: "text-slate-700",
  },
  GOLD: {
    kind: "gold",
    chip: "bg-amber-50 ring-1 ring-amber-300/90",
    text: "text-amber-900",
  },
  DIAMOND: {
    kind: "diamond",
    chip: "bg-sky-50 ring-1 ring-sky-300/90",
    text: "text-sky-900",
  },
  PLATINUM: {
    kind: "diamond",
    chip: "bg-sky-50 ring-1 ring-sky-300/90",
    text: "text-sky-900",
  },
  NONE: {
    kind: "none",
    chip: "bg-slate-50 ring-1 ring-slate-200",
    text: "text-slate-400",
  },
};

const FALLBACK: Look = {
  kind: "other",
  chip: "bg-slate-50 ring-1 ring-slate-200",
  text: "text-slate-600",
};

function MedalSvg({
  kind,
  size,
}: {
  kind: Look["kind"];
  size: number;
}) {
  const raw = useId().replace(/:/g, "");
  const g1 = `tm-${raw}-a`;
  const g2 = `tm-${raw}-b`;

  if (kind === "none") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
        <circle cx="12" cy="12" r="8.5" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="1.6" />
      </svg>
    );
  }

  if (kind === "diamond") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
        <defs>
          <linearGradient id={g1} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#F0FDFF" />
            <stop offset="45%" stopColor="#7DD3FC" />
            <stop offset="100%" stopColor="#0284C7" />
          </linearGradient>
          <linearGradient id={g2} x1="0.2" y1="0" x2="0.8" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#BAE6FD" stopOpacity="0.2" />
          </linearGradient>
        </defs>
        <path
          d="M12 2.4 20.4 9.2 12 21.6 3.6 9.2Z"
          fill={`url(#${g1})`}
          stroke="#0369A1"
          strokeWidth="1.15"
          strokeLinejoin="round"
        />
        <path d="M3.6 9.2h16.8" stroke="#E0F2FE" strokeWidth="0.9" opacity="0.9" />
        <path d="M12 2.4 8.2 9.2 12 21.6 15.8 9.2Z" fill={`url(#${g2})`} />
        <path d="M7.4 5.6 12 2.4 16.6 5.6 20.4 9.2H3.6Z" fill="#FFFFFF" opacity="0.35" />
      </svg>
    );
  }

  const gold = kind === "gold";
  const from = gold ? "#FFF7D6" : "#F8FAFC";
  const mid = gold ? "#EAB308" : "#94A3B8";
  const to = gold ? "#B45309" : "#475569";
  const rim = gold ? "#92400E" : "#334155";
  const inner = gold ? "#FEF3C7" : "#E2E8F0";
  const star = gold ? "#FFFBEB" : "#F8FAFC";

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <defs>
        <linearGradient id={g1} x1="0.15" y1="0" x2="0.9" y2="1">
          <stop offset="0%" stopColor={from} />
          <stop offset="48%" stopColor={mid} />
          <stop offset="100%" stopColor={to} />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="10" fill={`url(#${g1})`} stroke={rim} strokeWidth="1.3" />
      <circle cx="12" cy="12" r="7.35" fill="none" stroke={inner} strokeWidth="1" opacity="0.85" />
      <path
        d="M12 6.4 13.35 10.15 17.4 10.4 14.3 12.95 15.25 16.9 12 14.75 8.75 16.9 9.7 12.95 6.6 10.4 10.65 10.15Z"
        fill={star}
        stroke={rim}
        strokeWidth="0.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TierIcon({
  code,
  size = 16,
  className,
}: {
  code?: string | null;
  size?: number;
  className?: string;
}) {
  const key = normalizeTier(code);
  const look = LOOKS[key] ?? FALLBACK;
  const kind = look.kind === "other" ? "none" : look.kind;
  return (
    <span className={clsx("inline-flex shrink-0", className)} aria-hidden>
      <MedalSvg kind={kind} size={size} />
    </span>
  );
}

/** Medal + code. SILVER / GOLD / DIAMOND (PLATINUM uses the diamond mark). */
export function TierMark({
  code,
  className,
  size = "sm",
}: {
  code?: string | null;
  className?: string;
  size?: "sm" | "md";
}) {
  const key = normalizeTier(code);
  const look = LOOKS[key] ?? FALLBACK;
  const icon = size === "md" ? 20 : 16;
  const label = key || "—";
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full py-0.5 pl-0.5 pr-2",
        look.chip,
        className,
      )}
      title={label}
    >
      <TierIcon code={key} size={icon} />
      <span
        className={clsx(
          "font-semibold tracking-wide",
          size === "md" ? "text-xs" : "text-[11px]",
          look.text,
        )}
      >
        {label}
      </span>
    </span>
  );
}
