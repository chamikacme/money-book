# MoneyBook Project Requirements

## Goal

A modern personal-finance manager for core double-entry budgeting, transaction tracking, and goal setting, built as independently deployable frontends and a shared API on Cloudflare.

## 1. Technical stack & architecture

| Layer | Technology | Notes |
|---|---|---|
| Frontend (Web) | React 19, Vite, React Router, TanStack Query, Tailwind CSS | MoneyBook Web, Cloudflare Pages |
| Frontend (Lite) | React 19, Vite, React Router, Clerk React, Tailwind CSS | Phone-first companion, Cloudflare Pages |
| Backend | Hono, Cloudflare Workers, Drizzle ORM | MoneyBook API |
| Database | Cloudflare D1 (SQLite) | Integer-cent monetary values |
| Authentication | Clerk | Same Clerk app for Web and Lite |
| Validation | Zod | Request validation in backend |
| Shared contracts | `@moneybook/shared` | Framework-independent schemas and types |

Frontends must not import backend or database modules, and must not reimplement balance or double-entry logic. All financial writes go through the backend API.

## 2. Core feature requirements (MVP)

### Accounts

- Four account types: Asset, Liability, Expense, Revenue.
- Create, edit, delete, and pin accounts.
- Initial balance when creating an account; balances stored as integer cents.

### Transactions (double-entry)

- Every transaction forms a balanced double-entry record (total debits equal total credits).
- Transaction types: Withdrawal (expense), Deposit (income), Transfer.
- Withdrawal: debit an expense or category account, credit an asset or liability account.
- Deposit: debit an asset account, credit a revenue account.
- Transfer: asset or liability account to asset or liability account; not income or expense.
- Required destination accounts enforced; creation, balance updates, and entries are atomic.

### Categories, budgets, and goals

- Create, edit, and delete categories and budgets tied to categories.
- Savings goals with a target amount; contributions and withdrawals update goals and accounts atomically.

### Recurring transactions and shortcuts

- Schedules: daily, weekly, bi-weekly, monthly, quarterly, yearly.
- Execute existing shortcuts and recurring transactions through the backend.

### Settings, dashboard, and reports

- User currency and dashboard visibility settings.
- Dashboard summary: balances, monthly activity, and recent activity.
- Reports: income vs expense, spending by category, net worth history.

### Backup and import

- Export and validated import of user data; invalid imports do not partially modify the database.

## 3. Explicit exclusions

- Multi-currency support (single primary currency per user).
- Split transactions.
- External integrations (bank sync, webhooks).
- Advanced authentication beyond Clerk sessions.
- Investment or live asset price tracking.
- A second backend or database for Lite.

## 4. Design & UX

- Responsive layouts usable on phones, tablets, and desktop.
- Approachable language with accounting accuracy.
- Color is never the only indicator of income or expense; pair it with labels, signs, or icons.
- Semantic controls, readable contrast, keyboard navigation, and meaningful labels.
