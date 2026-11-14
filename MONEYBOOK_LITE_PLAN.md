# MoneyBook Lite Implementation Plan

## 1. Product Definition

MoneyBook Lite is a lightweight companion frontend for daily personal-finance activity.

It is intentionally separate from the full MoneyBook web application:

- **MoneyBook Web** remains the advanced workspace.
- **MoneyBook Lite** provides a fast, focused daily transaction experience.
- Both applications use the same MoneyBook API, Clerk application, user accounts, and D1 database.

The name "Lite" describes the reduced feature set. It does not imply a native mobile application. The first implementation is a responsive web/PWA frontend optimized for phones.

## 2. Goals

- Record common financial activity quickly.
- Provide an immediate view of balances and recent activity.
- Reuse the existing MoneyBook accounting rules and API.
- Avoid duplicating database, authentication, or financial logic.
- Keep the existing MoneyBook Web experience unchanged.
- Support installation as a lightweight PWA.

## 3. Non-Goals

MoneyBook Lite will not initially provide:

- Advanced reports and visualizations
- Full journal/audit workflows
- Account reconciliation
- Backup and restore
- Detailed account statements
- Complex budget and goal administration
- A second backend or database
- Direct database access from the frontend
- A separate Clerk application

Users can open MoneyBook Web for these advanced features.

## 4. Target Architecture

```text
money-book/
├── frontend/                  # Existing full MoneyBook Web application
├── lite/                      # New MoneyBook Lite React/Vite application
├── backend/                   # Shared Hono + Cloudflare Workers API
├── shared/                    # Shared API contracts and types
└── MONEYBOOK_LITE_PLAN.md
```

```text
MoneyBook Web ─────┐
                   ├── Hono API ─── Cloudflare D1
MoneyBook Lite ────┘
```

### Technology

- React 19
- Vite
- React Router
- TanStack Query
- Clerk React
- Tailwind CSS
- Existing MoneyBook API client conventions
- `vite-plugin-pwa`
- Shared types from `@moneybook/shared`

The old `ledgerlite/web` application may be used as a UX reference or starting point, but its old expense API and data model must not be reused.

## 5. Lite Feature Scope

### Primary navigation

1. Home
2. Add transaction
3. Transactions
4. Accounts
5. More/settings

### Home

- Net worth or total balance summary
- Current month income and spending
- Account balance snapshot
- Recent transactions
- Quick actions
- Link to MoneyBook Web for advanced features

### Add transaction

Support the existing MoneyBook transaction types:

- Withdrawal
- Deposit
- Transfer

The form should include:

- Amount
- Date
- Description
- Transaction type
- From account
- To account
- Category where applicable

The UI must guide users according to the accounting rules. For example, a withdrawal should clearly distinguish spending from a transfer.

### Transactions

- Recent transaction list
- Search by description
- Basic date filtering
- Transaction type/category display
- Edit transaction
- Delete transaction with confirmation
- Pagination or infinite loading

### Accounts

- Account names and current balances
- Account type
- Currency
- Quick link to MoneyBook Web for statements and reconciliation

### Lite settings

- Theme preference
- Currency display preference
- Sign out
- Link to full MoneyBook Web

## 6. API Usage

MoneyBook Lite must use the existing authenticated API only.

Expected endpoint groups:

```text
GET    /api/dashboard
GET    /api/accounts
GET    /api/categories
GET    /api/transactions
POST   /api/transactions
PATCH  /api/transactions/:id
DELETE /api/transactions/:id
GET    /api/settings
GET    /api/shortcuts
POST   /api/shortcuts/:id/execute
GET    /api/recurring-transactions
```

The Lite frontend must not:

- Import backend files
- Import database modules
- Write to D1
- Reimplement balance calculations
- Reimplement double-entry transaction creation
- Maintain a separate copy of the financial schema

All mutations must go through the backend transaction services.

## 7. Authentication and Authorization

MoneyBook Lite will use the same Clerk application as MoneyBook Web.

Flow:

```text
Clerk React session
    → Clerk access token
    → Authorization: Bearer <token>
    → Hono Clerk middleware
    → user-scoped D1 queries
```

Required rules:

- Use the same Clerk publishable key and instance.
- Never expose the Clerk secret key to the frontend.
- Require authentication for all protected Lite routes.
- Keep all resource queries scoped to the authenticated user.
- Ensure a resource ID from another user cannot be read or modified.

## 8. Phasewise Implementation

