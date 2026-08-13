"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader, Card, Badge, Alert } from "@/components/ui/kit";
import { engine } from "@/lib/engine";
import { errMsg, clsx } from "@/lib/format";
import {
  ArrowDown,
  ArrowRight,
  CheckCircle2,
  XCircle,
  DoorOpen,
  Brain,
  BookOpen,
  ScrollText,
  FlaskConical,
  Webhook,
  Search,
  AlertTriangle,
  ListTree,
  Wallet,
} from "lucide-react";

/**
 * Home = interactive SYSTEM_BUSINESS_FLOW §3 end-to-end picture.
 */
export default function HomePage() {
  const [engineOk, setEngineOk] = useState<boolean | null>(null);
  const [engineDetail, setEngineDetail] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await engine.health();
        if (!alive) return;
        setEngineOk(true);
        setEngineDetail(JSON.stringify(r.data).slice(0, 100));
      } catch (e) {
        if (!alive) return;
        setEngineOk(false);
        setEngineDetail(errMsg(e));
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div>
      <PageHeader
        title="End-to-end business picture"
        description="Layout follows ledger-engine docs/SYSTEM_BUSINESS_FLOW.md — configure → shoot → digest → books."
        actions={
          <div className="flex items-center gap-2 text-xs">
            {engineOk === null ? (
              <Badge>engine…</Badge>
            ) : engineOk ? (
              <Badge tone="ok">
                <CheckCircle2 className="mr-1 inline h-3 w-3" />
                engine up
              </Badge>
            ) : (
              <Badge tone="error">
                <XCircle className="mr-1 inline h-3 w-3" />
                engine down
              </Badge>
            )}
          </div>
        }
      />

      {!engineOk && engineOk !== null ? (
        <div className="mb-4">
          <Alert tone="warn">
            Engine unreachable ({engineDetail}). Start{" "}
            <code className="text-xs">mvn spring-boot:run</code> · check{" "}
            <code className="text-xs">LEDGER_ENGINE_URL</code>.
          </Alert>
        </div>
      ) : null}

      {/* ── Flow canvas ── */}
      <div className="mb-8 space-y-3">
        {/* Ops config on top */}
        <div className="flex justify-center">
          <FlowBox
            tone="ops"
            title="Ops configures once"
            subtitle="runtime DB · no restart"
            href="/ingest-policy"
          >
            <ul className="mt-2 space-y-1.5 text-sm">
              <li>
                <Link className="flow-link" href="/ingest-policy">
                  <DoorOpen className="h-3.5 w-3.5" />
                  Ingest policy <span className="text-slate-400">(door)</span>
                </Link>
              </li>
              <li>
                <Link className="flow-link" href="/digestion-rules">
                  <Brain className="h-3.5 w-3.5" />
                  Digestion rules <span className="text-slate-400">(brain)</span>
                </Link>
              </li>
              <li>
                <Link className="flow-link" href="/wallets">
                  <Wallet className="h-3.5 w-3.5" />
                  Wallet onboard (optional CRM)
                </Link>
              </li>
            </ul>
          </FlowBox>
        </div>

        <div className="flex justify-center text-slate-400">
          <div className="flex flex-col items-center text-[11px]">
            <ArrowDown className="h-4 w-4" />
            runtime DB
          </div>
        </div>

        {/* Middle row: upstream → engine */}
        <div className="grid items-stretch gap-3 lg:grid-cols-[minmax(0,0.9fr)_auto_minmax(0,1.4fr)]">
          <FlowBox
            tone="shoot"
            title="Upstream POS / OMS"
            subtitle="you are the upstream"
            href="/simulator"
          >
            <p className="mt-2 text-xs text-slate-500">
              Sends commerce / loyalty <strong>event JSON</strong> over webhook.
            </p>
            <div className="mt-3 flex flex-col gap-2">
              <Link href="/simulator" className="btn-primary w-full justify-center text-xs">
                <FlaskConical className="h-3.5 w-3.5" />
                1 · Simulator shoot matrix
              </Link>
              <Link href="/transactions-ingest" className="btn-secondary w-full justify-center text-xs">
                <Webhook className="h-3.5 w-3.5" />
                Single webhook fire
              </Link>
            </div>
          </FlowBox>

          <div className="hidden flex-col items-center justify-center gap-1 text-[11px] text-slate-400 lg:flex">
            <span>webhook</span>
            <ArrowRight className="h-5 w-5 text-emerald-500" />
            <span>event JSON</span>
          </div>
          <div className="flex justify-center text-slate-400 lg:hidden">
            <div className="flex flex-col items-center text-[11px]">
              <ArrowDown className="h-4 w-4 text-emerald-500" />
              webhook event JSON
            </div>
          </div>

          <FlowBox
            tone="engine"
            title="LEDGER ENGINE"
            subtitle="Door → Brain → Books → Audit"
            href="/review"
            wide
          >
            <ol className="mt-3 space-y-2">
              <EngineStep
                n="1"
                icon={DoorOpen}
                title="Door — accept event? auto-wallet?"
                href="/ingest-policy"
                note="Ingest policy"
              />
              <EngineStep
                n="2"
                icon={Brain}
                title="Brain — match rule + score points"
                href="/digestion-rules"
                note="Digestion rules"
              />
              <EngineStep
                n="3"
                icon={BookOpen}
                title="Books — double-entry on LP (+ HKD)"
                href="/ledger-entries"
                note="PROGRAM pool ↔ customer"
              />
              <EngineStep
                n="4"
                icon={ScrollText}
                title="Audit — legs + movement history"
                href="/movements"
                note="Query / review"
              />
            </ol>
          </FlowBox>
        </div>

        <div className="flex justify-center text-slate-400">
          <ArrowDown className="h-4 w-4" />
        </div>

        {/* Outcomes */}
        <div className="grid gap-3 sm:grid-cols-3">
          <OutcomeCard
            title="Customer LP balance ↑/↓"
            desc="Wallet books after earn/burn. Hold locks available only."
            href="/review"
            icon={Search}
            cta="Customer review"
          />
          <OutcomeCard
            title="PROGRAM pool counterparty"
            desc="True double-entry: DR/CR vs system PROGRAM LP pool."
            href="/ledger-entries"
            icon={ListTree}
            cta="View DE legs"
          />
          <OutcomeCard
            title="Fail queue (ops replay)"
            desc="Ingest failures stored for review / replay — no silent drop."
            href="/failed-transactions"
            icon={AlertTriangle}
            cta="Fail desk"
            warn
          />
        </div>
      </div>

      {/* Two concepts */}
      <h2 className="mb-3 text-sm font-semibold text-slate-800">
        Two configuration concepts (important)
      </h2>
      <div className="mb-8 grid gap-3 md:grid-cols-2">
        <Card title="Ingest policy = Door">
          <p className="text-sm text-slate-600">
            Business question: <em>“Do we accept webhooks at all? Create wallet if missing?”</em>
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-slate-500">
            <li>~1 global policy</li>
            <li>Kill-switch + auto-wallet settlement/LP</li>
            <li>API <code>GET/PUT /ingest-policy</code></li>
          </ul>
          <Link href="/ingest-policy" className="btn-secondary mt-3 text-xs">
            Open door config
          </Link>
        </Card>
        <Card title="Digestion rules = Brain">
          <p className="text-sm text-slate-600">
            Business question: <em>“Which events earn/burn, and how many points?”</em>
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-slate-500">
            <li>Many rules by eventType / priority</li>
            <li>Formula e.g. RATE:0.01 · FIXED:100 · AMOUNT</li>
            <li>API <code>/digestion-rules</code></li>
          </ul>
          <Link href="/digestion-rules" className="btn-secondary mt-3 text-xs">
            Open brain config
          </Link>
        </Card>
      </div>

      {/* Recommended path */}
      <Card title="Recommended understand path" description="Same order as the diagram">
        <ol className="space-y-3">
          {[
            {
              n: "1",
              t: "Ops configures",
              d: "Turn door on + seed PURCHASE earn rule (or let simulator seed).",
              href: "/ingest-policy",
              cta: "Door + Brain",
            },
            {
              n: "2",
              t: "Simulator shoots transactions",
              d: "Act as POS/OMS — multi-dimension event matrix into webhook.",
              href: "/simulator",
              cta: "Open simulator",
            },
            {
              n: "3",
              t: "See how engine digests",
              d: "Customer review: status EARNED/SKIPPED, movements, fail queue.",
              href: "/review",
              cta: "Customer review",
            },
            {
              n: "4",
              t: "Inspect booking (double-entry)",
              d: "Legs by eventId/movementId — PROGRAM pool vs customer LP.",
              href: "/ledger-entries",
              cta: "DE legs",
            },
          ].map((s) => (
            <li
              key={s.n}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-3"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
                {s.n}
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-slate-900">{s.t}</div>
                <p className="text-xs text-slate-500">{s.d}</p>
              </div>
              <Link href={s.href} className="btn-primary text-xs">
                {s.cta}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </li>
          ))}
        </ol>
      </Card>

      <p className="mt-6 text-center text-[11px] text-slate-400">
        Source of truth: <code>ledger-engine/docs/SYSTEM_BUSINESS_FLOW.md</code>
        {engineDetail ? ` · health ${engineDetail.slice(0, 40)}…` : null}
      </p>
    </div>
  );
}

