# MoneyBook Frontend/Backend Migration Plan

> **Historical record.** This migration (Next.js monolith → separated React frontend, Hono backend, and D1) is complete. The `frontend/`, `backend/`, `lite/`, and `shared/` applications now exist. This document is retained for reference only; see [`docs/architecture.md`](../architecture.md) for the current architecture.

## Target architecture

MoneyBook will be migrated from a Next.js monolith to two independently deployable applications:

```text
money-book/
├── frontend/          # React + Vite application
├── backend/           # Hono + Cloudflare Workers API
├── shared/            # API contracts, Zod schemas, and shared types
└── MIGRATION_PLAN.md
```

The target stack is:

- **Frontend:** React, Vite, React Router, TanStack Query, Tailwind CSS, existing Radix/shadcn components
- **Backend:** Hono, Cloudflare Workers, Drizzle ORM
- **Database:** Cloudflare D1
- **Authentication:** Clerk
- **Validation:** Zod
- **PWA:** `vite-plugin-pwa`

The current application uses PostgreSQL through Neon. D1 uses SQLite, so the database schema and migrations must be adapted rather than copied directly.

## Separation rules

- `frontend/` must not import database, Worker, or backend implementation files.
- `backend/` must not import React or frontend components.
- `shared/` may contain only framework-independent contracts, schemas, and types.
- All frontend data access must go through `frontend/src/lib/api-client.ts`.
- All database access must remain inside backend services and database modules.
- Authorization must be enforced by backend middleware and user-scoped database queries.

Expected request flow:

```text
React component
  → API client
  → Hono route
  → Clerk auth middleware
  → service
  → Drizzle
  → Cloudflare D1
```

## Phase 1: Audit and behavior freeze

### Tasks

- Inventory all Next.js pages, Server Actions, components, and database queries.
- Map each module in `src/app/actions/` to one or more API endpoints.
- Document existing behavior for accounts, transactions, categories, budgets, goals, recurring transactions, shortcuts, reports, settings, and backup/import.
- Identify all Next.js-specific features, including Server Components, Server Actions, `revalidatePath`, middleware, redirects, and PWA configuration.
- Add or document regression tests for financial calculations and authorization behavior.
- Freeze schema changes in the existing application during migration.

### Deliverable

An action-to-endpoint migration map and a feature acceptance checklist.

## Phase 2: Create the separated applications

### Tasks

- Create `frontend/`, `backend/`, and `shared/` directories.
- Configure TypeScript and workspace-level scripts.
- Set up React + Vite and React Router in `frontend/`.
- Set up Hono and Wrangler in `backend/`.
- Move or copy reusable UI components into the frontend application.
- Define local, staging, and production environment conventions.
- Add a basic health endpoint to the Worker.

### Deliverable

Both applications start independently and the frontend can reach the backend health endpoint.

## Phase 3: Migrate PostgreSQL schema to D1

### Tasks

- Convert Drizzle `pgTable` definitions to SQLite/D1 definitions.
- Replace PostgreSQL enums with text columns validated by Zod.
- Replace `serial` columns with SQLite integer primary keys.
- Convert timestamp and boolean column definitions to SQLite-compatible forms.
- Replace PostgreSQL arrays, such as `definedNetWorthIncludes`, with JSON text or a normalized relation.
- Preserve money values as integer cents.
- Create D1-compatible migration files under `backend/migrations/`.
- Create seed data for local development and test environments.
- Write a PostgreSQL-to-D1 data migration if existing production data must be retained.

### Deliverable

A tested D1 schema, migration history, seed data, and a documented data migration procedure.

## Phase 4: Build backend foundation

### Tasks

- Create the Hono application entry point.
- Configure D1 bindings and the Drizzle database factory.
- Add Clerk authentication middleware.
- Add CORS restricted to approved frontend origins.
- Add centralized error handling and consistent JSON responses.
- Add Zod request validation.
- Add request logging and environment-aware error reporting.
- Create service and route conventions.

Recommended backend structure:

```text
backend/src/
├── index.ts
├── routes/
├── services/
├── middleware/
├── validators/
├── db/
└── types/
```

### Deliverable

An authenticated Hono API connected to D1 with a working health check and error handling.

## Phase 5: Migrate backend features

Migrate features incrementally in this order:

1. User settings
2. Accounts
3. Categories
4. Transactions
5. Dashboard summaries
6. Budgets
7. Goals
8. Recurring transactions
9. Shortcuts
10. Reports
11. Backup and import

Each feature should follow this structure:

```text
route → validator → service → database query
```

