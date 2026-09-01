/**
 * Browser → Next rewrite `/api/ledger/*` → ledger-engine.
 * Unwraps Result envelope { code, message, data, pagination }.
 */

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
    message?: string,
    public code?: string,
  ) {
    super(message || `HTTP ${status}`);
    this.name = "ApiError";
  }

  get isNetwork(): boolean {
    return this.status === 0 || this.message.toLowerCase().includes("fetch");
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  get isConflict(): boolean {
    return this.status === 409 || this.code?.endsWith("409") === true;
  }
}

export type Pagination = {
  page?: number;
  size?: number;
  totalElements?: number;
  totalPages?: number;
};

export type ResultEnvelope<T> = {
  code?: string;
  message?: string;
  httpStatus?: string;
  data?: T;
  pagination?: Pagination | null;
};

async function parseBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function isEnvelope(v: unknown): v is ResultEnvelope<unknown> {
  return !!v && typeof v === "object" && ("data" in v || "code" in v || "httpStatus" in v);
}

function messageFromBody(body: unknown, fallback: string): { message: string; code?: string } {
  if (!body) return { message: fallback };
  if (typeof body === "string") return { message: body.slice(0, 500) };
  if (isEnvelope(body)) {
    const data = body.data as Record<string, unknown> | null | undefined;
    const detail =
      data && typeof data === "object"
        ? (data.detail as string) || (data.message as string) || ""
        : "";
    const msg = [body.message, detail].filter(Boolean).join(" — ") || body.code || fallback;
    return { message: msg, code: body.code };
  }
  try {
    return { message: JSON.stringify(body).slice(0, 500) };
  } catch {
    return { message: fallback };
  }
}

export type ApiCall = {
  id: number;
  method: string;
  /** Engine path (no /api/ledger prefix), including query string. */
  path: string;
  status: number | null;
  ms: number | null;
  at: number;
};

const API_LOG_MAX = 24;
const apiCalls: ApiCall[] = [];
const apiCallListeners = new Set<(calls: ApiCall[]) => void>();
let apiCallSeq = 0;

function enginePath(path: string): string {
  let p = path.startsWith("/api/ledger") ? path.slice("/api/ledger".length) : path;
  if (!p.startsWith("/")) p = `/${p}`;
  return p;
}

function notifyApiCalls() {
  const snap = apiCalls.slice();
  apiCallListeners.forEach((fn) => fn(snap));
}

export function subscribeApiCalls(fn: (calls: ApiCall[]) => void): () => void {
  apiCallListeners.add(fn);
  fn(apiCalls.slice());
  return () => {
    apiCallListeners.delete(fn);
  };
}

export function formatApiCall(call: Pick<ApiCall, "method" | "path">): string {
  return `${call.method} ${call.path}`;
}

export async function apiRaw(
  path: string,
  init?: RequestInit & { json?: unknown },
): Promise<{ status: number; body: unknown }> {
  const url = path.startsWith("/api/ledger")
    ? path
    : `/api/ledger${path.startsWith("/") ? path : `/${path}`}`;
  const method = (init?.method || "GET").toUpperCase();
  const call: ApiCall = {
    id: ++apiCallSeq,
    method,
    path: enginePath(path),
    status: null,
    ms: null,
    at: Date.now(),
  };
  apiCalls.unshift(call);
  if (apiCalls.length > API_LOG_MAX) apiCalls.pop();
  notifyApiCalls();
  const t0 = performance.now();

  const headers = new Headers(init?.headers);
  let body = init?.body;
  if (init?.json !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(init.json);
  }
  if (!headers.has("Accept")) headers.set("Accept", "application/json");

  let res: Response;
  try {
    res = await fetch(url, { ...init, headers, body, cache: "no-store" });
  } catch (e) {
    call.status = 0;
    call.ms = Math.round(performance.now() - t0);
    notifyApiCalls();
    const msg =
      e instanceof Error
        ? `Engine unreachable (${e.message}). Start ledger-engine on LEDGER_ENGINE_URL.`
        : "Engine unreachable. Start ledger-engine.";
    throw new ApiError(0, null, msg);
  }

  const parsed = await parseBody(res);
  call.status = res.status;
  call.ms = Math.round(performance.now() - t0);
  notifyApiCalls();
  return { status: res.status, body: parsed };
}

export async function api<T = unknown>(
  path: string,
  init?: RequestInit & { json?: unknown },
): Promise<{ data: T; pagination?: Pagination | null; raw: unknown; status: number }> {
  const { status, body } = await apiRaw(path, init);

  if (status < 200 || status >= 300) {
    const { message, code } = messageFromBody(body, `HTTP ${status}`);
    throw new ApiError(status, body, message, code);
  }

  if (isEnvelope(body)) {
    // business fail sometimes 200 with non-SYS0000 and no data
    // Non-success business codes without payload
    if (body.code && body.code !== "SYS0000" && body.data == null) {
      throw new ApiError(status, body, body.message || body.code, body.code);
    }
    return {
      data: body.data as T,
      pagination: body.pagination ?? null,
      raw: body,
      status,
    };
  }

  // actuator / plain JSON
  return { data: body as T, pagination: null, raw: body, status };
}

export const ledger = {
  get: <T = unknown>(path: string) => api<T>(path),
  post: <T = unknown>(path: string, json?: unknown) =>
    api<T>(path, { method: "POST", json }),
  put: <T = unknown>(path: string, json?: unknown) =>
    api<T>(path, { method: "PUT", json }),
  patch: <T = unknown>(path: string, json?: unknown) =>
    api<T>(path, { method: "PATCH", json }),
  delete: <T = unknown>(path: string) => api<T>(path, { method: "DELETE" }),
};

/** Build query string; skips null/undefined/''. */
export function qs(
  params: Record<string, string | number | boolean | undefined | null>,
): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}
