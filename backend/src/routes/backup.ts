import { Hono } from "hono";
import { and, eq, inArray, sql } from "drizzle-orm";
import { createDb } from "../db";
import { accounts, budgets, categories, goals, recurringTransactions, shortcuts, transactionEntries, transactions, userSettings } from "../db/schema";
import { fail } from "../services/helpers";
import { backupSchema } from "../validators/finance";
import { validateJson } from "../middleware/validate";
import type { AppEnv } from "../types/env";

export const backupRoutes = new Hono<AppEnv>();
backupRoutes.get("/backup/export", async (c) => {
  const db = createDb(c.env.DB); const userId = c.get("userId");
  const [settings, accountRows, categoryRows, transactionRows, budgetRows, goalRows, recurringRows, shortcutRows] = await Promise.all([
    db.select().from(userSettings).where(eq(userSettings.userId, userId)),
    db.select().from(accounts).where(eq(accounts.userId, userId)), db.select().from(categories).where(eq(categories.userId, userId)),
    db.select().from(transactions).where(eq(transactions.userId, userId)),
    db.select().from(budgets).where(eq(budgets.userId, userId)), db.select().from(goals).where(eq(goals.userId, userId)),
    db.select().from(recurringTransactions).where(eq(recurringTransactions.userId, userId)), db.select().from(shortcuts).where(eq(shortcuts.userId, userId)),
  ]);
  const entryRows = transactionRows.length
    ? await db.select().from(transactionEntries).where(inArray(transactionEntries.transactionId, transactionRows.map((row) => row.id)))
    : [];
  return c.json({ version: 1, exportedAt: new Date().toISOString(), userSettings: settings[0] ?? null, accounts: accountRows, categories: categoryRows, transactions: transactionRows, transactionEntries: entryRows, budgets: budgetRows, goals: goalRows, recurringTransactions: recurringRows, shortcuts: shortcutRows });
});

