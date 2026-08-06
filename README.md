# ledger-engine-admin-portal

Next.js admin UI for **[ledger-engine](https://github.com/yky32/ledger-engine)**.

Internal tool for operating a ledger-engine deployment: resource modules, dark sidebar navigation, list / create / update panels. Built with **Next.js App Router**.

## Features

- **No login** (dev / internal use)
- Browser calls **`/api/ledger/*`** → Next **rewrite** → `LEDGER_ENGINE_URL` (avoids CORS)
- Modules for wallets, ledger accounts, movements, deposits/withdrawals/transfers, rules, recipients, VA, FX, configs, journal, transaction webhook ingest
- List / create / update / delete where the engine API supports it
- JSON response inspector on every page

## Quick start

```bash
# terminal 1 — engine
cd ../ledger-engine && mvn spring-boot:run

# terminal 2 — portal
cd ../ledger-engine-admin-portal
cp .env.example .env.local   # LEDGER_ENGINE_URL=http://localhost:8080
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Config

| Env | Default | Meaning |
|-----|---------|---------|
| `LEDGER_ENGINE_URL` | `http://localhost:8080` | Engine base URL (server-side rewrite target) |

## Layout

```text
src/
  app/                 # pages per resource
  components/
    layout/            # sidebar shell (grouped nav)
    resource/          # shared ResourceCrud
    ui/                # button, card, input, …
  lib/
    api.ts             # fetch helper
    nav.ts             # nav config
```

## Notes

- Not production-hardened: no auth, no RBAC, open to anyone who can reach the portal.
- Some engine list endpoints require filters (e.g. wallets need `ownerId`).
- Engine field names / enums must match server (see ledger-engine DTOs / Swagger if enabled).
