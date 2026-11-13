# MoneyBook

MoneyBook is a personal finance application with a React/Vite frontend and a Hono API running on Cloudflare Workers with D1.

## Applications

- [`frontend/`](frontend/README.md) — React/Vite client
- [`backend/`](backend/README.md) — Hono + Drizzle + Cloudflare D1 API
- [`DEPLOYMENT.md`](DEPLOYMENT.md) — production deployment and cutover guide

## Repository layout

```text
frontend/   React/Vite SPA, UI components, tests, and Pages deployment
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
