# ledger-engine-admin-portal

Next.js **ops / QA console** for [ledger-engine](https://github.com/yky32/ledger-engine).

No auth. Browser → `/api/ledger/*` rewrite → `LEDGER_ENGINE_URL`.

## Quick start

```bash
# terminal 1 — engine
cd ../ledger-engine && mvn spring-boot:run

# terminal 2 — portal
cd ../ledger-engine-admin-portal
# .env.local: LEDGER_ENGINE_URL=http://localhost:8080
npm install
npm run dev
```

Open http://localhost:3000

## Loyalty desk (primary)

| Route | Backend |
|-------|---------|
| `/simulator` | onboard + webhook matrix + hold/release |
| `/review` | `GET /wallets/{ownerId}`, movements, as-of, fails, legs |
| `/transactions-ingest` | `POST /integrations/webhooks/transactions` |
| `/failed-transactions` | list / review / replay |
| `/ledger-entries` | `GET /integrations/ledger-entries` |
| `/digestion-rules` | brain CRUD list/create |
| `/ingest-policy` | door GET/PUT |
| `/holds` | hold/release available |
| `/wallets` | onboard + lookup by **ownerId** |

## Notes

- API client unwraps `Result{ data, pagination }` (`src/lib/api.ts`)
- Typed helpers in `src/lib/engine.ts`
- UI kit: dark sidebar, emerald accent, tables + JSON panels
- Pageable lists use **page=1** (engine profile style)
- Query wallets **only** with `ownerId`