### Implementation status

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 0: Product and API contract freeze | In progress | Scope and API calls are documented below; validate account/transaction edge cases during implementation. |
| Phase 1: Create the Lite frontend | In progress | Vite app, Clerk, API client, PWA, and local development setup are present. |
| Phase 2: Mobile-first application shell | In progress | Responsive app shell and bottom navigation are implemented. |
| Phase 3: Dashboard and quick view | Verified locally | User confirmed dashboard/account/activity reflect changes and match MoneyBook Web. |
| Phase 4: Quick transaction flow | Verified locally | User confirmed withdrawal, deposit, and transfer flows work against the local API. |
| Phase 5: Transactions and accounts | Verified locally | User confirmed editing/deleting and balance reversal work as expected. |
| Phase 6: Shortcuts and recurring visibility | In progress | Execute existing shortcuts and view active recurring schedules; authenticated workflow testing remains. |
| Phase 7: PWA and offline behavior | In progress | Install manifest and static asset caching are configured; offline UX validation remains. |
| Phase 8: Security and financial validation | Not started | Requires authenticated integration and cross-user testing. |
| Phase 9: Deployment and production release | Not started | Requires production Lite hostname and deployment configuration. |

### Phase 0: Product and API contract freeze

**Objectives**

- Confirm the Lite feature boundary.
- Confirm that MoneyBook Web remains unchanged.
- Map Lite screens to existing backend endpoints.
- Identify any endpoint response gaps.

**Tasks**

- Review dashboard, accounts, categories, transactions, shortcuts, and settings responses.
- Define shared frontend types for Lite.
- Document loading, empty, error, and unauthorized states.
- Confirm the MoneyBook Web handoff URL.

**Exit criteria**

- Lite screen and endpoint map approved.
- No new database tables required for the initial release.

### Phase 1: Create the Lite frontend

**Objectives**

- Create an independently runnable Vite application.

**Tasks**

- Add `lite/`.
- Configure React, Vite, TypeScript, React Router, Clerk, TanStack Query, Tailwind, and PWA support.
- Add local environment configuration.
- Add a shared API client based on `frontend/src/lib/api-client.ts`.
- Add the shared package dependency.
- Add a minimal health/authenticated-session check.

**Exit criteria**

- Lite starts independently.
- Clerk sign-in works.
- Lite can call `/api/health` and one protected endpoint.

### Phase 2: Mobile-first application shell

**Objectives**

- Establish the compact, touch-friendly layout.

**Tasks**

- Implement responsive viewport behavior.
- Add top bar with MoneyBook Lite branding.
- Add fixed bottom navigation.
- Add safe-area support for phone browsers.
- Add accessible touch targets of at least 44px.
- Add loading, error, and offline-aware states.
- Add link to full MoneyBook Web.

**Exit criteria**

- Shell works at 320px, 375px, 430px, tablet, and desktop widths.
- Navigation does not obscure content or form actions.

### Phase 3: Dashboard and quick view

**Objectives**

- Provide a fast overview after login.

**Tasks**

- Connect to `/api/dashboard`.
- Display balances, monthly activity, and recent transactions.
- Add quick action buttons for withdrawal, deposit, and transfer.
- Add account balance cards.
- Add skeleton and empty states.
- Add a clear link to advanced MoneyBook Web features.

**Exit criteria**

- Dashboard renders authenticated user data.
- Query errors can be retried.
- Currency formatting matches MoneyBook Web.

### Phase 4: Quick transaction flow

**Objectives**

- Make daily transaction recording fast and safe.

**Tasks**

- Build a full-height mobile sheet or dedicated add screen.
- Load accounts and categories from the API.
- Add withdrawal, deposit, and transfer modes.
- Pre-filter or suggest valid accounts by transaction type.
- Add contextual helper text.
- Validate amount, date, description, and account selections.
- Submit through `POST /api/transactions`.
- Invalidate dashboard, account, and transaction queries after success.
- Preserve entered data when a recoverable request fails.

**Exit criteria**

- All three transaction types can be recorded.
- The UI cannot submit incomplete account selections.
- Successful transactions immediately update the Lite dashboard.
- Backend accounting invariants remain the source of truth.

### Phase 5: Transactions and accounts

**Objectives**

- Provide lightweight review and correction workflows.

**Tasks**

- Implement transaction list with search and basic filters.
- Add edit and delete confirmation flows.
- Implement account balance cards.
- Add account type and currency labels.
- Add empty, loading, and error states.
- Add links to full statements in MoneyBook Web.

**Exit criteria**

- Users can find, edit, and delete their own transactions.
- Account balances refresh after mutations.
- Large lists remain usable on small screens.

