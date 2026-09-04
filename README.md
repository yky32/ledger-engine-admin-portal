# LedgeRX Admin

Ops console for **[LedgeRX](https://github.com/yky32/ledger-engine)** (`ledger-engine` service).

**API contract (path / method / fields):** [docs/BACKEND_API.md](./docs/BACKEND_API.md)  
Engine handbook: [ledger-engine `docs/BOOKLET.md`](https://github.com/yky32/ledger-engine/blob/main/docs/BOOKLET.md).

## Mental model (sidebar + home)

```text
Run        Webhook / Simulator / Fail queue
Books      Wallets (LP · tier · refund) · Onboard · Double-entry
Pipeline   Door → Brain → Accounting → Tiering
Chart      House COA · Customer COA · Dictionary
Rails      Hold / Deposit / Withdraw / Transfer
```

Home (`/`) is the CC_TXN map: ingest → digest → books → check tier.

## Quick start

```bash
cd ../ledger-engine && mvn spring-boot:run
cd ../ledger-engine-admin-portal
# .env.local: LEDGER_ENGINE_URL=http://localhost:8080
npm run dev
```

http://localhost:3000 → Home → Webhook / Wallets / Tiering.

## Key routes

| Step | Route | Engine API |
|------|-------|------------|
| 1 Door | `/ingest-policies` | GET/PUT `/ingest-policies` |
| 2 Brain | `/digestion-rules` | `/digestion-rules` |
| 3 Books | `/accounting-rules` · `/wallets-list` | CR/DR · GET `/wallets` |
| 4 Tier | `/wallet-tier-policies` | GET/PUT `/wallet-tier-policies` |
| Shoot | `/transactions-ingest` | POST webhook |
| Fail | `/failed-transactions` | review / replay |

Each main screen shows the **Flow** strip (Door → Brain → Accounting → Ledger → Tier).
