# MoneyBook

MoneyBook is a personal finance application: a React/Vite frontend and a Hono API running on Cloudflare Workers with Cloudflare D1. It supports double-entry transaction tracking, accounts, categories, budgets, goals, recurring transactions, shortcuts, reports, and backup/restore, with Clerk authentication.

MoneyBook Lite (`lite/`) is a lightweight, phone-first companion app for everyday activity. It shares the same MoneyBook API, Clerk application, user accounts, and D1 database; MoneyBook Web remains the place for advanced finance workflows.

## Applications

| Application | Path | Deployment target |
|---|---|---|
| MoneyBook Web (full app) | `frontend/` | Cloudflare Pages (`moneybook-web`) |
| MoneyBook Lite (companion) | `lite/` | Cloudflare Pages (`moneybook-lite`) |
| API | `backend/` | Cloudflare Worker + D1 (`moneybook-api`, `moneybook-db`) |
| Shared contracts | `shared/` | `@moneybook/shared` (Zod schemas + TypeScript types) |

## Documentation

- [`docs/architecture.md`](docs/architecture.md) — stack, separation rules, and data flow
- [`docs/product.md`](docs/product.md) — product purpose, brand, and design principles
- [`docs/deployment.md`](docs/deployment.md) — production deployment and cutover guide
- [`docs/testing.md`](docs/testing.md) — testing plan and release checks
- [`docs/backend-requirements.md`](docs/backend-requirements.md) — outstanding backend requirements
- [`docs/lite-plan.md`](docs/lite-plan.md) — MoneyBook Lite implementation plan
- [`docs/archive/`](docs/archive/) — historical migration records

## Local development

Run the API first, then the frontend(s) in separate terminals.

```bash
cd backend
npm install
npm run dev
```

```bash
cd frontend
npm install
npm run dev
```

```bash
cd lite
npm install
npm run dev
```

- API: `http://localhost:8787`
- Frontend: `http://localhost:5173` (proxies `/api` to the local Worker)
- Lite: `http://localhost:5174` (calls the API directly)

Set `VITE_CLERK_PUBLISHABLE_KEY` (and `VITE_API_URL` for production builds) in each app's `.env.local` / `.env`, copied from its `.env.example`. Never commit real keys.

## Repository layout

```
frontend/   React/Vite SPA, UI components, tests, Pages deployment
lite/       Lightweight React/Vite companion application
backend/    Hono API, D1 schema/migrations, services, tests
shared/     Shared framework-independent contracts, schemas, and types
docs/       Product, architecture, deployment, testing, and requirements docs
```

## Conventions

- All financial writes go through the backend API.
- Frontends must not import backend or database modules, and must not reimplement balance or double-entry logic.
- All database access and authorization stay inside the backend.
- Secrets (Clerk secret key, D1 bindings) are configured through Wrangler/Cloudflare, never in source control.
