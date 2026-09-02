"use client";

import { useEffect, useState } from "react";
import { engine } from "@/lib/engine";
import { errMsg } from "@/lib/format";

export type EngineHealthState = "checking" | "up" | "down";

/** Shared poll so sidebar + banner stay in sync. */
export function useEngineHealth(intervalMs = 15000) {
  const [state, setState] = useState<EngineHealthState>("checking");
  const [detail, setDetail] = useState("");

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        await engine.health();
        if (!alive) return;
        setState("up");
        setDetail("");
      } catch (e) {
        if (!alive) return;
        setState("down");
        setDetail(errMsg(e));
      }
    };
    void tick();
    const id = window.setInterval(() => void tick(), intervalMs);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [intervalMs]);

  return { state, detail, online: state === "up" };
}