### Phase 6: Shortcuts and recurring visibility

**Objectives**

- Reduce repeated data entry without expanding Lite into the full application.

**Tasks**

- Show existing shortcuts.
- Allow executing a shortcut with a user-entered amount.
- Show upcoming recurring transactions.
- Link shortcut and recurring administration to MoneyBook Web.

**Exit criteria**

- Shortcut execution creates a normal backend transaction.
- The Lite app does not create a second shortcut or recurring schema.

### Phase 7: PWA and offline behavior

**Objectives**

- Make MoneyBook Lite installable and reliable on phones.

**Tasks**

- Configure manifest, icons, theme colors, and standalone display.
- Add service worker configuration.
- Cache static application assets.
- Show a clear offline state.
- Do not silently queue financial mutations unless an explicit, tested sync design is added.

**Exit criteria**

- Lite can be installed from supported browsers.
- Static navigation works after an asset cache is available.
- Failed offline mutations are clearly reported and never falsely shown as saved.

### Phase 8: Security and financial validation

**Objectives**

- Verify that the second frontend does not weaken the existing system.

**Tasks**

- Test Clerk authentication from the Lite origin.
- Add the Lite origin to backend CORS configuration.
- Test cross-user resource access using changed IDs.
- Test withdrawal, deposit, and transfer accounting behavior.
- Test edit and delete balance effects.
- Test duplicate submissions and rapid repeated taps.
- Verify all amounts remain integer-cent based in the backend.

**Exit criteria**

- Unauthorized requests return consistent `401` responses.
- Cross-user access is rejected.
- Double-entry entries remain balanced.
- No financial mutation is performed client-side.

### Phase 9: Deployment and production release

**Objectives**

- Deploy Lite independently without changing MoneyBook Web.

**Tasks**

- Create a separate Cloudflare Pages project, for example `moneybook-lite`.
- Configure production variables:

```text
VITE_API_URL=https://api.moneybook.chamikacme.com
VITE_CLERK_PUBLISHABLE_KEY=<same MoneyBook Clerk publishable key>
```

- Add the production Lite origin to `ALLOWED_ORIGINS`.
- Add staging origins separately.
- Configure SPA fallback for client-side routes.
- Configure PWA assets and cache headers.
- Run production smoke tests.

**Exit criteria**

- MoneyBook Web remains available and unchanged.
- MoneyBook Lite can sign in and record transactions.
- Both applications read the same balances and transaction history.
- API observability identifies the calling origin and endpoint failures.

## 9. CORS and Environment Configuration

The backend currently allows the MoneyBook Web origin. It must be extended for Lite:

```text
ALLOWED_ORIGINS=https://moneybook.chamikacme.com,https://lite.moneybook.chamikacme.com
```

Local development may use separate Vite ports:

```text
http://localhost:5173
http://localhost:5174
```

Use separate staging and production origins. Do not use a wildcard origin in production.

## 10. Testing Strategy

### Frontend

- Typecheck
- Unit tests for API client and formatting
- Component tests for transaction form validation
- Route protection tests
- Responsive smoke tests
- PWA installability checks

### Backend

- Existing route and service tests
- Authentication tests
- Cross-user authorization tests
- Transaction invariant tests
- Duplicate mutation tests
- CORS origin tests

### End-to-end flows

1. Sign in
2. View dashboard
3. Record withdrawal
4. Confirm account balance update
5. Record deposit
6. Record transfer
7. Edit transaction
8. Delete transaction
9. Open MoneyBook Web and verify the same data

## 11. Release Strategy

MoneyBook Lite should be released independently:

1. Deploy backend CORS changes.
2. Deploy Lite to a staging origin.
3. Run authenticated and financial smoke tests.
4. Deploy Lite to production.
5. Verify shared data with MoneyBook Web.
6. Monitor API errors and transaction failures.
7. Keep MoneyBook Web as the advanced fallback.

The first Lite release should not require a D1 migration.

## 12. Completion Criteria

MoneyBook Lite is ready when:

- It is a separate frontend project.
- MoneyBook Web continues working unchanged.
- Both frontends use the same backend and D1 database.
- Both frontends use the same Clerk application.
- Daily withdrawal, deposit, and transfer flows work.
- Dashboard and account balances are consistent across both applications.
- All protected requests are authenticated and user-scoped.
- Mobile layouts work on common phone widths.
- The PWA can be installed.
- Offline failures are explicit and do not create false transaction success.
- Existing backend and frontend tests continue to pass.
