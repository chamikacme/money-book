# Phase 1 Audit: Next.js to React + Hono + D1

> **Historical record.** This audit records the pre-migration application behavior and is retained for reference only. The migration it describes is complete; see [`docs/architecture.md`](../architecture.md) for the current architecture.

**Status:** Complete  
**Scope:** Audit and behavior freeze only  
**Runtime changes:** None

This document records the current application behavior and the boundaries to preserve during migration. It is the baseline for implementing the React frontend and Hono backend without changing financial behavior.

## Current application inventory

### Current stack

- Next.js App Router
- React 19
- Clerk authentication through `@clerk/nextjs`
- Next.js Server Actions for application and database mutations
- Drizzle ORM with Neon PostgreSQL
- Tailwind CSS and Radix-based UI components
- `@ducanh2912/next-pwa`

### Current route inventory

| Route | Purpose |
| --- | --- |
| `/` | Public landing page and authenticated redirect |
| `/sign-in` | Clerk sign-in |
| `/sign-up` | Clerk sign-up |
| `/setup` | Initial user settings setup |
| `/dashboard` | Account summary, spending, budgets, recent and upcoming activity |
| `/accounts` | Account management |
| `/categories` | Category management |
| `/transactions` | Transaction listing and management |
| `/journal` | Journal entry listing |
| `/budgets` | Budget management |
| `/goals` | Savings goal management |
| `/recurring` | Recurring transaction management |
| `/shortcuts` | Quick transaction shortcut management |
| `/reports` | Financial reports and charts |
| `/settings` | User and dashboard settings |

All routes except the public landing, sign-in, and sign-up routes are protected by `src/proxy.ts`.

## Server Action to API map

The current Server Actions are grouped below. These are proposed API boundaries, not implementation changes.

### Accounts and settings

Source: `src/app/actions/accounts.ts`

| Current action | Proposed API |
| --- | --- |
| `createAccount(formData)` | `POST /api/accounts` |
| `getAccounts()` | `GET /api/accounts` |
| `getPaginatedAccounts(page, pageSize, search)` | `GET /api/accounts?page=&pageSize=&search=` |
| `updateAccount(id, formData)` | `PATCH /api/accounts/:id` |
| `deleteAccount(id)` | `DELETE /api/accounts/:id` |
| `togglePinAccount(id, isPinned)` | `PATCH /api/accounts/:id/pin` |
| `getUserSettings()` | `GET /api/settings` |
| `updateUserSettings(updates)` | `PATCH /api/settings` |

### Categories

Source: `src/app/actions/categories.ts`

| Current action | Proposed API |
| --- | --- |
| `createCategory(formData)` | `POST /api/categories` |
| `getCategories()` | `GET /api/categories` |
| `updateCategory(id, formData)` | `PATCH /api/categories/:id` |
| `deleteCategory(id)` | `DELETE /api/categories/:id` |

### Transactions

Source: `src/app/actions/transactions.ts`

| Current action | Proposed API |
| --- | --- |
| `createTransaction(formData)` | `POST /api/transactions` |
| `getTransactions(page, pageSize, search, startDate, endDate)` | `GET /api/transactions?...` |
| `updateTransaction(id, formData)` | `PATCH /api/transactions/:id` |
| `deleteTransaction(id)` | `DELETE /api/transactions/:id` |

Transaction creation and updates modify both the transaction record and account balances. They must remain atomic and preserve the existing withdrawal, deposit, and transfer rules.

### Dashboard and journal

Sources: `src/app/actions/dashboard.ts`, `src/app/actions/journal.ts`

| Current action | Proposed API |
| --- | --- |
| `getRecentTransactions(limit)` | `GET /api/dashboard/recent-transactions?limit=` |
| `getMonthlySpending()` | `GET /api/dashboard/monthly-spending` |
| `getJournalEntries(page, pageSize, search, startDate, endDate)` | `GET /api/journal?...` |

### Budgets

Source: `src/app/actions/budgets.ts`

| Current action | Proposed API |
| --- | --- |
| `createBudget(formData)` | `POST /api/budgets` |
| `getBudgets()` | `GET /api/budgets` |
| `updateBudget(id, formData)` | `PATCH /api/budgets/:id` |
| `deleteBudget(id)` | `DELETE /api/budgets/:id` |

