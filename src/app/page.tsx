"use client";

import {
  AlertTriangle,
  ArrowRight,
  Brain,
  DoorOpen,
  Medal,
  RefreshCw,
  Scale,
  Wallet,
  Webhook,
} from "lucide-react";
import Link from "next/link";

import {
  useEngineHealth,
  type EngineHealthSample,
  type EngineHealthState,
} from "@/lib/engine-health";
import { clsx } from "@/lib/format";

const OPERATE_LINKS = [
  {
    href: "/failed-transactions",
    icon: AlertTriangle,
    title: "Fail queue",
    desc: "Triage + replay failed ingests",
  },
  {
    href: "/transactions-ingest",
    icon: Webhook,
    title: "Ingest",
    desc: "Fire a test transaction",
  },
  {
    href: "/wallets-list",
    icon: Wallet,
    title: "Wallets",
    desc: "Books, movements, balances",
  },
] as const;

const FLOW_LINKS = [
  { href: "/rules/door", icon: DoorOpen, step: 1, title: "Door", desc: "Admit gate + auto-wallet" },
  {
    href: "/rules/brain",
    icon: Brain,
    step: 2,
    title: "Brain",
    desc: "Scoring rules + walk order",
  },
  {
    href: "/rules/accounting",
    icon: Scale,
    step: 3,
    title: "Accounting",
    desc: "CR/DR legs + combos",
  },
  { href: "/rules/tier", icon: Medal, step: 5, title: "Tiering", desc: "Tier bands + enable" },
] as const;

const VIEW_LINKS = [
  {
    label: "Lab — demo & seed tooling",
    links: [
      { href: "/simulator", label: "Simulator" },
      { href: "/demo", label: "Demo" },
      { href: "/configurations", label: "Config" },
      { href: "/records", label: "DB records" },
      { href: "/deposits", label: "Deposits" },
      { href: "/withdrawals", label: "Withdrawals" },
      { href: "/transfers", label: "Transfers" },
    ],
  },
  {
    label: "Docs — handbook",
    links: [
      { href: "/use-cases", label: "Use cases" },
      { href: "/capability", label: "Capability" },
    ],
  },
] as const;

const HERO_TONES: Record<EngineHealthState, { box: string; dot: string; label: string }> = {
  up: { box: "border-emerald-200 bg-emerald-50/70", dot: "bg-emerald-500", label: "Engine online" },
  down: { box: "border-rose-200 bg-rose-50/70", dot: "bg-rose-500", label: "Engine offline" },
  checking: {
    box: "border-slate-200 bg-white",
    dot: "bg-slate-400 animate-pulse",
    label: "Checking engine…",
  },
};

function fmtClock(at: number): string {
  return new Date(at).toLocaleTimeString("en-GB", { hour12: false });
}

/** Last-10 health checks: bar height = probe latency, full rose bar = failed. */
function HealthChart({ history }: { history: EngineHealthSample[] }) {
  const maxMs = Math.max(100, ...history.map((h) => h.ms));
  const okCount = history.filter((h) => h.state === "up").length;
  const downCount = history.length - okCount;
  return (
    <div className="mt-5">
      <div className="flex h-14 items-end gap-[2px] border-b border-slate-200">
        {history.length === 0 ? (
          <span className="text-xs text-slate-400">waiting for the first check…</span>
        ) : (
          history.map((h) => {
            const down = h.state === "down";
            const pct = down ? 100 : Math.max(10, Math.round((h.ms / maxMs) * 100));
            return (
              <div
                key={h.at}
                className="group relative flex h-full min-w-0 flex-1 items-end justify-center"
              >
                <div
                  className={clsx("w-3 rounded-t-[2px]", down ? "bg-rose-700" : "bg-emerald-600")}
                  style={{ height: `${pct}%` }}
                />
                <div className="pointer-events-none absolute bottom-full z-10 mb-1 hidden whitespace-nowrap rounded-md bg-slate-950 px-2 py-1 font-mono text-[10px] text-slate-100 group-hover:block">
                  {fmtClock(h.at)} · {down ? "failed" : "ok"} · {h.ms}ms
                </div>
              </div>
            );
          })
        )}
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400">
        <span>last {history.length} checks · height = latency · full bar = failed</span>
        {history.length > 0 ? (
          <span className="font-mono">
            {fmtClock(history[0].at)} → {fmtClock(history[history.length - 1].at)}
          </span>
        ) : null}
      </div>
      <span className="sr-only">
        {history.length === 0
          ? "No health checks recorded yet."
          : `Last ${history.length} health checks: ${okCount} ok, ${downCount} failed, latest ${history[history.length - 1].ms}ms.`}
      </span>
    </div>
  );
}

