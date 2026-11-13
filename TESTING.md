# MoneyBook Testing Plan

## Current automated coverage

### Backend

```bash
cd backend
npm run test
```

Coverage currently includes:

- Zod validation for accounts and transactions
- Integer-cent conversion
- Pagination metadata
- Debit/credit balance invariants
- D1 migration table and column checks
- SQLite-compatible migration checks
- Cascading transaction-entry foreign keys

### Frontend

```bash
cd frontend
npm run test
npm run build
```

Coverage currently includes:

- Clerk bearer token attachment in the API client
- Successful JSON response parsing
- Typed API error handling
- Production Vite/PWA build validation

## Local D1 validation

Apply the schema and seed data locally before running API integration checks:

```bash
cd backend
npm run db:migrate:local
npm run db:seed:local
```

The seed user is `dev-user` and must only be used locally.

## Required release checks

- [ ] Run backend and frontend unit tests.
- [ ] Apply D1 migrations to a clean staging database.
- [ ] Compare migrated row counts with PostgreSQL.
- [ ] Compare account balances, transaction totals, goals, and report totals.
- [ ] Test two Clerk users and verify cross-user reads and writes fail.
- [ ] Test all transaction types and rollback behavior.
- [ ] Test backup export and validated import.
- [ ] Run browser end-to-end tests for sign-in, account creation, transactions, budgets, and goals.
- [ ] Verify PWA installation and reconnect behavior.
