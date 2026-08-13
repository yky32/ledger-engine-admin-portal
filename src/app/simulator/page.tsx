"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader, Card, Badge, JsonBlock, Alert } from "@/components/ui/kit";
import { engine } from "@/lib/engine";
import { errMsg, nowIso, randomEventId, randomOwnerId } from "@/lib/format";

type StepResult = {
  name: string;
  ok: boolean;
  detail?: string;
  data?: unknown;
};

type CaseDef = {
  id: string;
  label: string;
  enabled: boolean;
  build: (ctx: { ownerId: string }) => { name: string; body: Record<string, unknown> };
};

const PRESETS = {
  smoke: "Smoke (onboard + 1 purchase)",
  matrix: "Full matrix",
  hold: "Earn + hold + release",
} as const;

export default function SimulatorPage() {
  const [ownerId, setOwnerId] = useState(randomOwnerId());
  const [name, setName] = useState("Sim customer");
  const [settlement, setSettlement] = useState("HKD");
  const [preset, setPreset] = useState<keyof typeof PRESETS>("matrix");
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<StepResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const cases: CaseDef[] = useMemo(() => {
    const base: CaseDef[] = [
      {
        id: "purchase-hkd",
        label: "PURCHASE HKD 200",
        enabled: true,
        build: ({ ownerId }) => ({
          name: "purchase-hkd",
          body: {
            eventId: randomEventId("p-hkd"),
            ownerId,
            eventType: "PURCHASE",
            amount: 200,
            currency: "HKD",
            occurredAt: nowIso(),
            metadata: { source: "sim" },
          },
        }),
      },
      {
        id: "purchase-usd",
        label: "PURCHASE USD 50",
        enabled: preset === "matrix",
        build: ({ ownerId }) => ({
          name: "purchase-usd",
          body: {
            eventId: randomEventId("p-usd"),
            ownerId,
            eventType: "PURCHASE",
            amount: 50,
            currency: "USD",
            occurredAt: nowIso(),
          },
        }),
      },
      {
        id: "purchase-jpy",
        label: "PURCHASE JPY 5000",
        enabled: preset === "matrix",
        build: ({ ownerId }) => ({
          name: "purchase-jpy",
          body: {
            eventId: randomEventId("p-jpy"),
            ownerId,
            eventType: "PURCHASE",
            amount: 5000,
            currency: "JPY",
            occurredAt: nowIso(),
          },
        }),
      },
      {
        id: "small",
        label: "PURCHASE HKD 1 (min gate)",
        enabled: preset === "matrix",
        build: ({ ownerId }) => ({
          name: "purchase-small",
          body: {
            eventId: randomEventId("p-small"),
            ownerId,
            eventType: "PURCHASE",
            amount: 1,
            currency: "HKD",
            occurredAt: nowIso(),
          },
        }),
      },
      {
        id: "old",
        label: "PURCHASE aged 400d",
        enabled: preset === "matrix",
        build: ({ ownerId }) => ({
          name: "purchase-old",
          body: {
            eventId: randomEventId("p-old"),
            ownerId,
            eventType: "PURCHASE",
            amount: 100,
            currency: "HKD",
            occurredAt: new Date(Date.now() - 400 * 864e5).toISOString(),
          },
        }),
      },
      {
        id: "redeem",
        label: "REDEEM / BURN",
        enabled: preset === "matrix",
        build: ({ ownerId }) => ({
          name: "redeem",
          body: {
            eventId: randomEventId("burn"),
            ownerId,
            eventType: "REDEEM",
            amount: 10,
            currency: "LP",
            occurredAt: nowIso(),
          },
        }),
      },
    ];
    return base;
  }, [preset]);

  const run = async () => {
    setRunning(true);
    setError(null);
    const steps: StepResult[] = [];
    const push = (s: StepResult) => {
      steps.push(s);
      setLog([...steps]);
    };

    try {
      // 1 onboard
      try {
        const w = await engine.onboardWallet({
          ownerId: ownerId.trim(),
          settlementCurrency: settlement,
          name,
          accounts: [{ currency: "LP" }],
        });
        push({ name: "onboard", ok: true, data: w.data });
      } catch (e) {
        // already exists is fine
        const msg = errMsg(e);
        const ok = msg.includes("0409") || msg.toLowerCase().includes("already");
        push({ name: "onboard", ok, detail: msg });
        if (!ok) throw e;
      }

      // 2 webhook matrix
      const enabled = cases.filter((c) => c.enabled || preset === "smoke");
      const toRun =
        preset === "smoke"
          ? cases.filter((c) => c.id === "purchase-hkd")
          : enabled;

      let firstEventId: string | undefined;

      for (const c of toRun) {
        const { name: n, body } = c.build({ ownerId: ownerId.trim() });
        if (!firstEventId && typeof body.eventId === "string") firstEventId = body.eventId;
        try {
          const r = await engine.webhookTxn(body);
          push({ name: n, ok: true, data: r.data, detail: String((r.data as { status?: string })?.status || "") });
        } catch (e) {
          push({ name: n, ok: false, detail: errMsg(e) });
        }
      }

      // dupe
      if (preset === "matrix" && firstEventId) {
        try {
          const r = await engine.webhookTxn({
            eventId: firstEventId,
            ownerId: ownerId.trim(),
            eventType: "PURCHASE",
            amount: 200,
            currency: "HKD",
            occurredAt: nowIso(),
          });
          push({ name: "duplicate-event", ok: true, data: r.data });
        } catch (e) {
          push({ name: "duplicate-event", ok: false, detail: errMsg(e) });
        }
      }

      // hold path
      if (preset === "hold" || preset === "matrix") {
        try {
          const h = await engine.hold({
            ownerId: ownerId.trim(),
            currency: "LP",
            amount: 1,
            description: "sim-hold",
          });
          push({ name: "hold-lp-1", ok: true, data: h.data });
          const rel = await engine.release({
            ownerId: ownerId.trim(),
            currency: "LP",
            amount: 1,
            description: "sim-release",
          });
          push({ name: "release-lp-1", ok: true, data: rel.data });
        } catch (e) {
          push({ name: "hold/release", ok: false, detail: errMsg(e) });
        }
      }

      // final wallet snapshot
      try {
        const w = await engine.getWallet(ownerId.trim());
        push({ name: "wallet-snapshot", ok: true, data: w.data });
      } catch (e) {
        push({ name: "wallet-snapshot", ok: false, detail: errMsg(e) });
      }
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setRunning(false);
    }
  };

  const passed = log.filter((l) => l.ok).length;
  const failed = log.filter((l) => !l.ok).length;

  return (
    <div>
      <PageHeader
        title="Txn simulator"
        description="Configurable multi-step suite against live APIs (onboard → webhooks → hold → snapshot)."
        actions={
          ownerId ? (
            <Link
              href={`/review`}
              className="btn-secondary text-xs"
              onClick={() => {
                try {
                  sessionStorage.setItem("review.ownerId", ownerId);
                } catch {
                  /* ignore */
                }
              }}
            >
              Review {ownerId}
            </Link>
          ) : null
        }
      />

      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <Card title="Subject" className="lg:col-span-1">
          <div className="space-y-3">
            <label className="field">
              <span className="field-label">ownerId</span>
              <div className="flex gap-2">
                <input
                  className="field-input font-mono"
                  value={ownerId}
                  onChange={(e) => setOwnerId(e.target.value)}
                />
                <button
                  type="button"
                  className="btn-secondary shrink-0"
                  onClick={() => setOwnerId(randomOwnerId())}
                >
                  New
                </button>
              </div>
            </label>
            <label className="field">
              <span className="field-label">name</span>
              <input className="field-input" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="field">
              <span className="field-label">settlementCurrency</span>
              <select
                className="field-select"
                value={settlement}
                onChange={(e) => setSettlement(e.target.value)}
              >
                {["HKD", "USD", "CNY", "JPY"].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">preset</span>
              <select
                className="field-select"
                value={preset}
                onChange={(e) => setPreset(e.target.value as keyof typeof PRESETS)}
              >
                {Object.entries(PRESETS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="btn-primary w-full"
              disabled={running || !ownerId.trim()}
              onClick={run}
            >
              {running ? "Running…" : "Run suite"}
            </button>
            {error ? <Alert tone="error">{error}</Alert> : null}
          </div>
        </Card>

        <Card
          title="Progress"
          description={log.length ? `${passed} ok · ${failed} fail` : "Idle"}
          className="lg:col-span-2"
        >
          {log.length === 0 ? (
            <p className="text-sm text-slate-500">Run suite to stream step results.</p>
          ) : (
            <ul className="space-y-2">
              {log.map((s, i) => (
                <li
                  key={`${s.name}-${i}`}
                  className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge tone={s.ok ? "ok" : "error"}>{s.ok ? "OK" : "FAIL"}</Badge>
                      <span className="text-sm font-medium text-slate-800">{s.name}</span>
                    </div>
                    {s.detail ? (
                      <p className="mt-1 truncate font-mono text-[11px] text-slate-500">
                        {s.detail}
                      </p>
                    ) : null}
                  </div>
                  {s.data ? (
                    <details className="shrink-0">
                      <summary className="cursor-pointer text-xs text-emerald-700">json</summary>
                      <div className="mt-1 w-72">
                        <JsonBlock value={s.data} maxHeight={160} />
                      </div>
                    </details>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          {log.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/review"
                className="btn-secondary text-xs"
                onClick={() => {
                  try {
                    sessionStorage.setItem("review.ownerId", ownerId);
                  } catch {
                    /* */
                  }
                }}
              >
                Open customer review →
              </Link>
              <button
                type="button"
                className="btn-ghost text-xs"
                onClick={() => {
                  const blob = new Blob([JSON.stringify(log, null, 2)], {
                    type: "application/json",
                  });
                  const a = document.createElement("a");
                  a.href = URL.createObjectURL(blob);
                  a.download = `sim-${ownerId}.json`;
                  a.click();
                }}
              >
                Export log
              </button>
            </div>
          ) : null}
        </Card>
      </div>

      <Card title="Cases in this preset">
        <ul className="grid gap-2 sm:grid-cols-2">
          {(preset === "smoke"
            ? cases.filter((c) => c.id === "purchase-hkd")
            : cases.filter((c) => c.enabled || preset === "hold")
          ).map((c) => (
            <li
              key={c.id}
              className="rounded-lg border border-slate-100 bg-white px-3 py-2 text-sm text-slate-700"
            >
              {c.label}
            </li>
          ))}
          {preset !== "smoke" ? (
            <li className="rounded-lg border border-slate-100 bg-white px-3 py-2 text-sm text-slate-700">
              duplicate first eventId
            </li>
          ) : null}
          {preset !== "smoke" ? (
            <li className="rounded-lg border border-slate-100 bg-white px-3 py-2 text-sm text-slate-700">
              HOLD / RELEASE LP 1
            </li>
          ) : null}
        </ul>
      </Card>
    </div>
  );
}
