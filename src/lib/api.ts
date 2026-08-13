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
  return !!v && typeof v === "object" && ("data" in v || "code" in v);
}

export async function apiRaw(
  path: string,
  init?: RequestInit & { json?: unknown },
): Promise<{ status: number; body: unknown }> {
  const url = path.startsWith("/api/ledger")
    ? path
    : `/api/ledger${path.startsWith("/") ? path : `/${path}`}`;

  const headers = new Headers(init?.headers);
  let body = init?.body;
  if (init?.json !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(init.json);
  }
  if (!headers.has("Accept")) headers.set("Accept", "application/json");

  const res = await fetch(url, { ...init, headers, body, cache: "no-store" });
  const parsed = await parseBody(res);
  return { status: res.status, body: parsed };
}

export async function api<T = unknown>(
  path: string,
  init?: RequestInit & { json?: unknown },
): Promise<{ data: T; pagination?: Pagination | null; raw: unknown }> {
  const { status, body } = await apiRaw(path, init);

  if (status < 200 || status >= 300) {
    const env = isEnvelope(body) ? body : null;
    const msg =
      env?.message ||
      (typeof body === "string" ? body : JSON.stringify(body)?.slice(0, 400));
    throw new ApiError(status, body, msg, env?.code);
  }

  if (isEnvelope(body)) {
    // business fail sometimes 200 with non-SYS0000 — still surface
    if (body.code && body.code !== "SYS0000" && body.data === undefined) {
      throw new ApiError(status, body, body.message || body.code, body.code);
    }
    return {
      data: body.data as T,
      pagination: body.pagination ?? null,
      raw: body,
    };
  }

  return { data: body as T, pagination: null, raw: body };
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
export function qs(params: Record<string, string | number | boolean | undefined | null>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}
