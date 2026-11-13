import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { Hono } from "hono";
import { createDb } from "../db";
import { accounts, budgets, categories, recurringTransactions, transactionEntries, transactions } from "../db/schema";
import { validateQuery } from "../middleware/validate";
import { z } from "zod";
import type { AppEnv } from "../types/env";

export const dashboardRoutes = new Hono<AppEnv>();
dashboardRoutes.get("/dashboard", async (c) => {
  const db = createDb(c.env.DB); const userId = c.get("userId"); const now = new Date(); const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const [accountRows, recent, month, upcoming, budgetRows] = await Promise.all([
    db.select().from(accounts).where(and(eq(accounts.userId, userId), eq(accounts.isSystem, false))).orderBy(desc(accounts.updatedAt)),
    db.select({ transaction: transactions, category: categories }).from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(eq(transactions.userId, userId)).orderBy(desc(transactions.date)).limit(5),
    db.select({ total: sql<number>`coalesce(sum(${transactions.amount}), 0)` }).from(transactions).where(and(eq(transactions.userId, userId), gte(transactions.date, start))),
    db.select().from(recurringTransactions).where(and(eq(recurringTransactions.userId, userId), eq(recurringTransactions.active, true))).orderBy(recurringTransactions.nextRunDate).limit(5),
    db.select({ budget: budgets, category: categories }).from(budgets)
      .leftJoin(categories, eq(budgets.categoryId, categories.id)).where(eq(budgets.userId, userId)),
  ]);
  const recentIds = recent.map(({ transaction }) => transaction.id);
  const budgetCategoryIds = budgetRows.map(({ budget }) => budget.categoryId);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();
  const [entryRows, spentRows] = await Promise.all([
    recentIds.length
      ? db.select({ transactionId: transactionEntries.transactionId, entry: transactionEntries, account: accounts })
        .from(transactionEntries).leftJoin(accounts, eq(transactionEntries.accountId, accounts.id))
        .where(inArray(transactionEntries.transactionId, recentIds))
      : Promise.resolve([]),
    budgetCategoryIds.length
      ? db.select({ categoryId: transactions.categoryId, spent: sql<number>`coalesce(sum(${transactions.amount}), 0)` })
        .from(transactions)
        .where(and(eq(transactions.userId, userId), inArray(transactions.categoryId, budgetCategoryIds),
          gte(transactions.date, new Date(monthStart)),
          sql`${transactions.date} < ${nextMonthStart}`))
        .groupBy(transactions.categoryId)
      : Promise.resolve([]),
  ]);
  const entriesByTransaction = new Map<number, typeof entryRows>();
  for (const row of entryRows) {
    const entries = entriesByTransaction.get(row.transactionId) ?? [];
    entries.push(row);
    entriesByTransaction.set(row.transactionId, entries);
  }
  const spentByCategory = new Map(spentRows.map(({ categoryId, spent }) => [categoryId, Number(spent)]));
  return c.json({ data: {
    accounts: accountRows,
    recentTransactions: recent.map(({ transaction, category }) => ({
      ...transaction, category, entries: entriesByTransaction.get(transaction.id) ?? [],
    })),
    monthlySpending: Number(month[0]?.total ?? 0),
    upcomingRecurring: upcoming,
    budgets: budgetRows.map(({ budget, category }) => {
      const spent = spentByCategory.get(budget.categoryId) ?? 0;
      return { ...budget, category, spent, remaining: budget.amount - spent, progress: Math.min((spent / budget.amount) * 100, 100) };
    }),
  } });
});

dashboardRoutes.get("/dashboard/recent-transactions", validateQuery(z.object({ limit: z.coerce.number().int().min(1).max(100).default(5) })), async (c) => c.json({ data: await createDb(c.env.DB).select().from(transactions).where(eq(transactions.userId, c.get("userId"))).orderBy(desc(transactions.date)).limit(c.req.valid("query").limit) }));
