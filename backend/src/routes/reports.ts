import { and, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { Hono } from "hono";
import { createDb } from "../db";
import { accounts, categories, transactionEntries, transactions } from "../db/schema";
import type { AppEnv } from "../types/env";

export const reportRoutes = new Hono<AppEnv>();
function monthStart(offset = 0) { const date = new Date(); return new Date(date.getFullYear(), date.getMonth() + offset, 1); }
function monthKey(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`; }
function months() { return Array.from({ length: 6 }, (_, index) => monthStart(index - 5)); }

// Transaction currency is the currency of the credited/source ledger account.
// Every transaction created by the service has one such entry.
async function categorizedTotals(db: ReturnType<typeof createDb>, userId: string, start: Date, end: Date, kind: "withdrawal" | "deposit", categoryType: "expense" | "revenue") {
  return db.select({ categoryId: transactions.categoryId, categoryName: categories.name, currency: accounts.currency, total: sql<number>`coalesce(sum(${transactions.amount}), 0)` })
    .from(transactions)
    .innerJoin(transactionEntries, and(eq(transactionEntries.transactionId, transactions.id), eq(transactionEntries.type, "credit")))
    .innerJoin(accounts, and(eq(accounts.id, transactionEntries.accountId), eq(accounts.userId, userId)))
    .leftJoin(categories, and(eq(categories.id, transactions.categoryId), eq(categories.userId, userId)))
    .where(and(eq(transactions.userId, userId), eq(transactions.kind, kind), eq(categories.type, categoryType), gte(transactions.date, start), lt(transactions.date, end)))
    .groupBy(transactions.categoryId, categories.name, accounts.currency);
}

reportRoutes.get("/reports/income-vs-expense", async (c) => {
  const db = createDb(c.env.DB); const userId = c.get("userId"); const starts = months(); const end = monthStart(1);
  const monthExpression = sql<string>`strftime('%Y-%m', ${transactions.date} / 1000, 'unixepoch')`;
  const [rows, currencyRows] = await Promise.all([
    db.select({
      month: monthExpression,
      currency: accounts.currency,
      income: sql<number>`coalesce(sum(case when ${transactions.kind} = 'deposit' and ${categories.type} = 'revenue' then ${transactions.amount} else 0 end), 0)`,
      expense: sql<number>`coalesce(sum(case when ${transactions.kind} = 'withdrawal' and ${categories.type} = 'expense' then ${transactions.amount} else 0 end), 0)`,
    }).from(transactions)
      .innerJoin(transactionEntries, and(eq(transactionEntries.transactionId, transactions.id), eq(transactionEntries.type, "credit")))
      .innerJoin(accounts, and(eq(accounts.id, transactionEntries.accountId), eq(accounts.userId, userId)))
      .leftJoin(categories, and(eq(categories.id, transactions.categoryId), eq(categories.userId, userId)))
      .where(and(eq(transactions.userId, userId), inArray(transactions.kind, ["withdrawal", "deposit"]), gte(transactions.date, starts[0]), lt(transactions.date, end)))
      .groupBy(monthExpression, accounts.currency),
    db.selectDistinct({ currency: accounts.currency }).from(accounts).where(eq(accounts.userId, userId)),
  ]);
  const currencies = currencyRows.map((row) => row.currency);
  const totals = new Map<string, { month: string; currency: string; income: number; expense: number }>();
  for (const date of starts) {
    for (const currency of currencies) {
      totals.set(`${monthKey(date)}:${currency}`, { month: monthKey(date), currency, income: 0, expense: 0 });
    }
  }
  for (const row of rows) {
    const item = totals.get(`${row.month}:${row.currency}`);
    if (item) { item.income = Number(row.income); item.expense = Number(row.expense); }
  }
  return c.json({ data: [...totals.values()] });
});

reportRoutes.get("/reports/spending-by-category", async (c) => {
  const db = createDb(c.env.DB); const userId = c.get("userId"); const start = monthStart(0); const end = monthStart(1);
  const data = await categorizedTotals(db, userId, start, end, "withdrawal", "expense");
  return c.json({ data: data.map((row) => ({ ...row, total: Number(row.total) })) });
});

reportRoutes.get("/reports/asset-allocation", async (c) => c.json({ data: await createDb(c.env.DB)
  .select({ id: accounts.id, name: accounts.name, balance: accounts.balance, type: accounts.type, currency: accounts.currency })
  .from(accounts).where(and(eq(accounts.userId, c.get("userId")), eq(accounts.type, "asset"))) }));

reportRoutes.get("/reports/net-worth-history", async (c) => {
  const db = createDb(c.env.DB); const userId = c.get("userId"); const dates = months();
  const accountRows = await db.select({ id: accounts.id, balance: accounts.balance, type: accounts.type, currency: accounts.currency, createdAt: accounts.createdAt })
    .from(accounts).where(and(eq(accounts.userId, userId), sql`${accounts.type} IN ('asset', 'liability')`));
  const entryMonth = sql<string>`strftime('%Y-%m', ${transactions.date} / 1000, 'unixepoch')`;
  const entryDeltas = await db.select({
    accountId: transactionEntries.accountId,
    month: entryMonth,
    delta: sql<number>`sum(case when (${accounts.type} = 'asset' and ${transactionEntries.type} = 'debit') or (${accounts.type} = 'liability' and ${transactionEntries.type} = 'credit') then ${transactionEntries.amount} * case when ${accounts.type} = 'asset' then 1 else -1 end else ${transactionEntries.amount} * case when ${accounts.type} = 'asset' then -1 else 1 end end)`,
  })
    .from(transactionEntries).innerJoin(transactions, eq(transactions.id, transactionEntries.transactionId))
    .innerJoin(accounts, and(eq(accounts.id, transactionEntries.accountId), eq(accounts.userId, userId)))
    .where(and(eq(transactions.userId, userId), sql`${accounts.type} IN ('asset', 'liability')`))
    .groupBy(transactionEntries.accountId, entryMonth);
  const accountsById = new Map(accountRows.map((account) => [account.id, account]));

  const data: Array<{ month: string; currency: string; amount: number }> = [];
  for (let index = 0; index < dates.length; index++) {
    const date = dates[index]; const cutoff = monthStart(index - 4).getTime() - 1;
    const totals = new Map<string, number>();
    for (const account of accountRows) {
      if (account.createdAt.getTime() > cutoff) continue;
      totals.set(account.currency, (totals.get(account.currency) ?? 0) + (account.type === "liability" ? -account.balance : account.balance));
    }
    for (const entry of entryDeltas) {
      if (entry.month <= monthKey(date)) continue;
      const account = accountsById.get(entry.accountId);
      if (!account || account.createdAt.getTime() > cutoff) continue;
      totals.set(account.currency, (totals.get(account.currency) ?? 0) - Number(entry.delta));
    }
    for (const [currency, amount] of totals) data.push({ month: monthKey(date), currency, amount });
  }
  return c.json({ data });
});

reportRoutes.get("/reports/income-by-category", async (c) => {
  const db = createDb(c.env.DB);
  const data = await categorizedTotals(db, c.get("userId"), monthStart(0), monthStart(1), "deposit", "revenue");
  return c.json({ data: data.map((row) => ({ ...row, total: Number(row.total) })) });
});
