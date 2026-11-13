import { and, asc, desc, eq, gte, inArray, like, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { accounts, categories, goals, recurringTransactions, shortcuts, transactionEntries, transactions, userSettings } from "../db/schema";
import { createDb } from "../db";
import { validateJson, validateParam, validateQuery } from "../middleware/validate";
import { accountSchema, accountUpdateSchema, idParamSchema, paginationSchema, settingsSchema } from "../validators/finance";
import { cents, fail, pageMeta } from "../services/helpers";
import type { AppEnv } from "../types/env";
import { openingEntrySides } from "../services/transactions";

export const accountRoutes = new Hono<AppEnv>();

async function saveOpeningBalance(database: D1Database, userId: string, accountId: number, amount: number, date: number, currency: string) {
  const account = await database.prepare("SELECT type FROM accounts WHERE id = ? AND user_id = ? AND is_system = 0").bind(accountId, userId).first<{ type: string }>();
  if (!account) fail(404, "Account not found");
  const { accountSide, equitySide } = openingEntrySides(account.type as "asset" | "liability" | "expense" | "revenue" | "equity", amount);
  const key = `opening:${accountId}`;
  const equityAmount = Math.abs(amount);
  const statements = [
    database.prepare("INSERT OR IGNORE INTO accounts (user_id, name, type, balance, currency, is_system) VALUES (?, 'Opening Balances', 'equity', 0, ?, 1)").bind(userId, currency),
    database.prepare("INSERT OR IGNORE INTO transactions (user_id, date, description, amount, kind, posting_key) VALUES (?, ?, ?, ?, 'opening_balance', ?)").bind(userId, date, "Opening balance", equityAmount, key),
    database.prepare("UPDATE transactions SET date = ?, amount = ?, description = 'Opening balance' WHERE posting_key = ? AND user_id = ?").bind(date, equityAmount, key, userId),
    database.prepare("DELETE FROM transaction_entries WHERE transaction_id = (SELECT id FROM transactions WHERE posting_key = ? AND user_id = ?)").bind(key, userId),
    database.prepare("INSERT INTO transaction_entries (transaction_id, account_id, type, amount, date) SELECT t.id, a.id, ?, ?, ? FROM transactions t JOIN accounts a ON a.id = ? AND a.user_id = ? WHERE t.posting_key = ? AND t.user_id = ?").bind(accountSide, equityAmount, date, accountId, userId, key, userId),
    database.prepare("INSERT INTO transaction_entries (transaction_id, account_id, type, amount, date) SELECT t.id, e.id, ?, ?, ? FROM transactions t JOIN accounts e ON e.user_id = t.user_id AND e.is_system = 1 WHERE t.posting_key = ? AND t.user_id = ?").bind(equitySide, equityAmount, date, key, userId),
    database.prepare("UPDATE accounts SET balance = COALESCE((SELECT SUM(CASE WHEN (a.type IN ('asset', 'expense') AND e.type = 'debit') OR (a.type IN ('liability', 'revenue', 'equity') AND e.type = 'credit') THEN e.amount ELSE -e.amount END) FROM transaction_entries e WHERE e.account_id = a.id), 0) FROM accounts a WHERE accounts.id = a.id AND a.id = ? AND a.user_id = ?").bind(accountId, userId),
    database.prepare("UPDATE accounts SET balance = COALESCE((SELECT SUM(CASE WHEN (a.type IN ('asset', 'expense') AND e.type = 'debit') OR (a.type IN ('liability', 'revenue', 'equity') AND e.type = 'credit') THEN e.amount ELSE -e.amount END) FROM transaction_entries e WHERE e.account_id = a.id), 0) FROM accounts a WHERE accounts.id = a.id AND a.user_id = ? AND a.is_system = 1").bind(userId),
  ];
  await database.batch(statements);
}

const accountStatementQuerySchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
}).refine(({ startDate, endDate }) => startDate <= endDate, {
  message: "startDate must be before or equal to endDate",
});

