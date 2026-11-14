# Backend Requirements

These are frontend dependencies identified during the redesign. Transaction list filters are implemented in the existing authenticated endpoint. Accurate transaction-kind, date-range, and currency-aware report aggregation remain outstanding.

## Transactions

### Filter and sort transactions

- **Purpose:** Support the transaction workspace's date-range, account, category, and category-type filters with stable sorting across all pages.
- **Suggested Method:** `GET`
- **Suggested Route:** Extend `/api/transactions` (already exists).
- **Authentication:** Clerk-authenticated; scope every result and count to the current user.
- **Request Parameters:** Existing `page`, `pageSize`, `search`; optional `startDate`, `endDate`, `accountId`, `categoryId`, `categoryType` (`expense`, `revenue`, or `uncategorized`), `sortBy`, and `sortOrder`.
- **Expected Response:** Existing `{ data: Transaction[], meta: { page, pageSize, totalCount, totalPages } }`, filtered consistently in both `data` and `meta`.
- **Frontend Usage:** Transactions page filters, sorting, and pagination.
- **Priority:** Medium
- **Implementation Status:** Implemented in `backend/src/routes/transactions.ts` and `backend/src/validators/finance.ts`.
- **Dependencies:** Transaction, category, and transaction-entry/account relationships; validate account ownership and supported transaction types.
- **Notes:** Date bounds are inclusive. Category type is used rather than transaction type because transaction type is not stored on the transaction record. Account filtering matches ledger entries. Sorting is deterministic with creation time as a secondary order.

## Reports

### Date-range and currency-aware report aggregation

- **Purpose:** Allow future report and dashboard date selectors to request a consistent range, correctly distinguish transfers from income/expenses, and prevent combining monetary amounts with different currencies.
- **Suggested Method:** `GET`
- **Suggested Route:** Extend existing `/api/reports/income-vs-expense`, `/api/reports/spending-by-category`, and `/api/reports/net-worth-history` endpoints with shared optional query parameters.
- **Authentication:** Clerk-authenticated; scope all rows to the current user.
- **Request Parameters:** Proposed `startDate`, `endDate`, and `currency` (or an explicit documented rule restricting aggregation to a single currency). Keep current defaults when omitted for compatibility.
- **Expected Response:** Existing report-specific `{ data: [...] }` shape, with currency and period semantics documented; totals must include only compatible monetary records.
- **Frontend Usage:** Dashboard cash-flow chart and reports date-range controls.
- **Priority:** Medium
- **Implementation Status:** Currency is now included in report rows and aggregations are grouped by currency. The frontend selects one account currency and never sums unlike currencies. Optional date-range parameters remain unimplemented.
- **Dependencies:** Transaction currency is taken from its credited/source account at report time. Historical account currency changes are not versioned; avoid changing an account's currency after recording transactions or add immutable transaction currency before supporting that workflow.
- **Notes:** No conversion is performed. The report date window remains the existing rolling six months/current month.

### Transaction-kind-aware financial summaries

- **Purpose:** Keep transfers out of income and expense totals, and provide genuine historical net-worth values rather than cumulative category flow.
- **Suggested Method:** `GET`
- **Suggested Route:** Correct or version `/api/reports/income-vs-expense`, `/api/reports/spending-by-category`, `/api/reports/net-worth-history`, and `/api/dashboard`.
- **Authentication:** Clerk-authenticated; scope all rows and aggregation inputs to the current user.
- **Request Parameters:** Preserve existing contracts; coordinate optional date range and currency parameters with the report aggregation requirement above.
- **Expected Response:** Monthly income, expense, spending categories, and net-worth history based on transaction kind and ledger account effects. Transfers must not count as income or expense.
- **Frontend Usage:** Dashboard financial summary and Reports page.
- **Priority:** High
- **Implementation Status:** Transaction kind is persisted for new/edited transactions. Reports include only deposits/withdrawals with matching income/expense category types; transfers are excluded. Net-worth history is reconstructed from current asset/liability balances and ledger entries.
- **Dependencies:** Existing rows that cannot be confidently classified are marked `unknown` by migration and excluded from income/expense totals. Account balance edits are not represented as ledger events, and transaction history is mutable; therefore reconstructed history can be inaccurate if balances were manually reconciled or old transactions were changed/deleted. Immutable balance snapshots/events are still required for guaranteed historical accuracy.
- **Notes:** The migration classifies obvious asset/liability-only transfers as transfers and rows with expense/revenue ledger accounts accordingly; ambiguous legacy shapes remain unknown. Dashboard and report copy now describes the updated metrics. Do not claim audit-grade historical net worth until balance adjustments and transaction revisions are recorded immutably.
