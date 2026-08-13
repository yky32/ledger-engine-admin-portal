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
  if (e instanceof Error) return e.message;
  return String(e);
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function randomOwnerId(): string {
  const n = Math.floor(10000000 + Math.random() * 89999999);
  return `01A${n}`;
}

export function randomEventId(prefix = "evt"): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function clsx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