accountRoutes.get("/accounts", validateQuery(paginationSchema), async (c) => {
  const db = createDb(c.env.DB);
  const userId = c.get("userId");
  const { page, pageSize, search } = c.req.valid("query");
  const offset = (page - 1) * pageSize;
  const where = search
    ? and(eq(accounts.userId, userId), eq(accounts.isSystem, false), like(accounts.name, `%${search}%`))
    : and(eq(accounts.userId, userId), eq(accounts.isSystem, false));
  const data = await db.select().from(accounts).where(where).orderBy(desc(accounts.updatedAt)).limit(pageSize).offset(offset);
  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(accounts).where(where);
  const openingRows = data.length ? await db.select({
    accountId: transactionEntries.accountId,
    startingBalance: sql<number>`coalesce(sum(case when (${accounts.type} in ('asset', 'expense') and ${transactionEntries.type} = 'debit') or (${accounts.type} in ('liability', 'revenue') and ${transactionEntries.type} = 'credit') then ${transactionEntries.amount} else -${transactionEntries.amount} end), 0)`,
  }).from(transactionEntries).innerJoin(transactions, eq(transactions.id, transactionEntries.transactionId))
    .innerJoin(accounts, eq(accounts.id, transactionEntries.accountId))
    .where(and(inArray(transactionEntries.accountId, data.map((account) => account.id)), eq(transactions.kind, "opening_balance")))
    .groupBy(transactionEntries.accountId) : [];
  const openingByAccount = new Map(openingRows.map((row) => [row.accountId, Number(row.startingBalance)]));
  const [settings] = await db.select({ currency: userSettings.currency }).from(userSettings).where(eq(userSettings.userId, userId)).limit(1);
  return c.json({ data: data.map((account) => ({ ...account, currency: settings?.currency ?? "LKR", startingBalance: openingByAccount.get(account.id) ?? 0 })), meta: pageMeta(page, pageSize, Number(count)) });
});

accountRoutes.get("/accounts/reconcile", async (c) => {
  const db = createDb(c.env.DB);
  const userId = c.get("userId");
  const rows = await db.select({
    account: accounts,
    calculated: sql<number>`coalesce(sum(case when (${accounts.type} in ('asset', 'expense') and ${transactionEntries.type} = 'debit') or (${accounts.type} in ('liability', 'revenue', 'equity') and ${transactionEntries.type} = 'credit') then ${transactionEntries.amount} else -${transactionEntries.amount} end), 0)`,
  }).from(accounts).leftJoin(transactionEntries, eq(transactionEntries.accountId, accounts.id))
    .where(eq(accounts.userId, userId)).groupBy(accounts.id);
  return c.json({ data: rows.filter(({ account, calculated }) => account.balance !== Number(calculated)).map(({ account, calculated }) => ({
    accountId: account.id, accountName: account.name, system: account.isSystem,
    cachedBalance: account.balance, ledgerBalance: Number(calculated), difference: Number(calculated) - account.balance,
  })) });
});

accountRoutes.post("/accounts/reconcile", async (c) => {
  const userId = c.get("userId");
  const result = await c.env.DB.prepare(`UPDATE accounts SET balance = COALESCE((
    SELECT SUM(CASE WHEN (a.type IN ('asset', 'expense') AND e.type = 'debit') OR (a.type IN ('liability', 'revenue', 'equity') AND e.type = 'credit') THEN e.amount ELSE -e.amount END)
    FROM transaction_entries e WHERE e.account_id = a.id
  ), 0) FROM accounts a WHERE accounts.id = a.id AND a.user_id = ?`).bind(userId).run();
  return c.json({ ok: true, updated: result.meta.changes });
});

