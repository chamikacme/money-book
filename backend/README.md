# MoneyBook Backend

Hono API running on Cloudflare Workers with Clerk authentication, CORS, request logging, error handling, and D1 bindings.

## Development

```bash
npm install
npm run dev
```

Copy `.dev.vars.example` to `.dev.vars` and replace the Clerk placeholders with development credentials before testing authenticated routes. The example allows both local frontends (`localhost:5173` and `localhost:5174`).

Public endpoint:

```text
GET /api/health
```

Protected application endpoints include:

```text
GET/POST/PATCH/DELETE /api/accounts
GET/POST/PATCH/DELETE /api/categories
GET/POST/PATCH/DELETE /api/transactions
GET                   /api/dashboard
GET                   /api/reports/*
GET                   /api/backup/export
POST                  /api/backup/import
```

The API also provides budgets, goals, recurring transactions, shortcuts, journal entries, and settings. All application routes are registered after Clerk authentication middleware in `src/index.ts`.
