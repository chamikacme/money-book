# MoneyBook

MoneyBook is a personal finance application with a React/Vite frontend and a Hono API running on Cloudflare Workers with D1.

## Applications

- [`frontend/`](frontend/README.md) — React/Vite client
- [`lite/`](lite/README.md) — lightweight companion frontend for everyday use
- [`backend/`](backend/README.md) — Hono + Drizzle + Cloudflare D1 API
- [`DEPLOYMENT.md`](DEPLOYMENT.md) — production deployment and cutover guide
- [`MONEYBOOK_LITE_PLAN.md`](MONEYBOOK_LITE_PLAN.md) — phased Lite implementation plan

## Repository layout

```text
frontend/   React/Vite SPA, UI components, tests, and Pages deployment
lite/       Lightweight React/Vite companion application
backend/    Hono API, D1 schema/migrations, services, and tests
shared/     Shared project resources
docs/       Product/backend requirements
```

## Local development

Run the API first, then the frontend in separate terminals:

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

The frontend is available at `http://localhost:5173` and proxies API requests to the local Worker.