accountRoutes.get("/accounts/:id/statement", validateParam(idParamSchema), validateQuery(accountStatementQuerySchema), async (c) => {
  const db = createDb(c.env.DB);
  const userId = c.get("userId");
  const { id } = c.req.valid("param");
  const { startDate, endDate } = c.req.valid("query");
  const [account] = await db.select().from(accounts)
    .where(and(eq(accounts.id, id), eq(accounts.userId, userId), eq(accounts.isSystem, false))).limit(1);
  if (!account) fail(404, "Account not found");
  const [displaySettings] = await db.select({ currency: userSettings.currency }).from(userSettings).where(eq(userSettings.userId, userId)).limit(1);

  const start = startDate.getTime();
  const endExclusive = Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate() + 1);
  const delta = sql`case
    when (${accounts.type} in ('asset', 'expense') and ${transactionEntries.type} = 'debit')
      or (${accounts.type} in ('liability', 'revenue') and ${transactionEntries.type} = 'credit')
      then ${transactionEntries.amount}
    else -${transactionEntries.amount}
  end`;
  const [totals] = await db.select({
    debitTotal: sql<number>`coalesce(sum(case when ${transactionEntries.date} >= ${start} and ${transactionEntries.date} < ${endExclusive} and ${transactionEntries.type} = 'debit' then ${transactionEntries.amount} else 0 end), 0)`,
    creditTotal: sql<number>`coalesce(sum(case when ${transactionEntries.date} >= ${start} and ${transactionEntries.date} < ${endExclusive} and ${transactionEntries.type} = 'credit' then ${transactionEntries.amount} else 0 end), 0)`,
    periodDelta: sql<number>`coalesce(sum(case when ${transactionEntries.date} >= ${start} and ${transactionEntries.date} < ${endExclusive} then (${delta}) else 0 end), 0)`,
    deltaSinceStart: sql<number>`coalesce(sum(case when ${transactionEntries.date} >= ${start} then (${delta}) else 0 end), 0)`,
  }).from(transactionEntries)
    .innerJoin(transactions, eq(transactions.id, transactionEntries.transactionId))
    .innerJoin(accounts, eq(accounts.id, transactionEntries.accountId))
    .where(and(eq(transactionEntries.accountId, id), eq(transactions.userId, userId)));

  const openingBalance = account.balance - Number(totals.deltaSinceStart);
  let runningBalance = openingBalance;
  const rows = await db.select({
      transaction: transactions,
      entry: transactionEntries,
    category: categories,
  }).from(transactionEntries)
    .innerJoin(transactions, eq(transactions.id, transactionEntries.transactionId))
    .leftJoin(categories, and(eq(categories.id, transactions.categoryId), eq(categories.userId, userId)))
    .where(and(
      eq(transactionEntries.accountId, id),
      eq(transactions.userId, userId),
      gte(transactionEntries.date, startDate),
      sql`${transactionEntries.date} < ${endExclusive}`,
    ))
    .orderBy(asc(transactionEntries.date), asc(transactions.id));
  const data = rows.map(({ transaction, entry, category }) => {
    const increases = account.type === "asset" || account.type === "expense"
      ? entry.type === "debit"
      : entry.type === "credit";
    runningBalance += increases ? entry.amount : -entry.amount;
    return { transaction, entry, category, balance: runningBalance };
  });

  return c.json({ data: {
    account: { ...account, currency: displaySettings?.currency ?? "LKR" },
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    openingBalance,
    debitTotal: Number(totals.debitTotal),
    creditTotal: Number(totals.creditTotal),
    endingBalance: openingBalance + Number(totals.periodDelta),
    entries: data,
    reconstructed: true,
  } });
});

