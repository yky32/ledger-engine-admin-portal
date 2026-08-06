/**
 * Browser client → Next rewrite `/api/ledger/*` → ledger-engine.
 * No auth (dev admin). Configure LEDGER_ENGINE_URL on the Next server.
 */

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: string,
    message?: string,
  ) {
    super(message || `HTTP ${status}: ${body.slice(0, 300)}`);
    this.name = "ApiError";
  }
}

async function parseBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function api<T = unknown>(
  path: string,
  init?: RequestInit & { json?: unknown },
): Promise<T> {
  const url = path.startsWith("/api/ledger")
    ? path
    : `/api/ledger${path.startsWith("/") ? path : `/${path}`}`;

  const headers = new Headers(init?.headers);
  let body = init?.body;
  if (init?.json !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(init.json);
  }
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  const res = await fetch(url, { ...init, headers, body });
  const data = await parseBody(res);
  if (!res.ok) {
    const msg =
      data && typeof data === "object" && "message" in data
        ? String((data as { message: unknown }).message)
        : typeof data === "string"
          ? data
          : JSON.stringify(data);
    throw new ApiError(res.status, typeof data === "string" ? data : JSON.stringify(data), msg);
  }
  return data as T;
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
