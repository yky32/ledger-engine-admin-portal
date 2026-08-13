"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader, Card, Badge, Alert } from "@/components/ui/kit";
import { engine } from "@/lib/engine";
import { errMsg } from "@/lib/format";
import { NAV } from "@/lib/nav";
import {
  ArrowRight,
  CheckCircle2,
  XCircle,
  FlaskConical,
  Search,
  Webhook,
} from "lucide-react";

export default function HomePage() {
  const [engineOk, setEngineOk] = useState<boolean | null>(null);
  const [engineDetail, setEngineDetail] = useState<string>("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await engine.health();
        if (!alive) return;
        setEngineOk(true);
        setEngineDetail(JSON.stringify(r.data).slice(0, 120));
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

  const loyalty = NAV.filter((n) => n.group === "Loyalty");

  return (
    <div>
      <PageHeader
        title="Ledger admin"
        description="Ops / QA console wired to live ledger-engine APIs via /api/ledger rewrite. No auth."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card className="!p-0">
          <div className="p-4">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Engine
            </div>
            <div className="mt-2 flex items-center gap-2">
              {engineOk === null ? (
                <Badge>checking…</Badge>
              ) : engineOk ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <span className="font-semibold text-emerald-800">Reachable</span>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-rose-600" />
                  <span className="font-semibold text-rose-800">Down</span>
                </>
              )}
            </div>
            <p className="mt-2 line-clamp-2 font-mono text-[11px] text-slate-500">
              {engineDetail || "—"}
            </p>
          </div>
        </Card>

        <Card title="Suggested loop">
          <ol className="list-decimal space-y-1.5 pl-4 text-sm text-slate-600">
            <li>
              Start engine <code className="text-xs">mvn spring-boot:run</code> (ddl=create)
            </li>
            <li>
              Open <Link className="text-emerald-700 underline" href="/simulator">Simulator</Link>
            </li>
            <li>
              Paste CUST into{" "}
              <Link className="text-emerald-700 underline" href="/review">Customer review</Link>
            </li>
          </ol>
        </Card>

        <Card title="API law">
          <ul className="space-y-1 text-sm text-slate-600">
            <li>
              Query wallets by <code className="text-xs">ownerId</code>
            </li>
            <li>
              Webhook body <code className="text-xs">ownerId</code>
            </li>
            <li>Pageable lists: page starts at 1</li>
          </ul>
        </Card>
      </div>

      {!engineOk && engineOk !== null ? (
        <div className="mb-6">
          <Alert tone="warn">
            Cannot reach engine. Check <code>LEDGER_ENGINE_URL</code> in{" "}
            <code>.env.local</code> and that Spring is up on :8080.
          </Alert>
        </div>
      ) : null}

      <h2 className="mb-3 text-sm font-semibold text-slate-800">Loyalty desk</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {loyalty.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="card group flex items-start gap-3 p-4 transition hover:border-emerald-300 hover:shadow-md"
            >
              <div className="rounded-xl bg-emerald-50 p-2 text-emerald-700 ring-1 ring-emerald-100">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-slate-900">{item.label}</span>
                  <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:text-emerald-600" />
                </div>
                {item.blurb ? (
                  <p className="mt-0.5 text-xs text-slate-500">{item.blurb}</p>
                ) : null}
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        <Link href="/simulator" className="btn-primary">
          <FlaskConical className="h-4 w-4" /> Run simulator
        </Link>
        <Link href="/review" className="btn-secondary">
          <Search className="h-4 w-4" /> Customer review
        </Link>
        <Link href="/transactions-ingest" className="btn-secondary">
          <Webhook className="h-4 w-4" /> Fire webhook
        </Link>
      </div>
    </div>
  );
}
