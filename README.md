# ledger-engine-admin-portal

Next.js admin UI for **[ledger-engine](https://github.com/yky32/ledger-engine)**.

Internal tool to **review local test results** after `upstream-sim` / smoke: wallets, digestion rules, ingest policy, webhook fire, failed-ingest replay, DE legs. **No auth.**

## Quick start (review flow)

```bash
# terminal 1 — engine (greenfield create)
cd ../ledger-engine
mvn spring-boot:run

# terminal 2 — seed + pretend upstream
cd ../ledger-engine
./scripts/upstream-sim.sh
# note the CUST=01A… printed at the end

# terminal 3 — portal
cd ../ledger-engine-admin-portal
cp .env.example .env.local   # LEDGER_ENGINE_URL=http://localhost:8080
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → **Customer review** → paste `CUST` id.

## Loyalty review modules

| Page | Use |
|------|-----|
| `/review` | Wallet + movements + as-of + legs + fails for one CUST |
| `/transactions-ingest` | Fire webhook as upstream |
| `/failed-transactions` | List OPEN fails · Review · Replay |
| `/ledger-entries` | Legs by `eventId` / `movementId` |
| `/digestion-rules` | Runtime formulas |
| `/ingest-policy` | Door / auto-wallet |
| `/holds` | Hold / release available |

## Config

| Env | Default |
|-----|---------|
| `LEDGER_ENGINE_URL` | `http://localhost:8080` |

Browser → `/api/ledger/*` → Next rewrite → engine (no CORS pain).

## Notes

- Not production-hardened (no auth/RBAC).
- Engine `Result` envelope `{ data, pagination }` is unwrapped in the UI.
- List APIs use **1-based** `page` (aligned with ledger-engine).
