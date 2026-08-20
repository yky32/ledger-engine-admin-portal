"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PageHeader, Card, Badge, Alert, JsonBlock } from "@/components/ui/kit";
import { ActionBar } from "@/components/ui/action";
import { FlowStrip } from "@/components/layout/flow-strip";
import { engine } from "@/lib/engine";
import { errMsg, nowIso, randomEventId, randomOwnerId } from "@/lib/format";
import type { DigestionRule, IngestResult, WalletView } from "@/lib/types";
import {
  CheckCircle2,
  Circle,
  ArrowRight,
  FlaskConical,
  BookOpen,
  Brain,
  DoorOpen,
  Wallet,
  Search,
} from "lucide-react";

/** Guided demo: grocery HKD 500 · MCC 5411 · RATE 1% → 5 LP */
const DEMO_RULE_CODE = "DEMO_GROCERY_1PCT";

export default function DemoPage() {
  const [ownerId, setOwnerId] = useState("");
  const [doorOk, setDoorOk] = useState<boolean | null>(null);
  const [ruleOk, setRuleOk] = useState<boolean | null>(null);
  const [ruleDetail, setRuleDetail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [dry, setDry] = useState<IngestResult | null>(null);
  const [live, setLive] = useState<IngestResult | null>(null);
  const [wallet, setWallet] = useState<WalletView | null>(null);

  useEffect(() => {
    try {
      const s = sessionStorage.getItem("review.ownerId");
      setOwnerId(s || randomOwnerId());
    } catch {
      setOwnerId(randomOwnerId());
    }
  }, []);

  const refreshPrereqs = useCallback(async () => {
    setError(null);
    try {
      const door = await engine.ingestPolicyGet();
      const p = door.data as { isEnabled?: boolean };
      setDoorOk(p?.isEnabled !== false);
    } catch (e) {
      setDoorOk(false);
      setError(errMsg(e));
    }
    try {
      const r = await engine.digestionRules({ code: DEMO_RULE_CODE });
      const data = r.data;
      const list = Array.isArray(data) ? data : data ? [data] : [];
      const hit = (list as DigestionRule[]).find(
        (x) => (x.code || "").toUpperCase() === DEMO_RULE_CODE,
      );
      if (hit) {
        setRuleOk(!!hit.isEnabled);
        setRuleDetail(
          `${hit.code} · ${hit.operation || "EARN"} · ${JSON.stringify(hit.formula ?? {})}`,
        );
      } else {
        setRuleOk(false);
        setRuleDetail("missing — click Ensure demo rule");
      }
    } catch {
      setRuleOk(false);
      setRuleDetail("could not list rules");
    }
  }, []);

  useEffect(() => {
    void refreshPrereqs();
  }, [refreshPrereqs]);

  const ensureDoor = async () => {
    setBusy(true);
    setError(null);
    try {
      await engine.ingestPolicyPut({
        isEnabled: true,
        isAutoCreateWallet: true,
        autoWalletSettlementCurrency: "HKD",
        autoWalletEnsureCurrency: "LP",
        autoWalletNamePrefix: "Demo ",
      });
      setOk("Door open · auto-wallet HKD+LP");
      await refreshPrereqs();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const ensureRule = async () => {
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const r = await engine.digestionRules({ code: DEMO_RULE_CODE });
      const data = r.data;
      const list = Array.isArray(data) ? data : data ? [data] : [];
      const hit = (list as DigestionRule[]).find(
        (x) => (x.code || "").toUpperCase() === DEMO_RULE_CODE,
      );
      const body = {
        code: DEMO_RULE_CODE,
        name: "Demo grocery 1% (MCC 5411)",
        priority: 10,
        isEnabled: true,
        eventType: "PURCHASE",
        minAmount: 1,
        eligibleCurrencies: ["HKD"],
        eligibleMccs: ["5411"],
        maxAgeDays: 30,
        pointCurrency: "LP",
        operation: "EARN",
        formula: { type: "RATE" as const, rate: 0.01 },
      };
      if (hit?.id) {
        await engine.digestionUpdate(hit.id, body);
        if (!hit.isEnabled) await engine.digestionEnable(hit.id);
        setOk(`Updated rule ${DEMO_RULE_CODE}`);
      } else {
        await engine.digestionCreate(body);
        setOk(`Created rule ${DEMO_RULE_CODE}`);
      }
      await refreshPrereqs();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const eventBody = () => ({
    eventId: randomEventId(),
    ownerId: ownerId.trim(),
    eventType: "PURCHASE",
    amount: 500,
    currency: "HKD",
    occurredAt: nowIso(),
    metadata: {
      source: "admin-demo",
      mcc: "5411",
      merchantName: "Demo Supermarket",
    },
  });

  const runDry = async () => {
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const r = await engine.webhookTxnDryRun(eventBody());
      setDry(r.data as IngestResult);
      setOk("Dry-run done — no books posted");
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const runLive = async () => {
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      try {
        sessionStorage.setItem("review.ownerId", ownerId.trim());
      } catch {
        /* */
      }
      const r = await engine.webhookTxn(eventBody());
      setLive(r.data as IngestResult);
      const w = await engine.getWallet(ownerId.trim());
      setWallet(w.data as WalletView);
      setOk("Live earn posted — check Review for LP balance");
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const lpLine = (() => {
    const accts = wallet?.accounts || [];
    const lp = accts.find((a) => String(a.currency || "").toUpperCase() === "LP");
    if (!lp) return null;
    return String(lp.availableBalance ?? lp.ledgerBalance ?? "—");
  })();

  return (
    <div>
      <FlowStrip active="shoot" />
      <PageHeader
        title="Demo · Earn 5 LP"
        description="HKD 500 grocery (MCC 5411) · Brain RATE 1% · same path as briefing appendix."
        actions={
          <Link href="/review" className="btn-secondary text-xs">
            <Search className="h-3.5 w-3.5" />
            Open Review
          </Link>
        }
      />

      <div className="mb-4">
        <Alert tone="info">
          Math: 500 × 0.01 = <strong>5 LP</strong> when rule{" "}
          <code className="text-xs">{DEMO_RULE_CODE}</code> is enabled and Door is
          open. Dry-run first, then Live.
        </Alert>
      </div>

      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/ingest-policies" className="btn-secondary justify-start text-xs">
          <DoorOpen className="h-4 w-4 text-emerald-600" />
          Door
        </Link>
        <Link href="/digestion-rules" className="btn-secondary justify-start text-xs">
          <Brain className="h-4 w-4 text-violet-600" />
          Brain
        </Link>
        <Link href="/coa" className="btn-secondary justify-start text-xs">
          <BookOpen className="h-4 w-4 text-amber-600" />
          COA
        </Link>
        <Link href="/wallets" className="btn-secondary justify-start text-xs">
          <Wallet className="h-4 w-4 text-sky-600" />
          Wallets
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <Card title={`01 · Door ${doorOk ? "✓" : ""}`}>
            <div className="mb-2 flex items-center gap-2 text-sm text-slate-600">
              {doorOk ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ) : (
                <Circle className="h-4 w-4 text-slate-400" />
              )}
              {doorOk === null
                ? "Checking…"
                : doorOk
                  ? "Ingest enabled"
                  : "Door closed or unreachable"}
            </div>
            <button
              type="button"
              className="btn-secondary text-xs"
              disabled={busy}
              onClick={() => void ensureDoor()}
            >
              Ensure Door (enable + auto-wallet)
            </button>
          </Card>

          <Card title={`02 · Brain demo rule ${ruleOk ? "✓" : ""}`}>
            <p className="mb-1 font-mono text-xs text-slate-500">{ruleDetail || "—"}</p>
            <p className="mb-2 text-sm text-slate-600">
              PURCHASE · HKD · MCC 5411 · RATE 0.01 · EARN
            </p>
            <button
              type="button"
              className="btn-secondary text-xs"
              disabled={busy}
              onClick={() => void ensureRule()}
            >
              Ensure demo rule
            </button>
          </Card>

          <Card title="03 · Member ownerId">
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
                  className="btn-secondary"
                  onClick={() => setOwnerId(randomOwnerId())}
                >
                  Gen
                </button>
              </div>
            </label>
            <p className="mt-2 text-xs text-slate-500">
              Auto-wallet opens HKD + LP on first live earn if Door allows.
            </p>
          </Card>
        </div>

        <div className="space-y-4">
          <Card title={`04 · Dry-run ${dry ? "✓" : ""}`}>
            <p className="mb-2 text-sm text-slate-600">
              Expect points ≈ 5 · matchedRule {DEMO_RULE_CODE}
            </p>
            <button
              type="button"
              className="btn-secondary"
              disabled={busy || !ownerId.trim()}
              onClick={() => void runDry()}
            >
              <FlaskConical className="h-4 w-4" />
              Dry-run PURCHASE 500 HKD
            </button>
            {dry ? (
              <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <dt className="text-slate-500">status</dt>
                <dd>
                  <Badge tone={dry.status === "SKIPPED" ? "warn" : "ok"}>
                    {dry.status}
                    {dry.dryRun ? " · dry" : ""}
                  </Badge>
                </dd>
                <dt className="text-slate-500">points</dt>
                <dd className="text-lg font-bold text-emerald-700">{dry.points ?? "—"}</dd>
                <dt className="text-slate-500">rule</dt>
                <dd className="font-mono text-xs">{dry.matchedRuleCode || "—"}</dd>
                <dt className="text-slate-500">reason</dt>
                <dd className="text-xs">{dry.reason || "—"}</dd>
              </dl>
            ) : null}
          </Card>

          <Card title={`05 · Live earn ${live && live.status !== "SKIPPED" ? "✓" : ""}`}>
            <p className="mb-2 text-sm text-slate-600">
              Posts DE legs · PROGRAM ↔ member LP
            </p>
            <button
              type="button"
              className="btn-primary"
              disabled={busy || !ownerId.trim()}
              onClick={() => void runLive()}
            >
              Send live earn
              <ArrowRight className="h-4 w-4" />
            </button>
            {live ? (
              <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <dt className="text-slate-500">status</dt>
                <dd>
                  <Badge tone={live.status === "SKIPPED" ? "warn" : "ok"}>{live.status}</Badge>
                </dd>
                <dt className="text-slate-500">points</dt>
                <dd className="text-lg font-bold text-emerald-700">{live.points ?? "—"}</dd>
                <dt className="text-slate-500">rule</dt>
                <dd className="font-mono text-xs">{live.matchedRuleCode || "—"}</dd>
              </dl>
            ) : null}
            {lpLine ? (
              <p className="mt-2 text-lg font-semibold text-emerald-700">
                LP available ≈ {lpLine}
              </p>
            ) : null}
            {wallet ? (
              <div className="mt-3">
                <Link
                  href="/review"
                  className="text-sm font-medium text-emerald-700 underline"
                >
                  Open Review for {ownerId}
                </Link>
              </div>
            ) : null}
          </Card>
        </div>
      </div>

      <div className="mt-4">
        <ActionBar loading={busy} error={error} ok={ok}>
          <button
            type="button"
            className="btn-secondary text-xs"
            disabled={busy}
            onClick={() => void refreshPrereqs()}
          >
            Refresh status
          </button>
        </ActionBar>
      </div>

      {dry || live ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {dry ? (
            <Card title="Dry-run JSON">
              <JsonBlock value={dry} />
            </Card>
          ) : null}
          {live ? (
            <Card title="Live JSON">
              <JsonBlock value={live} />
            </Card>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