backupRoutes.post("/backup/import", validateJson(backupSchema), async (c) => {
  const db = createDb(c.env.DB); const userId = c.get("userId"); const body = c.req.valid("json");
  const tableIds = [
    ["accounts", body.accounts.map((row) => row.id)],
    ["categories", body.categories.map((row) => row.id)],
    ["transactions", body.transactions.map((row) => row.id)],
    ["budgets", body.budgets.map((row) => row.id)],
    ["goals", body.goals.map((row) => row.id)],
    ["recurring_transactions", body.recurringTransactions.map((row) => row.id)],
    ["shortcuts", body.shortcuts.map((row) => row.id)],
  ] as const;
  // IDs are global in D1. Reject collisions with another user rather than
  // overwriting unrelated data during a restore.
  const collisions = await Promise.all(tableIds.map(async ([table, ids]) => {
    if (!ids.length) return false;
    const result = await c.env.DB.prepare(`SELECT id FROM ${table} WHERE id IN (${ids.map(() => "?").join(",")}) AND user_id != ?`).bind(...ids, userId).all();
    return result.results.length > 0;
  }));
  if (collisions.some(Boolean)) fail(409, "Backup contains IDs used by another user");

  const timestamp = (value: unknown, fallback = Date.now()) => {
    if (typeof value === "number") return value;
    if (typeof value === "string") { const parsed = Date.parse(value); if (!Number.isNaN(parsed)) return parsed; }
    return fallback;
  };
  const field = (row: Record<string, unknown>, camel: string, snake = camel) => row[camel] ?? row[snake];
  const statements: D1PreparedStatement[] = [];
  const add = (query: string, ...values: unknown[]) => { statements.push(c.env.DB.prepare(query).bind(...values)); };

  // D1 batch() is atomic: if any statement fails, the complete restore rolls back.
  add("DELETE FROM transaction_entries WHERE transaction_id IN (SELECT id FROM transactions WHERE user_id = ?)", userId);
  add("DELETE FROM transactions WHERE user_id = ?", userId);
  add("DELETE FROM budgets WHERE user_id = ?", userId);
  add("DELETE FROM recurring_transactions WHERE user_id = ?", userId);
  add("DELETE FROM shortcuts WHERE user_id = ?", userId);
  add("DELETE FROM goals WHERE user_id = ?", userId);
  add("DELETE FROM user_settings WHERE user_id = ?", userId);
  add("DELETE FROM accounts WHERE user_id = ?", userId);
  add("DELETE FROM categories WHERE user_id = ?", userId);

  for (const row of body.categories) add("INSERT INTO categories (id, user_id, name, type, created_at) VALUES (?, ?, ?, ?, ?)", row.id, userId, String(row.name), row.type == null ? null : String(row.type), timestamp(field(row, "createdAt", "created_at")));
  for (const row of body.accounts) add("INSERT INTO accounts (id, user_id, name, type, balance, currency, statement_balance, due_date, default_category_id, is_pinned, is_system, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", row.id, userId, String(row.name), String(row.type), Number(row.balance ?? 0), String(body.userSettings?.currency ?? row.currency ?? "LKR"), row.statementBalance == null ? null : Number(row.statementBalance), row.dueDate == null ? null : timestamp(row.dueDate), row.defaultCategoryId == null ? null : Number(row.defaultCategoryId), row.isPinned ? 1 : 0, field(row, "isSystem", "is_system") ? 1 : 0, timestamp(field(row, "createdAt", "created_at")), timestamp(field(row, "updatedAt", "updated_at")));
  for (const row of body.transactions) add("INSERT INTO transactions (id, user_id, date, description, amount, kind, category_id, posting_key, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", row.id, userId, timestamp(row.date), String(row.description), Number(row.amount), String(row.kind ?? "unknown"), row.categoryId == null ? null : Number(row.categoryId), field(row, "postingKey", "posting_key") == null ? null : String(field(row, "postingKey", "posting_key")), timestamp(field(row, "createdAt", "created_at")));
  for (const row of body.transactionEntries) add("INSERT INTO transaction_entries (id, transaction_id, account_id, type, amount, date) VALUES (?, ?, ?, ?, ?, COALESCE(?, (SELECT date FROM transactions WHERE id = ?)))", row.id, Number(field(row, "transactionId", "transaction_id")), Number(field(row, "accountId", "account_id")), String(row.type), Number(row.amount), row.date == null ? null : timestamp(row.date), Number(field(row, "transactionId", "transaction_id")));
  for (const row of body.budgets) add("INSERT INTO budgets (id, user_id, category_id, amount, period, created_at) VALUES (?, ?, ?, ?, ?, ?)", row.id, userId, Number(field(row, "categoryId", "category_id")), Number(row.amount), String(row.period), timestamp(field(row, "createdAt", "created_at")));
  for (const row of body.goals) add("INSERT INTO goals (id, user_id, name, target_amount, current_amount, account_id, completed, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", row.id, userId, String(row.name), Number(field(row, "targetAmount", "target_amount")), Number(field(row, "currentAmount", "current_amount") ?? 0), row.accountId == null ? null : Number(row.accountId), row.completed ? 1 : 0, timestamp(field(row, "createdAt", "created_at")));
  for (const row of body.recurringTransactions) add("INSERT INTO recurring_transactions (id, user_id, description, amount, category_id, type, from_account_id, to_account_id, frequency, next_run_date, last_run_date, active, total_occurrences, completed_occurrences, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", row.id, userId, String(row.description), Number(row.amount), row.categoryId == null ? null : Number(row.categoryId), String(row.type), row.fromAccountId == null ? null : Number(row.fromAccountId), row.toAccountId == null ? null : Number(row.toAccountId), String(row.frequency), timestamp(row.nextRunDate), row.lastRunDate == null ? null : timestamp(row.lastRunDate), row.active === false ? 0 : 1, row.totalOccurrences == null ? null : Number(row.totalOccurrences), Number(row.completedOccurrences ?? 0), timestamp(field(row, "createdAt", "created_at")));
  for (const row of body.shortcuts) add("INSERT INTO shortcuts (id, user_id, name, description, icon, from_account_id, to_account_id, category_id, type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", row.id, userId, String(row.name), row.description == null ? null : String(row.description), row.icon == null ? null : String(row.icon), Number(row.fromAccountId), Number(row.toAccountId), row.categoryId == null ? null : Number(row.categoryId), String(row.type ?? "withdrawal"), timestamp(field(row, "createdAt", "created_at")));
  if (body.userSettings) add("INSERT INTO user_settings (user_id, currency, show_net_worth, show_monthly_spending, show_defined_net_worth, defined_net_worth_includes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", userId, String(body.userSettings.currency ?? "LKR"), body.userSettings.showNetWorth === false ? 0 : 1, body.userSettings.showMonthlySpending === false ? 0 : 1, body.userSettings.showDefinedNetWorth ? 1 : 0, JSON.stringify(body.userSettings.definedNetWorthIncludes ?? []), timestamp(field(body.userSettings, "createdAt", "created_at")), Date.now());

  await c.env.DB.batch(statements);
  return c.json({ ok: true });
});
