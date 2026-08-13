"use client";

import { useEffect, useState } from "react";
import { engine } from "@/lib/engine";
import { errMsg } from "@/lib/format";
import { Alert } from "@/components/ui/kit";

/** Soft banner — engine down / URL misconfigured (shows on pages that need API). */
export function EngineStatusBanner() {
  const [state, setState] = useState<"checking" | "up" | "down">("checking");
  const [detail, setDetail] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await engine.health();
        if (!alive) return;
        setState("up");
      } catch (e) {
        if (!alive) return;
        setState("down");
        setDetail(errMsg(e));
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

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