export default function OverviewPage() {
  const { state, detail, history, refresh } = useEngineHealth();
  const tone = HERO_TONES[state];

  return (
    <div className="mx-auto max-w-3xl">
      {/* Health */}
      <section className={clsx("rounded-2xl border p-6", tone.box)}>
        <div className="flex flex-wrap items-center gap-4">
          <span className={clsx("h-4 w-4 shrink-0 rounded-full", tone.dot)} />
          <div className="min-w-0 flex-1">
            <div className="text-2xl font-semibold tracking-tight text-slate-900">{tone.label}</div>
            <div className="mt-0.5 text-xs text-slate-500">
              <code className="font-mono">/api/ledger/*</code> →{" "}
              <code className="font-mono">LEDGER_ENGINE_URL</code> · re-checks every 15s
            </div>
          </div>
          <button type="button" className="btn-secondary text-xs" onClick={refresh}>
            <RefreshCw className="mr-1.5 inline h-3 w-3" />
            Check again
          </button>
        </div>

        <HealthChart history={history} />

        {state === "down" && detail ? (
          <pre className="scrollbar-thin mt-4 overflow-auto rounded-xl bg-slate-950 p-3 font-mono text-[11px] leading-relaxed text-rose-100/90">
            {detail}
          </pre>
        ) : null}
      </section>

      {/* What this is */}
      <section className="mt-6 text-sm leading-relaxed text-slate-600">
        <p>
          <span className="font-semibold text-slate-900">LedgeRX Admin</span> is the ops console for
          the ledger engine — a double-entry wallet and loyalty ledger. This Ops view is the
          operations desk; <span className="font-medium text-slate-900">Lab</span> holds demo and
          seed tooling; <span className="font-medium text-slate-900">Docs</span> is the handbook.
        </p>
        <p className="mt-2">
          A transaction walks the flow: <span className="font-medium text-slate-900">1 Door</span>{" "}
          admits, <span className="font-medium text-slate-900">2 Brain</span> scores,{" "}
          <span className="font-medium text-slate-900">3 Accounting</span> posts,{" "}
          <span className="font-medium text-slate-900">5 Tiering</span> promotes — the Configure
          group in the sidebar follows the same numbers, and anything that fails lands in the fail
          queue.
        </p>
      </section>

      {/* Ops — the crucial links, grouped */}
      <section className="mt-6">
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
          Operate
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {OPERATE_LINKS.map((l) => {
            const Icon = l.icon;
            return (
              <Link
                key={l.href}
                href={l.href}
                className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 transition hover:border-emerald-300 hover:shadow-sm"
              >
                <Icon className="h-4 w-4 shrink-0 text-emerald-600" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-slate-900">{l.title}</span>
                  <span className="block truncate text-xs text-slate-500">{l.desc}</span>
                </span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-emerald-500" />
              </Link>
            );
          })}
        </div>

        <div className="mb-2 mt-5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
          Configure · the flow
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          {FLOW_LINKS.map((l) => {
            const Icon = l.icon;
            return (
              <Link
                key={l.href}
                href={l.href}
                className="group flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 transition hover:border-emerald-300 hover:shadow-sm"
              >
                <span className="flex items-center justify-between">
                  <Icon className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span className="rounded bg-slate-100 px-1.5 font-mono text-[10px] leading-4 text-slate-500 ring-1 ring-slate-200">
                    {l.step}
                  </span>
                </span>
                <span>
                  <span className="block text-sm font-semibold text-slate-900">{l.title}</span>
                  <span className="block truncate text-xs text-slate-500">{l.desc}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Lab + Docs */}
      <section className="mt-6 space-y-3 border-t border-slate-100 pt-4">
        {VIEW_LINKS.map((group) => (
          <div key={group.label} className="flex flex-wrap items-center gap-2">
            <span className="w-40 shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              {group.label}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {group.links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200 transition hover:text-emerald-700 hover:ring-emerald-300"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