accountRoutes.post("/accounts", validateJson(accountSchema), async (c) => {
  const db = createDb(c.env.DB);
  const input = c.req.valid("json");
  if (input.defaultCategoryId) {
    const [category] = await db.select({ id: categories.id }).from(categories).where(and(eq(categories.id, input.defaultCategoryId), eq(categories.userId, c.get("userId"))));
    if (!category) fail(404, "Default category not found");
  }
  const userId = c.get("userId");
  const [settings] = await db.select({ currency: userSettings.currency }).from(userSettings).where(eq(userSettings.userId, userId)).limit(1);
  const creationKey = crypto.randomUUID();
  const openingDate = Date.now();
  const startingBalance = cents(input.startingBalance);
  const { accountSide, equitySide } = openingEntrySides(input.type, startingBalance);
  const openingAmount = Math.abs(startingBalance);
  await c.env.DB.batch([
    c.env.DB.prepare("INSERT INTO accounts (user_id, name, type, balance, currency, statement_balance, due_date, default_category_id, is_system, creation_key, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?, ?, ?, 0, ?, ?, ?)").bind(userId, input.name, input.type, settings?.currency ?? "LKR", input.statementBalance == null ? null : cents(input.statementBalance), input.dueDate?.getTime() ?? null, input.defaultCategoryId ?? null, creationKey, openingDate, openingDate),
    c.env.DB.prepare("INSERT OR IGNORE INTO accounts (user_id, name, type, balance, currency, is_system) VALUES (?, 'Opening Balances', 'equity', 0, ?, 1)").bind(userId, settings?.currency ?? "LKR"),
    c.env.DB.prepare("INSERT INTO transactions (user_id, date, description, amount, kind, posting_key) SELECT user_id, ?, 'Opening balance', ?, 'opening_balance', 'opening:' || id FROM accounts WHERE creation_key = ?").bind(openingDate, openingAmount, creationKey),
    c.env.DB.prepare("INSERT INTO transaction_entries (transaction_id, account_id, type, amount, date) SELECT t.id, a.id, ?, ?, ? FROM transactions t JOIN accounts a ON t.posting_key = 'opening:' || a.id WHERE a.creation_key = ?").bind(accountSide, openingAmount, openingDate, creationKey),
    c.env.DB.prepare("INSERT INTO transaction_entries (transaction_id, account_id, type, amount, date) SELECT t.id, e.id, ?, ?, ? FROM transactions t JOIN accounts a ON t.posting_key = 'opening:' || a.id JOIN accounts e ON e.user_id = t.user_id AND e.is_system = 1 WHERE a.creation_key = ?").bind(equitySide, openingAmount, openingDate, creationKey),
    c.env.DB.prepare("UPDATE accounts SET balance = COALESCE((SELECT SUM(CASE WHEN (a.type IN ('asset', 'expense') AND x.type = 'debit') OR (a.type IN ('liability', 'revenue', 'equity') AND x.type = 'credit') THEN x.amount ELSE -x.amount END) FROM transaction_entries x WHERE x.account_id = a.id), 0) FROM accounts a WHERE accounts.id = a.id AND a.creation_key = ?").bind(creationKey),
    c.env.DB.prepare("UPDATE accounts SET balance = COALESCE((SELECT SUM(CASE WHEN (a.type IN ('asset', 'expense') AND x.type = 'debit') OR (a.type IN ('liability', 'revenue', 'equity') AND x.type = 'credit') THEN x.amount ELSE -x.amount END) FROM transaction_entries x WHERE x.account_id = a.id), 0) FROM accounts a WHERE accounts.id = a.id AND a.user_id = ? AND a.is_system = 1").bind(userId),
  ]);
  const [created] = await db.select().from(accounts).where(eq(accounts.creationKey, creationKey)).limit(1);
  return c.json({ data: created }, 201);
});

accountRoutes.patch("/accounts/:id", validateParam(idParamSchema), validateJson(accountUpdateSchema), async (c) => {
  const db = createDb(c.env.DB);
  const { id } = c.req.valid("param");
  const input = c.req.valid("json");
  const [existing] = await db.select().from(accounts).where(and(eq(accounts.id, id), eq(accounts.userId, c.get("userId")), eq(accounts.isSystem, false))).limit(1);
  if (!existing) fail(404, "Account not found");
  if (existing.type !== input.type) fail(409, "Account type cannot be changed after the account is created");
  if (input.defaultCategoryId) {
    const [category] = await db.select({ id: categories.id }).from(categories).where(and(eq(categories.id, input.defaultCategoryId), eq(categories.userId, c.get("userId"))));
    if (!category) fail(404, "Default category not found");
  }
  const [account] = await db.update(accounts).set({
    name: input.name, type: input.type,
    statementBalance: input.statementBalance == null ? null : cents(input.statementBalance),
    dueDate: input.dueDate ?? null, defaultCategoryId: input.defaultCategoryId ?? null,
    updatedAt: new Date(),
  }).where(and(eq(accounts.id, id), eq(accounts.userId, c.get("userId")))).returning();
  if (!account) fail(404, "Account not found");
  return c.json({ data: account });
});

accountRoutes.patch("/accounts/:id/opening-balance", validateParam(idParamSchema), validateJson(z.object({ startingBalance: z.coerce.number() })), async (c) => {
  const db = createDb(c.env.DB);
  const userId = c.get("userId");
  const { id } = c.req.valid("param");
  const [account] = await db.select().from(accounts).where(and(eq(accounts.id, id), eq(accounts.userId, userId), eq(accounts.isSystem, false))).limit(1);
  if (!account) fail(404, "Account not found");
  await saveOpeningBalance(c.env.DB, userId, id, cents(c.req.valid("json").startingBalance), account.createdAt.getTime(), account.currency);
  const [updated] = await db.select().from(accounts).where(eq(accounts.id, id)).limit(1);
  return c.json({ data: updated });
});

