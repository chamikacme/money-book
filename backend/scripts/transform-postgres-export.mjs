#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import process from "node:process";

const [, , inputPath, outputPath] = process.argv;
if (!inputPath || !outputPath) {
  console.error("Usage: node scripts/transform-postgres-export.mjs <input.json> <output.json>");
  process.exit(1);
}

const source = JSON.parse(await readFile(inputPath, "utf8"));
const tables = ["categories", "accounts", "transactions", "transactionEntries", "budgets", "goals", "userSettings", "recurringTransactions", "shortcuts"];
for (const table of tables) {
  if (!Array.isArray(source[table])) throw new Error(`Missing table array: ${table}`);
}

const epoch = (value) => value == null ? null : new Date(value).getTime();
const cents = (value) => Number.isInteger(value) ? value : Math.round(Number(value) * 100);
const boolean = (value) => value === true || value === 1 || value === "1";
const users = new Set();
const normalized = Object.fromEntries(tables.map((table) => [table, []]));

for (const row of source.categories) {
  users.add(row.user_id ?? row.userId);
  normalized.categories.push({ id: row.id, user_id: row.user_id ?? row.userId, name: row.name, type: row.type ?? null, created_at: epoch(row.created_at ?? row.createdAt) });
}
for (const row of source.accounts) {
  users.add(row.user_id ?? row.userId);
  normalized.accounts.push({ id: row.id, user_id: row.user_id ?? row.userId, name: row.name, type: row.type, balance: cents(row.balance), currency: row.currency ?? "USD", statement_balance: row.statement_balance == null ? null : cents(row.statement_balance), due_date: epoch(row.due_date ?? row.dueDate), default_category_id: row.default_category_id ?? row.defaultCategoryId ?? null, is_pinned: boolean(row.is_pinned ?? row.isPinned) ? 1 : 0, created_at: epoch(row.created_at ?? row.createdAt), updated_at: epoch(row.updated_at ?? row.updatedAt) });
}
for (const row of source.transactions) {
  users.add(row.user_id ?? row.userId);
  normalized.transactions.push({ id: row.id, user_id: row.user_id ?? row.userId, date: epoch(row.date), description: row.description, amount: cents(row.amount), category_id: row.category_id ?? row.categoryId ?? null, created_at: epoch(row.created_at ?? row.createdAt) });
}
for (const row of source.transactionEntries) normalized.transactionEntries.push({ id: row.id, transaction_id: row.transaction_id ?? row.transactionId, account_id: row.account_id ?? row.accountId, type: row.type, amount: cents(row.amount) });
for (const table of ["budgets", "goals", "recurringTransactions", "shortcuts"]) {
  for (const row of source[table]) {
    const userId = row.user_id ?? row.userId;
    if (userId) users.add(userId);
    const value = { ...row };
    for (const key of Object.keys(value)) {
      if (key.endsWith("_at") || key.endsWith("Date") || key === "date") value[key] = epoch(value[key]);
      if (["amount", "targetAmount", "currentAmount", "target_amount", "current_amount"].includes(key)) value[key] = cents(value[key]);
      if (["active", "completed"].includes(key)) value[key] = boolean(value[key]) ? 1 : 0;
    }
    normalized[table].push(value);
  }
}
for (const row of source.userSettings) {
  users.add(row.user_id ?? row.userId);
  normalized.userSettings.push({ ...row, user_id: row.user_id ?? row.userId, defined_net_worth_includes: JSON.stringify(row.defined_net_worth_includes ?? row.definedNetWorthIncludes ?? []), show_net_worth: boolean(row.show_net_worth ?? row.showNetWorth) ? 1 : 0, show_monthly_spending: boolean(row.show_monthly_spending ?? row.showMonthlySpending) ? 1 : 0, show_defined_net_worth: boolean(row.show_defined_net_worth ?? row.showDefinedNetWorth) ? 1 : 0 });
}

const ids = (rows) => new Set(rows.map((row) => row.id));
const categoryIds = ids(normalized.categories); const accountIds = ids(normalized.accounts); const transactionIds = ids(normalized.transactions);
for (const row of normalized.transactions) if (row.category_id && !categoryIds.has(row.category_id)) throw new Error(`Transaction ${row.id} references missing category ${row.category_id}`);
for (const row of normalized.transactionEntries) { if (!transactionIds.has(row.transaction_id)) throw new Error(`Entry ${row.id} references missing transaction ${row.transaction_id}`); if (!accountIds.has(row.account_id)) throw new Error(`Entry ${row.id} references missing account ${row.account_id}`); }

await writeFile(outputPath, JSON.stringify({ version: 1, source: "postgresql", users: [...users], ...normalized }, null, 2));
console.log(`Wrote normalized D1 data for ${users.size} users to ${outputPath}`);
