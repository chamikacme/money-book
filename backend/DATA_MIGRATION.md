# PostgreSQL to D1 Data Migration

The existing application stores data in Neon PostgreSQL. D1 uses SQLite, so production data must be exported and transformed before import.

## Migration rules

- Preserve all existing primary keys where possible.
- Preserve the Clerk `user_id` values exactly.
- Preserve monetary values as integer cents.
- Convert PostgreSQL timestamps to Unix epoch milliseconds.
- Convert `defined_net_worth_includes` from a PostgreSQL integer array to a JSON text array.
- Convert PostgreSQL booleans to SQLite integer values (`0` or `1`).
- Validate account, category, transaction, and entry references before import.
- Import in dependency order: categories, accounts, transactions, entries, budgets, goals, settings, recurring transactions, shortcuts.
- Reject the complete import if any row fails validation; do not partially import a user.

## Required process

1. Export the source PostgreSQL tables using a repeatable script.
2. Transform each row into the D1 schema shape.
3. Validate IDs, user ownership, foreign keys, dates, and amounts.
4. Import into a staging D1 database.
5. Compare row counts and account/report totals with PostgreSQL.
6. Run the same process against production only during the planned cutover.

The migration script will be added before production cutover. `backend/seeds/dev.sql` is only for local development and must never be used as a production data migration.

## Transform an exported dataset

The repeatable normalization step is available now:

```bash
node scripts/transform-postgres-export.mjs postgres-export.json d1-data.json
```

The input must contain arrays named `categories`, `accounts`, `transactions`, `transactionEntries`, `budgets`, `goals`, `userSettings`, `recurringTransactions`, and `shortcuts`. The script converts timestamps, booleans, arrays, and monetary values and rejects missing transaction references.
