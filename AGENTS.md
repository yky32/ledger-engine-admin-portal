# AGENTS.md — ledger-engine-admin-portal

Ops console for the `ledger-engine` service (loyalty/wallet ledger). **Read §1 before assuming standard Next.js patterns apply — most of them don't.**

## 1. This is NOT a normal Next.js app

It is a **fully client-rendered SPA** that uses Next.js only as: bundler, dev server, API proxy, and static-ish host.

- **Every component (49/49) is `"use client"`.** There are no server components, no server actions, no API routes, no `next/image`, no middleware. Do not introduce them.
- Next.js-specific imports in the whole codebase: `next/link`, `next/navigation` (`usePathname`), `next/font`. That's the entire surface.
- Data fetching is plain `fetch` via `src/lib/engine.ts` inside `useEffect`. This is the **legacy pattern slated for TanStack Query** — don't copy it into new screens, don't mass-refactor it yet.

## 2. The engine proxy — biggest gotcha

All engine traffic goes through the rewrite in `next.config.ts`:

```text
Browser → /api/ledger/*  →(rewrite)→  LEDGER_ENGINE_URL
```

- **`LEDGER_ENGINE_URL` is baked at build time** (rewrites land in the routes manifest). Dev (`next dev`) reads it at boot; a prod build freezes whatever was set (default `http://localhost:8080`). Changing the target of a prod image = rebuild. Never add rewrite logic that must react to runtime env — when runtime config is needed, the proxy must become a route handler (planned as part of auth work).
- The app must stay usable when the engine is down: pages render and show the unreachable-engine banner (`engine-status-banner.tsx`, `formatApiCall` errors in `lib/api.ts`). Preserve this.

## 3. Layer map

| Path | Role |
|---|---|
| `src/lib/api.ts` | Raw fetch wrapper: `Result` envelope unwrap, `ApiError`, `ApiCall` log + `subscribeApiCalls` (feeds the live METHOD/path chips) |
| `src/lib/engine.ts` | **Hand-written** typed client mirroring the engine's controllers (`@/lib/engine`). Not generated from OpenAPI — when `ledger-engine` endpoints change, update this + `src/lib/types.ts` by hand. Contract: `docs/BACKEND_API.md` |
| `src/lib/types.ts` | DTO types copied from engine DTOs. **Money is currency-scaled strings** (`"100.00"`) — format with `money()` from `src/lib/format.ts`, never `toFixed` on it raw |
| `src/app/**/page.tsx` | One screen per engine concern, 1:1 with engine endpoints |
| `src/components/layout/page-shell.tsx` | Standard screen frame — every page uses `PageShell` (+ `ActionBar`) |

## 4. Commands

```bash
npm run dev          # Turbopack (default in Next 16)
npm run build        # Turbopack; output: "standalone"
npm run lint         # eslint . (flat config — no next lint in v16)
npm run format       # prettier --write .
npm run format:check
```

- **Prettier owns formatting**: import order (third-party → `@/lib` → `@/components` → `@/` → relative, blank line between groups), Tailwind class order, whitespace. Run `npm run format`; never hand-adjust what Prettier controls.
- ESLint: `eslint-config-next@16` **native flat config** (no FlatCompat). `react-hooks/set-state-in-effect` is downgraded to `warn` until TanStack Query lands — leave the annotation in `eslint.config.mjs`.

## 5. Prod runtime shape

`output: "standalone"` → prod runs `node server.js` from `.next/standalone` (see `Dockerfile` prod stage). No `next start`. The `dev` Docker stage is what `docker-compose.yml` uses (`LEDGER_ENGINE_URL=http://host.docker.internal:8080`).

## 6. Deliberate decisions — don't "fix" these ad hoc

- **No auth anywhere** (portal or engine). Trust boundary is the VPC. Real design exists: engine Spring Security resource server (JWT) + portal OIDC session + actor-header injection in the proxy (for `created_by`/`updated_by` audit). Implement that design when asked — not a quick login page.
- Some pages are documentation-as-pages (`/capability`, `/demo`, `/use-cases`, `/records`, `/review`) and are **slated for deletion** in a pruning pass (24 → ~7 screens). Don't invest in them.
- Engine conventions that leak into this UI: `R.success` envelope; errors are `BizException` codes (e.g. `WAL0409` duplicate wallet); idempotency via `movementKey`; `ownerId` → exactly 1 wallet. Deep docs: `../ledger-engine/docs/BOOKLET.md` / `SIMPLIFIED.md`.