### Goals

Source: `src/app/actions/goals.ts`

| Current action | Proposed API |
| --- | --- |
| `createGoal(formData)` | `POST /api/goals` |
| `getGoals()` | `GET /api/goals` |
| `updateGoal(id, formData)` | `PATCH /api/goals/:id` |
| `contributeToGoal(goalId, fromAccountId, amount)` | `POST /api/goals/:id/contributions` |
| `withdrawAndCompleteGoal(goalId, toAccountId)` | `POST /api/goals/:id/withdraw` |
| `deleteGoal(id)` | `DELETE /api/goals/:id` |

Goal contribution and withdrawal operations update goals, accounts, and transactions. They must remain atomic.

### Recurring transactions

Source: `src/app/actions/recurring.ts`

| Current action | Proposed API |
| --- | --- |
| `createRecurringTransaction(formData)` | `POST /api/recurring-transactions` |
| `getRecurringTransactions(page, pageSize, search)` | `GET /api/recurring-transactions?...` |
| `getUpcomingRecurringTransactions()` | `GET /api/recurring-transactions/upcoming` |
| `executeRecurringTransaction(id)` | `POST /api/recurring-transactions/:id/execute` |
| `skipRecurringTransaction(id)` | `POST /api/recurring-transactions/:id/skip` |
| `toggleRecurringTransaction(id)` | `PATCH /api/recurring-transactions/:id/active` |
| `deleteRecurringTransaction(id)` | `DELETE /api/recurring-transactions/:id` |
| `updateRecurringTransaction(id, formData)` | `PATCH /api/recurring-transactions/:id` |

### Shortcuts

Source: `src/app/actions/shortcuts.ts`

| Current action | Proposed API |
| --- | --- |
| `getShortcuts()` | `GET /api/shortcuts` |
| `createShortcut(formData)` | `POST /api/shortcuts` |
| `updateShortcut(id, formData)` | `PATCH /api/shortcuts/:id` |
| `deleteShortcut(id)` | `DELETE /api/shortcuts/:id` |
| `executeShortcut(shortcutId, amount, description)` | `POST /api/shortcuts/:id/execute` |

### Reports

Source: `src/app/actions/reports.ts`

| Current action | Proposed API |
| --- | --- |
| `getIncomeVsExpenseData()` | `GET /api/reports/income-vs-expense` |
| `getSpendingByCategoryData()` | `GET /api/reports/spending-by-category` |
| `getIncomeByCategoryData()` | `GET /api/reports/income-by-category` |
| `getAssetAllocationData()` | `GET /api/reports/asset-allocation` |
| `getNetWorthHistoryData()` | `GET /api/reports/net-worth-history` |

### Backup and import

Source: `src/app/actions/backup.ts`

| Current action | Proposed API |
| --- | --- |
| `exportData()` | `GET /api/backup/export` |
| `importData(backup)` | `POST /api/backup/import` |

Import must validate the entire backup payload before modifying D1 and must preserve the current transactional behavior.

## Frontend coupling inventory

The frontend currently depends on Next.js in the following ways:

- Server Components call Server Actions directly during page rendering.
- Client components import Server Actions for mutations and data loading.
- `next/navigation` is used for routing, query parameters, and refresh behavior.
- `next/link` and `next/image` are used by shared layout components.
- `@clerk/nextjs` provides the provider, sign-in/sign-up components, user state, and client actions.
- `src/proxy.ts` uses Next.js Clerk middleware for route protection.
- `revalidatePath` is used after mutations to refresh server-rendered pages.
- `next/font/google` supplies the Geist fonts.
- `@ducanh2912/next-pwa` generates the current service worker assets.

The replacement behavior will be:

| Current behavior | Replacement |
| --- | --- |
| Server Action call | HTTP request through the frontend API client |
| `revalidatePath` | TanStack Query invalidation/refetch |
| `next/navigation` | React Router and URL search params |
| `next/link` | React Router `Link` |
| `next/image` | Standard image component or Vite-compatible image handling |
| Next Clerk provider | Clerk React provider |
| Next middleware | Hono auth middleware plus frontend protected routes |
| Next PWA plugin | `vite-plugin-pwa` |

## Database and migration risks

The current schema is PostgreSQL-specific and is defined in `src/db/schema.ts`.