function FlowBox({
  title,
  subtitle,
  children,
  tone,
  href,
  wide,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  tone: "ops" | "shoot" | "engine";
  href?: string;
  wide?: boolean;
}) {
  const ring = {
    ops: "border-violet-200 bg-violet-50/40",
    shoot: "border-sky-200 bg-sky-50/40",
    engine: "border-emerald-200 bg-emerald-50/30",
  }[tone];
  const head = {
    ops: "text-violet-900",
    shoot: "text-sky-900",
    engine: "text-emerald-950",
  }[tone];

  return (
    <div
      className={clsx(
        "rounded-2xl border-2 p-4 shadow-sm",
        ring,
        wide && "min-h-full",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className={clsx("text-sm font-semibold tracking-tight", head)}>{title}</h3>
          {subtitle ? (
            <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">
              {subtitle}
            </p>
          ) : null}
        </div>
        {href ? (
          <Link href={href} className="text-[11px] text-emerald-700 hover:underline">
            open
          </Link>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function EngineStep({
  n,
  icon: Icon,
  title,
  href,
  note,
}: {
  n: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  href: string;
  note: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-start gap-2.5 rounded-xl border border-emerald-100/80 bg-white/80 px-2.5 py-2 transition hover:border-emerald-300 hover:shadow-sm"
    >
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald-600 text-[11px] font-bold text-white">
        {n}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-[13px] font-medium text-slate-800">
          <Icon className="h-3.5 w-3.5 text-emerald-600" />
          {title}
        </div>
        <div className="text-[11px] text-slate-400">{note}</div>
      </div>
      <ArrowRight className="mt-1 h-3.5 w-3.5 shrink-0 text-slate-300" />
    </Link>
  );
}

function OutcomeCard({
  title,
  desc,
  href,
  icon: Icon,
  cta,
  warn,
}: {
  title: string;
  desc: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  cta: string;
  warn?: boolean;
}) {
  return (
    <div
      className={clsx(
        "rounded-2xl border bg-white p-4 shadow-sm",
        warn ? "border-amber-200" : "border-slate-200",
      )}
    >
      <div
        className={clsx(
          "mb-2 inline-flex rounded-lg p-2",
          warn ? "bg-amber-50 text-amber-700" : "bg-slate-50 text-slate-700",
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">{desc}</p>
      <Link href={href} className="btn-secondary mt-3 w-full justify-center text-xs">
        {cta}
      </Link>
    </div>
  );
}