Suggested endpoint groups include:

```text
GET/POST/PATCH/DELETE /api/accounts
GET/POST/PATCH/DELETE /api/categories
GET/POST/PATCH/DELETE /api/transactions
GET                  /api/dashboard
GET/POST/PATCH/DELETE /api/budgets
GET/POST/PATCH/DELETE /api/goals
GET/POST/PATCH/DELETE /api/recurring-transactions
GET/POST/PATCH/DELETE /api/shortcuts
GET                  /api/reports
GET/PATCH            /api/settings
GET/POST             /api/backup
```

### Deliverable

A complete, authenticated API with route and service tests.

## Phase 6: Build the frontend foundation

### Tasks

- Configure React Router and protected routes.
- Integrate Clerk React authentication.
- Move existing Tailwind, Radix, and UI components.
- Recreate the application layout, sidebar, mobile navigation, dialogs, and toast notifications.
- Create `frontend/src/lib/api-client.ts` for all HTTP requests.
- Configure TanStack Query for loading, caching, invalidation, and mutations.
- Add loading, empty, error, and unauthorized states.
- Configure the PWA using `vite-plugin-pwa`.

Recommended frontend structure:

```text
frontend/src/
├── components/
├── pages/
├── layouts/
├── routes/
├── hooks/
├── lib/
├── contexts/
└── types/
```

### Deliverable

A React application with routing, authentication, shared layout, API client, and PWA support.

## Phase 7: Migrate frontend screens

Migrate screens in the same order as the API:

1. Dashboard
2. Accounts
3. Categories
4. Transactions
5. Budgets
6. Goals
7. Recurring transactions
8. Shortcuts
9. Reports
10. Settings
11. Backup and import

Replace direct Server Action imports with API client calls. For each screen, verify:

- Initial loading behavior
- Form validation
- Successful mutations
- Query invalidation and refreshed data
- Error handling
- Mobile responsiveness
- Unauthorized access behavior

### Deliverable

A feature-complete React frontend with no imports from the old Next.js Server Actions.

## Phase 8: Authentication and authorization hardening

### Tasks

- Verify Clerk tokens in the Hono middleware.
- Reject unauthenticated requests with consistent `401` responses.
- Scope every database query by authenticated `userId`.
- Prevent access to another user’s records by changing resource IDs.
- Restrict CORS to known frontend origins.
- Separate development, staging, and production Clerk configuration.
- Store secrets and D1 bindings through Wrangler/Cloudflare configuration rather than source control.

### Deliverable

Security-tested authentication and authorization across every endpoint.

## Phase 9: Testing and data validation

### Tests

- Hono route tests
- Service and database tests
- React component tests
- End-to-end tests for primary user flows
- D1 migration tests
- Multi-user authorization tests
- Import/export compatibility tests

### Financial invariants

- Account balances remain correct after each transaction type.
- Double-entry transaction entries remain balanced.
- Goal contributions and withdrawals update correctly.
- Recurring transactions produce the same result as the current application.
- All money calculations remain integer-cent based.

### Deliverable

A release candidate with regression coverage and validated migrated data.

## Phase 10: Staging deployment and cutover

### Deployment targets

```text
Frontend → Cloudflare Pages or Workers Static Assets
Backend  → Cloudflare Workers
Database → Cloudflare D1
```

### Cutover sequence

1. Deploy the new frontend and backend to staging.
2. Import a copy of production data into a staging D1 database.
3. Run acceptance, security, and data validation tests.
4. Prepare a final production data migration.
5. Put the old application into maintenance or read-only mode.
6. Run the final migration into D1.
7. Deploy the production Worker and frontend.
8. Verify authentication, core financial flows, backups, and reports.
9. Monitor Worker errors, latency, and D1 behavior.
10. Keep the old application available for rollback until the new system is stable.

## Rollback plan

- Keep a deployed Worker version available for rollback until migration validation is complete.
- Take a final PostgreSQL backup before production migration.
- Keep a D1 backup/export before destructive changes.
- Use separate staging and production D1 databases.
- If critical issues occur, route users back to the existing application and preserve the migrated data for investigation.
- Do not delete the old application until a production backup and rollback test have succeeded.

## Completion criteria

The migration is complete when:

- Frontend and backend deploy independently.
- No production frontend code depends on Next.js Server Actions.
- All protected API routes verify Clerk authentication.
- Every query is user-scoped.
- D1 migrations and backups are documented and tested.
- Core financial calculations match the existing application.
- PWA behavior works in supported browsers.
- Production monitoring and rollback procedures are operational.
