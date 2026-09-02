"use client";

import { Alert } from "@/components/ui/kit";
import { useEngineHealth } from "@/lib/engine-health";

/** Soft banner — engine down / URL misconfigured (shows on pages that need API). */
export function EngineStatusBanner() {
  const { state, detail } = useEngineHealth();

  if (state !== "down") return null;

  return (
    <div className="mb-4">
      <Alert tone="warn">
        <strong>LedgeRX engine offline.</strong> {detail || "Cannot reach API."}
        <div className="mt-1 font-mono text-[11px] opacity-80">
          cd ledger-engine && mvn spring-boot:run
          <br />
          Admin .env.local → LEDGER_ENGINE_URL=http://localhost:8080
        </div>
      </Alert>
    </div>
  );
}
