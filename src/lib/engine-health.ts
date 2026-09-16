"use client";

import { useCallback, useSyncExternalStore } from "react";

import { engine } from "@/lib/engine";
import { errMsg } from "@/lib/format";

export type EngineHealthState = "checking" | "up" | "down";

/** One completed health probe. */
export type EngineHealthSample = {
  at: number;
  state: "up" | "down";
  /** Round-trip ms of the probe. */
  ms: number;
};

const HISTORY_LIMIT = 10;
const INTERVAL_MS = 15000;

type EngineSnapshot = {
  state: EngineHealthState;
  detail: string;
  history: EngineHealthSample[];
};

// Module-level singleton: ONE poll interval for the whole app (sidebar badge,
// status banner, and the Overview chart all subscribe to the same stream).
let snapshot: EngineSnapshot = { state: "checking", detail: "", history: [] };
const subscribers = new Set<() => void>();
let timer: number | null = null;

async function poll() {
  const started = performance.now();
  let state: "up" | "down";
  let detail = "";
  try {
    await engine.health();
    state = "up";
  } catch (e) {
    state = "down";
    detail = errMsg(e);
  }
  const sample: EngineHealthSample = {
    at: Date.now(),
    state,
    ms: Math.round(performance.now() - started),
  };
  snapshot = {
    state,
    detail,
    history: [...snapshot.history, sample].slice(-HISTORY_LIMIT),
  };
  subscribers.forEach((fn) => fn());
}

function ensurePolling() {
  if (timer !== null) return;
  void poll();
  timer = window.setInterval(() => void poll(), INTERVAL_MS);
}

function subscribe(cb: () => void): () => void {
  subscribers.add(cb);
  ensurePolling();
  return () => {
    subscribers.delete(cb);
  };
}

function getSnapshot(): EngineSnapshot {
  return snapshot;
}

/** Shared poll so sidebar + banner + Overview chart stay in sync. */
export function useEngineHealth() {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const refresh = useCallback(() => void poll(), []);
  return { ...snap, refresh };
}
