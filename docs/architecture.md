# Architecture

## Applications

MoneyBook consists of three independently deployable applications plus a shared contracts package:

- **`frontend/`** — MoneyBook Web, a React + Vite SPA (React Router, TanStack Query, Tailwind CSS, Clerk React) deployed to Cloudflare Pages.
- **`lite/`** — MoneyBook Lite, a lightweight phone-first React + Vite companion app that shares the same API, Clerk application, and D1 database, deployed to a separate Cloudflare Pages project.
- **`backend/`** — Hono API on Cloudflare Workers with Clerk authentication, CORS, Drizzle ORM, and Cloudflare D1.
- **`shared/`** — `@moneybook/shared`: framework-independent Zod schemas and TypeScript types used by both frontends and the backend.

## Separation rules

- `frontend/` and `lite/` must not import database, Worker, or backend implementation files.
- `backend/` must not import React or frontend components.
- `shared/` may contain only framework-independent contracts, schemas, and types.
- All frontend data access goes through the app's API client (`api-client.ts`).
- All database access stays inside backend services and database modules.
- Authorization is enforced by backend middleware and user-scoped database queries.

## Data flow

```text
React component
  → API client (Clerk bearer token)
  → Hono route
  → Clerk auth middleware
  → service
  → Drizzle
  → Cloudflare D1
```

## Environment conventions

- Local API: `http://localhost:8787`
- Local frontend: `http://localhost:5173`
- Local lite: `http://localhost:5174`
- `VITE_API_URL` is the API origin without an `/api` suffix; Vite embeds it at build time.
- `VITE_CLERK_PUBLISHABLE_KEY` is the public Clerk publishable key; the Clerk secret key is never exposed to the frontend.
- Production frontend origins are added to the backend `ALLOWED_ORIGINS` Worker variable. No wildcard origin in production.

## Stack

| Layer | Technology |
|---|---|
| Frontend UI | React 19, React Router, TanStack Query, Tailwind CSS |
| Frontend auth | Clerk React |
| Backend | Hono, Cloudflare Workers |
| Auth middleware | `@clerk/hono` |
| Database | Cloudflare D1 (SQLite) |
| ORM | Drizzle ORM |
| Validation | Zod |
| Build / deploy | Vite, Wrangler |
