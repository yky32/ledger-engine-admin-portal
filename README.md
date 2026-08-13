# LedgeRX Admin

Ops console for **[LedgeRX](https://github.com/yky32/ledger-engine)** (`ledger-engine` service).

UX follows LedgeRX **`docs/SYSTEM_BUSINESS_FLOW.md`** end-to-end picture.  
Brand: engine `docs/BRAND.md`.

## Mental model (sidebar + home)

```text
① Ops configures     Door (ingest-policy) + Brain (digestion-rules)
② Upstream shoot     Simulator / single webhook  (= POS/OMS)
③ Engine outcomes    Customer LP · DE legs · Fail queue · Movements
```

Home (`/`) is an interactive flow map of that diagram.

## Quick start

```bash
cd ../ledger-engine && mvn spring-boot:run
cd ../ledger-engine-admin-portal
# .env.local: LEDGER_ENGINE_URL=http://localhost:8080
npm run dev
```

http://localhost:3000 → **LedgeRX** business flow → steps 1→4.

## Key routes

| Step | Route | Engine API idea |
|------|-------|-----------------|
| 1 Door | `/ingest-policy` | GET/PUT `/ingest-policy` |
| 1 Brain | `/digestion-rules` | `/digestion-rules` |
| 2 Shoot | `/simulator` | webhook matrix |
| 2 Shoot | `/transactions-ingest` | POST webhook |
| 3 Books | `/review` | wallet + movements by ownerId |
| 3 Legs | `/ledger-entries` | DE legs |
| 3 Fail | `/failed-transactions` | review/replay |
| 4 Audit | `/movements` | history |

Each main screen shows a **Flow strip** (1 Ops → 2 Shoot → 3 Digest → 4 Books).
