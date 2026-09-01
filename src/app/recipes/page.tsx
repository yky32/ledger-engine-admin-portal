"use client";

import Link from "next/link";
import { PageHeader, Card, Badge, Alert } from "@/components/ui/kit";
import { FlowStrip } from "@/components/layout/flow-strip";
import { POSTING_RECIPES, type RecipeAtom } from "@/lib/recipes";

function atomTone(a: RecipeAtom): "ok" | "warn" | "neutral" {
  if (a === "CREDIT_REWARD") return "ok";
  if (a === "REDEEM" || a === "CASHBACK") return "warn";
  return "neutral";
}

export default function RecipesPage() {
  return (
    <div>
      <FlowStrip active="ops" />
      <PageHeader
        title="Posting recipes"
        description="eventType → atoms → ApplyPostingUseCase. Mirrors engine PostingRecipeCatalog (read-only)."
        api={[{ method: "GET", path: "/integrations/use-cases" }]}
      />
      <Alert tone="info">
        Bind Brain COA with the <strong>same code</strong> on{" "}
        <Link href="/coa" className="underline">
          Brain · COA
        </Link>
        . Shoot via{" "}
        <Link href="/transactions-ingest" className="underline">
          Single webhook
        </Link>{" "}
        with matching <code className="text-xs">eventType</code>. Brain rule must match that
        eventType too.
      </Alert>

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="data-table w-full">
          <thead>
            <tr>
              <th>code / eventType</th>
              <th>profile hint</th>
              <th>reward ccy</th>
              <th>atoms</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {POSTING_RECIPES.map((r) => (
              <tr key={r.code}>
                <td className="font-mono text-xs font-semibold text-emerald-800">{r.code}</td>
                <td className="font-mono text-[11px] text-slate-600">{r.profile}</td>
                <td>
                  <Badge>{r.rewardCcy}</Badge>
                </td>
                <td>
                  <div className="flex flex-wrap gap-1">
                    {r.atoms.map((a) => (
                      <Badge key={a} tone={atomTone(a)}>
                        {a}
                      </Badge>
                    ))}
                  </div>
                </td>
                <td className="text-[10px] text-slate-400">{r.note || ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Card title="Atom legend" className="mt-4">
        <ul className="space-y-1 text-sm text-slate-600">
          <li>
            <Badge tone="ok">CREDIT_REWARD</Badge> EARN — member + / PROGRAM −
          </li>
          <li>
            <Badge tone="warn">REDEEM / CASHBACK</Badge> BURN (cashout rail later for cashback)
          </li>
          <li>
            <Badge>CONVERT_HKD_TO_LP</Badge> BURN HKD + EARN LP (1:1)
          </li>
        </ul>
      </Card>
    </div>
  );
}
