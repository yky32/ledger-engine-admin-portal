"use client";

import Link from "next/link";
import { ArrowDown, ArrowRight } from "lucide-react";
import { Badge, Card } from "@/components/ui/kit";
import {
  CAP_STATUS_LABEL,
  REWARD_LANES,
  type CapStatus,
} from "@/lib/capability";

function StatusChip({ status }: { status: CapStatus }) {
  const tone =
    status === "live" ? "ok" : status === "partial" ? "info" : status === "named" ? "warn" : "neutral";
  return <Badge tone={tone}>{CAP_STATUS_LABEL[status]}</Badge>;
}

function LaneCard({
  title,
  items,
}: {
  title: string;
  items: (typeof REWARD_LANES)[number]["items"];
}) {
  return (
    <div className="rounded-2xl border border-sky-200/80 bg-white p-3 shadow-sm">
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      <ul className="space-y-1.5">
        {items.map((it) => {
          const inner = (
            <>
              <div className="flex items-start justify-between gap-2">
                <span className="text-[13px] font-medium text-slate-800">{it.slide}</span>
                <StatusChip status={it.status} />
              </div>
              <div className="mt-0.5 text-[11px] text-slate-500">{it.engine}</div>
            </>
          );
          return (
            <li key={it.slide}>
              {it.href ? (
                <Link
                  href={it.href}
                  className="block rounded-lg px-1.5 py-1 -mx-1.5 hover:bg-sky-50"
                >
                  {inner}
                </Link>
              ) : (
                <div className="px-1.5 py-1 -mx-1.5">{inner}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Full statement: we are the Reward System row on the UAF architecture. */
export function CapabilityStatement() {
  const lanes = REWARD_LANES.filter((l) => l.id !== "ingest");
  const ingest = REWARD_LANES.find((l) => l.id === "ingest")!;

  return (
    <div className="space-y-4">
      <AlertScope />

      <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Not us · product</p>
        <p className="mt-1 text-sm text-slate-600">
          Credit Card Experience APIs · Loan Reward · E6 / card partner. They send{" "}
          <code className="text-xs">CC_TXN</code> / <code className="text-xs">LN_TXN</code>.
        </p>
      </div>

      <div className="flex justify-center text-slate-400">
        <div className="flex flex-col items-center gap-0.5 text-[11px]">
          <ArrowDown className="h-4 w-4 text-emerald-500" />
          <span>
            {ingest.items[0].slide} · {ingest.items[0].engine}
          </span>
        </div>
      </div>

      <div className="rounded-2xl border-2 border-sky-300 bg-sky-50/40 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-sky-950">Reward System · LedgeRX</h2>
            <p className="text-[11px] text-sky-800/80">This row on the UAF architecture</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <StatusChip status="live" />
            <StatusChip status="partial" />
            <StatusChip status="named" />
            <StatusChip status="slide" />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {lanes.map((lane) => (
            <LaneCard key={lane.id} title={lane.title} items={lane.items} />
          ))}
        </div>
      </div>

      <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          Not us · sibling
        </p>
        <p className="mt-1 text-sm text-slate-600">
          Digital Coupon System (catalog, issuance, COD / YUU / Mannings). Stays outside this engine.
        </p>
      </div>

      <Card title="Slide box → LedgeRX" description="Same list as the architecture row">
        <div className="table-wrap">
          <table className="data-table text-xs">
            <thead>
              <tr>
                <th>Slide</th>
                <th>LedgeRX</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {REWARD_LANES.flatMap((lane) =>
                lane.items.map((it) => (
                  <tr key={`${lane.id}-${it.slide}`}>
                    <td className="whitespace-nowrap font-medium">{it.slide}</td>
                    <td>
                      {it.href ? (
                        <Link href={it.href} className="text-emerald-700 hover:underline">
                          {it.engine}
                        </Link>
                      ) : (
                        it.engine
                      )}
                    </td>
                    <td>
                      <StatusChip status={it.status} />
                    </td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[11px] text-slate-500">
          Named = on the slide / API token, not booked yet. Slide only = box on the architecture, no engine
          surface.
        </p>
      </Card>
    </div>
  );
}

function AlertScope() {
  return (
    <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2.5 text-sm text-sky-950">
      LedgeRX is the <strong>Reward System</strong> row. Upstream is CC / Loan via Kafka or REST. Coupon
      catalog and redemption are a sibling system.
    </div>
  );
}

/** Compact Home teaser. */
export function CapabilityTeaser() {
  const lanes = REWARD_LANES.filter((l) => l.id !== "ingest");
  return (
    <Card
      className="mb-6"
      title="UAF Reward System"
      description="We are this row. CC / Loan send events. Coupon is a sibling."
      right={
        <Link href="/capability" className="btn-secondary text-xs">
          Capability statement
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      }
    >
      <div className="flex flex-wrap gap-2">
        {lanes.map((lane) => {
          const live = lane.items.filter((i) => i.status === "live").length;
          return (
            <span
              key={lane.id}
              className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-medium text-sky-900 ring-1 ring-sky-200"
            >
              {lane.title}
              <span className="font-mono text-sky-700">
                {live}/{lane.items.length}
              </span>
            </span>
          );
        })}
      </div>
    </Card>
  );
}
