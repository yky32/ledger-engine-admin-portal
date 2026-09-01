# LedgeRX Admin ↔ ledger-engine API contract

Generated from backend source (`com.altech.ledger.endpoint`). Admin uses rewrite:

`/api/ledger/{path}` → `{LEDGER_ENGINE_URL}/{path}`

Envelope: `{ code, message, httpStatus, data, pagination? }` · success `code=SYS0000`.

## Loyalty / product (primary)

| Method | Path | Body / query | Notes |
|--------|------|--------------|--------|
| POST | `/wallets` | `ownerId`, `settlementCurrency`, `name?`, `vanityCode?`, `accounts?[{currency}]` | Onboard |
| GET | `/wallets/{ownerId}` | — | By ownerId |
| GET | `/wallets?ownerId=` | — | Alt lookup |
| GET | `/wallets/{ownerId}/movements` | `page`(1-based),`size`,`orderType?`,`currency?`,`status?`,`startDt?`,`endDt?` | History |
| GET | `/wallets/{ownerId}/balances/as-of` | `at?`(ISO),`currency?` | As-of |
| POST | `/wallets/holds` | `ownerId`,`currency`,`amount`,`movementKey?`,`description?` | Hold |
| POST | `/wallets/releases` | same | Release |
| POST | `/integrations/webhooks/transactions` |
| POST | `/integrations/webhooks/transactions/dry-run` | same body · **no books** · `dryRun=true` + `eligibilityTrace` | `eventId`,`ownerId`,`eventType`,`amount`,`currency`,`occurredAt?`,`metadata?` Map**string→string** | Webhook |
| GET | `/integrations/ledger-entries` | **exactly one of** `eventId` \| `movementId` ; `operation?` | DE legs |
| GET | `/integrations/failed-transactions` | `page`,`size`,`status?`,`ownerId?`,`failureCode?`,`eventId?` | Fail queue |
| GET | `/integrations/failed-transactions/{id}` | — | |
| POST | `/integrations/failed-transactions/{id}/review` | — | |
| POST | `/integrations/failed-transactions/{id}/replay` | — | |
| POST | `/integrations/failed-transactions/replay` | `{ "ids": [long…] }` max 50 | Bulk |
| GET | `/ingest-policies` | — | Door |
| PUT | `/ingest-policies` | partial flags/ccy/prefix | |
| GET | `/digestion-rules` | `enabledOnly?`,`code?` | **no page** |
| GET | `/digestion-rules/{id}` | — | |
| POST | `/digestion-rules` | CreateDigestionRule · filters + `eligibleMccs` + `formula` JSON | Brain |
| PUT | `/digestion-rules/{id}` | partial | |
| POST | `/digestion-rules/{id}/enable` | — | |
| POST | `/digestion-rules/{id}/disable` | — | |

### Webhook result `data` (IngestionResult)

+ `matchedRuleCode`, `eligibilityTrace[]` {ruleCode,priority,matched,failStep,detail}, optional `dryRun`

`eventId`, `status` (`EARNED|BURNED|PROCESSED|SKIPPED|DUPLICATE|ERROR`), `operation`, `reason`, `points`, `transactionId`, `walletExternalReference`, `movementId`, `legs[]`

### Eligibility (Brain)

`eventType`, `minAmount`, `eligibleCurrencies[]`, **`eligibleMccs[]`**, `maxAgeDays` then formula.

Webhook MCC: `metadata.mcc` | `mccCode` | `merchantCategoryCode`.

### Formula JSON

```json
{"type":"AMOUNT"}
{"type":"RATE","rate":0.01}
{"type":"FIXED","value":1000}
{"type":"LINEAR","rate":0.01,"fixed":50}
```

## Product cash movements (`/movements`)

| Method | Path | Body |
|--------|------|------|
| POST | `/movements/deposits` | `movementKey`,`ownerId`,`currency`,`amount`,`mode?`,`description?` |
| POST | `/movements/withdrawals` | `movementKey`,`ownerId`,`currency`,`amount`,`mode?`,`targetId?`,`description?` |
| POST | `/movements/transfers/in-wallet` | `movementKey`,`fromOwnerId`,`toOwnerId`,`currency`,`amount`,`mode?`,`description?` |
| GET | `/movements` | **`walletId` required**, `page`,`size` |
| GET | `/movements/{id}` | — |
| PUT | `/movements/{id}/settle` | `description?` |

⚠️ Not `walletId` on deposit body — use **`ownerId`**.

## Config / FX / rules

| Method | Path | Notes |
|--------|------|--------|
| GET | `/configurations?target=&scope=global` | target **required** |
| PUT | `/configurations` | `{name?,target,scope?,value}` JSONB |
| GET/POST | `/fx-rates` | `{base,target,rate}` |
| GET/POST | `/accounting-rules` | accounting catalog |
| GET/POST | `/accounting-rule-executions` | |

## Legacy parallel APIs (still on engine)

| Path | |
|------|--|
| `/ledger-wallets` | GET list, POST create, GET `/{id}` |
| `/ledger-accounts` | GET list, POST, GET `/{id}` |
| `/ledger-accounts/movements` | |
| `/ledger/deposits` | alternate deposit path (usecase) |
| `/accounts/{id}` | COA |

Prefer **product** `/wallets` + `/movements` + `/integrations/*` for LedgeRX Admin loyalty desk.

## Pagination

Engine APIs using `@PageableDefault(page = 1, …)` are **1-based** at the HTTP boundary (converted internally via `Pageables.toZeroBased`).