Items requiring explicit migration decisions:

- `pgTable` definitions must become D1/SQLite table definitions.
- `pgEnum('account_type', ...)` must become a text column with application validation.
- `serial` IDs must become SQLite integer primary keys.
- PostgreSQL timestamps must become a documented SQLite representation.
- `definedNetWorthIncludes` currently uses a PostgreSQL integer array and needs JSON text or a normalized table.
- Neon `Pool` must be replaced by a D1 binding and Drizzle D1 client.
- Existing PostgreSQL data needs a repeatable export and import process.
- Existing transaction balance calculations must be compared before and after migration.

## Behavior acceptance checklist

This checklist is the baseline for comparing the new implementation with the current application.

### Authentication and isolation

- [ ] Public users can access the landing, sign-in, and sign-up screens.
- [ ] Unauthenticated users cannot access protected application screens.
- [ ] Unauthenticated API requests return `401`.
- [ ] A user cannot read another user’s accounts, categories, transactions, budgets, goals, shortcuts, or settings.
- [ ] A user cannot mutate or delete another user’s records by changing an ID.

### Accounts and settings

- [ ] Users can create asset, liability, expense, and revenue accounts.
- [ ] Account balances are stored and displayed in integer cents without precision loss.
- [ ] Users can edit, delete, and pin accounts.
- [ ] Account search and pagination preserve current results.
- [ ] User currency and dashboard visibility settings persist after reload.
- [ ] Account changes are reflected in dashboard and transaction views.

### Categories and budgets

- [ ] Users can create, edit, and delete categories.
- [ ] Categories are isolated by user.
- [ ] Users can create, edit, and delete budgets.
- [ ] Duplicate budget behavior remains unchanged.
- [ ] Budget data displays correctly for the selected category and period.

### Transactions and journal

- [ ] Users can create withdrawal, deposit, and transfer transactions.
- [ ] Required destination accounts are enforced.
- [ ] Transaction entries are created with the correct debit/credit types.
- [ ] Account balances change according to the existing account-type rules.
- [ ] Transaction creation, balance updates, and entries are atomic.
- [ ] Users can search, filter, paginate, edit, and delete transactions.
- [ ] Journal entries reflect the same transaction data.
- [ ] Dashboard totals update after transaction mutations.

### Goals

- [ ] Users can create goals and their associated savings accounts.
- [ ] Users can edit and delete goals.
- [ ] Goal contributions update goal and account balances atomically.
- [ ] Goal withdrawals create the expected transaction and complete the goal.
- [ ] Goal changes are reflected in accounts, transactions, and dashboard data.

### Recurring transactions and shortcuts

- [ ] Users can create, edit, delete, activate, and deactivate recurring transactions.
- [ ] Upcoming recurring transactions are calculated correctly.
- [ ] Executing a recurring transaction updates the next run date and financial records atomically.
- [ ] Skipping a recurring transaction preserves the expected occurrence behavior.
- [ ] Users can create, edit, and delete shortcuts.
- [ ] Executing a shortcut creates the same transaction result as the current application.

### Reports, backup, and PWA

- [ ] Income versus expense data matches the current implementation.
- [ ] Category, asset allocation, and net worth reports match the current implementation.
- [ ] Exported backup data contains all supported user data.
- [ ] Invalid backup imports do not partially modify the database.
- [ ] Valid backup imports restore supported data correctly.
- [ ] The new frontend can be installed as a PWA.
- [ ] Offline and reconnect behavior is documented and tested.

## Migration freeze policy

Until the migration is complete:

1. Do not change the existing database schema without updating this audit.
2. Do not change transaction balance rules without adding a corresponding acceptance case.
3. Do not add a new Server Action without adding its proposed API boundary here.
4. Keep the current Next.js application deployable for rollback.
5. Record any intentional behavior change as a migration decision rather than silently changing it.

## Phase 1 exit criteria

- [x] Current routes and major features are inventoried.
- [x] Server Actions are mapped to proposed API boundaries.
- [x] Next.js-specific coupling is documented.
- [x] PostgreSQL-to-D1 risks are documented.
- [x] Acceptance criteria cover authentication, financial operations, reports, backup, and PWA behavior.
- [x] A migration freeze policy is defined.
