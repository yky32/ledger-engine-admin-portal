import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

/** Unwrap ledger-engine `Result` envelope `{ code, data, pagination }`. */
export function unwrapData(payload: unknown): unknown {
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as { data: unknown }).data;
  }
  return payload;
}

export function asArray<T = unknown>(data: unknown): T[] {
  const u = unwrapData(data);
  if (Array.isArray(u)) return u as T[];
  if (u && typeof u === "object") {
    const o = u as Record<string, unknown>;
    if (Array.isArray(o.content)) return o.content as T[];
    if (Array.isArray(o.items)) return o.items as T[];
    if (Array.isArray(o.data)) return o.data as T[];
  }
  return [];
}

export function asRecord(data: unknown): Record<string, unknown> | null {
  const u = unwrapData(data);
  if (u && typeof u === "object" && !Array.isArray(u)) {
    return u as Record<string, unknown>;
  }
  return null;
}

export function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}