accountRoutes.patch("/accounts/:id/pin", validateParam(idParamSchema), validateJson(z.object({ isPinned: z.boolean() })), async (c) => {
  const db = createDb(c.env.DB);
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const [account] = await db.update(accounts).set({ isPinned: body.isPinned, updatedAt: new Date() })
    .where(and(eq(accounts.id, id), eq(accounts.userId, c.get("userId")))).returning();
  if (!account) fail(404, "Account not found");
  return c.json({ data: account });
});

accountRoutes.delete("/accounts/:id", validateParam(idParamSchema), async (c) => {
  const db = createDb(c.env.DB);
  const { id } = c.req.valid("param");
  const userId = c.get("userId");
  const [{ count: entries }] = await db.select({ count: sql<number>`count(*)` }).from(transactionEntries)
    .innerJoin(transactions, eq(transactionEntries.transactionId, transactions.id))
    .where(and(eq(transactionEntries.accountId, id), eq(transactions.userId, userId), sql`${transactions.kind} != 'opening_balance'`));
  const [{ count: linkedGoals }] = await db.select({ count: sql<number>`count(*)` }).from(goals)
    .where(and(eq(goals.accountId, id), eq(goals.userId, userId)));
  const [{ count: recurring }] = await db.select({ count: sql<number>`count(*)` }).from(recurringTransactions)
    .where(and(eq(recurringTransactions.userId, userId), sql`(${recurringTransactions.fromAccountId} = ${id} OR ${recurringTransactions.toAccountId} = ${id})`));
  const [{ count: shortcutCount }] = await db.select({ count: sql<number>`count(*)` }).from(shortcuts)
    .where(and(eq(shortcuts.userId, userId), sql`(${shortcuts.fromAccountId} = ${id} OR ${shortcuts.toAccountId} = ${id})`));
  if (Number(entries) || Number(linkedGoals) || Number(recurring) || Number(shortcutCount)) fail(409, "Account is still in use");
  const [account] = await db.select().from(accounts).where(and(eq(accounts.id, id), eq(accounts.userId, userId), eq(accounts.isSystem, false))).limit(1);
  if (!account) fail(404, "Account not found");
  const result = await c.env.DB.batch([
    c.env.DB.prepare("DELETE FROM transactions WHERE user_id = ? AND kind = 'opening_balance' AND id IN (SELECT transaction_id FROM transaction_entries WHERE account_id = ?)").bind(userId, id),
    c.env.DB.prepare("UPDATE accounts SET balance = COALESCE((SELECT SUM(CASE WHEN (a.type IN ('asset', 'expense') AND e.type = 'debit') OR (a.type IN ('liability', 'revenue', 'equity') AND e.type = 'credit') THEN e.amount ELSE -e.amount END) FROM transaction_entries e WHERE e.account_id = a.id), 0) FROM accounts a WHERE accounts.id = a.id AND a.user_id = ? AND a.is_system = 1").bind(userId),
    c.env.DB.prepare("DELETE FROM accounts WHERE id = ? AND user_id = ? AND is_system = 0 RETURNING id").bind(id, userId),
  ]);
  if (!result[2]?.results.length) fail(404, "Account not found");
  return c.body(null, 204);
});

accountRoutes.get("/settings", async (c) => {
  const db = createDb(c.env.DB);
  const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, c.get("userId"))).limit(1);
  return c.json({ data: settings ?? null });
});

accountRoutes.patch("/settings", validateJson(settingsSchema), async (c) => {
  const db = createDb(c.env.DB);
  const userId = c.get("userId");
  const updates = c.req.valid("json");
  const [existing] = await db.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1);
  const [settings] = existing
    ? await db.update(userSettings).set({ ...updates, updatedAt: new Date() }).where(eq(userSettings.userId, userId)).returning()
    : await db.insert(userSettings).values({ userId, currency: "LKR", ...updates }).returning();
  if (updates.currency) await db.update(accounts).set({ currency: updates.currency, updatedAt: new Date() }).where(eq(accounts.userId, userId));
  return c.json({ data: settings });
});
