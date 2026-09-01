import { ApiError } from "@/lib/api";

export function money(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  const n = typeof v === "number" ? v : Number(v);
  if (Number.isFinite(n)) {
    return n.toLocaleString(undefined, { maximumFractionDigits: 8 });
  }
  return String(v);
}

export function shortId(v: unknown, keep = 8): string {
  const s = String(v ?? "");
  if (s.length <= keep * 2) return s || "—";
  return `${s.slice(0, keep)}…${s.slice(-4)}`;
}

export function errMsg(e: unknown): string {
  if (e instanceof ApiError) {
    const bits = [e.message];
    if (e.code && !e.message.includes(e.code)) bits.push(`(${e.code})`);
    if (e.status && e.status > 0) bits.push(`[HTTP ${e.status}]`);
    return bits.join(" ");
  }
  if (e instanceof Error) {
    if (e.message === "Failed to fetch" || e.name === "TypeError") {
      return "Engine unreachable — start ledger-engine (mvn spring-boot:run) and check LEDGER_ENGINE_URL";
    }
    return e.message;
  }
  return String(e);
}

export function isConflictError(e: unknown): boolean {
  if (e instanceof ApiError) return e.isConflict;
  const m = errMsg(e).toLowerCase();
  return m.includes("0409") || m.includes("already") || m.includes("409") || m.includes("conflict");
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function randomOwnerId(): string {
  const n = Math.floor(10000000 + Math.random() * 89999999);
  return `01A${n}`;
}

/** UAF-style main account: 9089… or 9088… */
export function randomMainAccount(prefix: "9089" | "9088" = "9089"): string {
  const n = Math.floor(10_000_000 + Math.random() * 89_999_999);
  return `${prefix}${n}`;
}

export function randomEventId(prefix = "evt"): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function clsx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
