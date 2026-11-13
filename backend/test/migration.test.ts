import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(resolve(process.cwd(), "migrations/0000_initial.sql"), "utf8");
const accountEntriesIndexMigration = readFileSync(resolve(process.cwd(), "migrations/0003_transaction_entries_account_id_idx.sql"), "utf8");
const ledgerMigration = readFileSync(resolve(process.cwd(), "migrations/0004_ledger_source_of_truth.sql"), "utf8");
const displayCurrencyMigration = readFileSync(resolve(process.cwd(), "migrations/0005_default_display_currency.sql"), "utf8");

describe("D1 migration", () => {
  it("creates every application table", () => {
    for (const table of ["categories", "accounts", "transactions", "transaction_entries", "budgets", "goals", "user_settings", "recurring_transactions", "shortcuts"]) {
      expect(migration).toContain(`CREATE TABLE \`${table}\``);
    }
  });

  it("uses integer cents and SQLite-compatible boolean columns", () => {
    expect(migration).toContain("`amount` integer NOT NULL");
    expect(migration).toContain("`is_pinned` integer DEFAULT 0 NOT NULL");
    expect(migration).not.toMatch(/CREATE TYPE|SERIAL|TIMESTAMP WITH TIME ZONE/i);
  });

  it("protects transaction entry cleanup with cascading foreign keys", () => {
    expect(migration).toContain("REFERENCES `transactions`(`id`) ON DELETE CASCADE");
    expect(migration).toContain("REFERENCES `accounts`(`id`) ON DELETE CASCADE");
  });

  it("indexes transaction entries by account for account-based lookups", () => {
    expect(accountEntriesIndexMigration).toContain("CREATE INDEX `transaction_entries_account_id_idx` ON `transaction_entries` (`account_id`)");
  });

  it("backfills dated, balanced opening ledger entries and cached balances", () => {
    expect(ledgerMigration).toContain("ALTER TABLE `transaction_entries` ADD COLUMN `date` integer");
    expect(ledgerMigration).toContain("'opening_balance'");
    expect(ledgerMigration).toContain("'Opening Balances', 'equity'");
    expect(ledgerMigration).toContain("UPDATE `accounts` SET `balance` = COALESCE");
  });

  it("keeps account display currency aligned without converting amounts", () => {
    expect(displayCurrencyMigration).toContain("SET `currency` = COALESCE");
    expect(displayCurrencyMigration).not.toMatch(/UPDATE `accounts` SET `balance`/);
  });
});
