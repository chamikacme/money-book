import { and, asc, desc, eq, gte, inArray, isNull, like, lte, sql } from "drizzle-orm";
import { Hono } from "hono";
import { createDb } from "../db";
import { accounts, categories, transactionEntries, transactions } from "../db/schema";
import { validateJson, validateParam, validateQuery } from "../middleware/validate";
import { idParamSchema, transactionListQuerySchema, transactionSchema } from "../validators/finance";
import { fail, pageMeta } from "../services/helpers";
import { insertTransaction, reverseTransaction, updateTransaction } from "../services/transactions";
import type { AppEnv } from "../types/env";

export const transactionRoutes = new Hono<AppEnv>();

transactionRoutes.get("/transactions", validateQuery(transactionListQuerySchema), async (c) => {
  const db = createDb(c.env.DB); const userId = c.get("userId");
  const { page, pageSize, search, startDate, endDate, accountId, categoryId, categoryType, sortBy, sortOrder } = c.req.valid("query"); const offset = (page - 1) * pageSize;
  const filters = [eq(transactions.userId, userId)];
  if (search) filters.push(like(transactions.description, `%${search}%`));
  if (startDate) filters.push(gte(transactions.date, startDate));
  if (endDate) filters.push(lte(transactions.date, endDate));
  if (accountId) filters.push(inArray(transactions.id, db.select({ id: transactionEntries.transactionId }).from(transactionEntries).innerJoin(accounts, eq(transactionEntries.accountId, accounts.id)).where(and(eq(transactionEntries.accountId, accountId), eq(accounts.userId, userId)))));
  if (categoryId) filters.push(eq(transactions.categoryId, categoryId));
  if (categoryType === "uncategorized") filters.push(isNull(transactions.categoryId));
  else if (categoryType) filters.push(eq(categories.type, categoryType));
  const where = and(...filters);
  const sortColumn = sortBy === "amount" ? transactions.amount : sortBy === "description" ? transactions.description : transactions.date;
  const orderBy = sortOrder === "asc" ? asc(sortColumn) : desc(sortColumn);
  const rows = await db.select({ transaction: transactions, category: categories }).from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id)).where(where)
    .orderBy(orderBy, desc(transactions.createdAt)).limit(pageSize).offset(offset);
  const transactionIds = rows.map(({ transaction }) => transaction.id);
  const entryRows = transactionIds.length
    ? await db.select({ transactionId: transactionEntries.transactionId, entry: transactionEntries, account: accounts })
      .from(transactionEntries).leftJoin(accounts, eq(transactionEntries.accountId, accounts.id))
      .where(inArray(transactionEntries.transactionId, transactionIds))
    : [];
  const entriesByTransaction = new Map<number, typeof entryRows>();
  for (const row of entryRows) {
    const entries = entriesByTransaction.get(row.transactionId) ?? [];
    entries.push(row);
    entriesByTransaction.set(row.transactionId, entries);
  }
  const data = rows.map(({ transaction, category }) => ({
    ...transaction,
    category,
    entries: entriesByTransaction.get(transaction.id) ?? [],
  }));
  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id)).where(where);
  return c.json({ data, meta: pageMeta(page, pageSize, Number(count)) });
});

transactionRoutes.post("/transactions", validateJson(transactionSchema), async (c) => {
  const record = await insertTransaction(createDb(c.env.DB), c.get("userId"), c.req.valid("json"));
  return c.json({ data: record }, 201);
});

transactionRoutes.patch("/transactions/:id", validateParam(idParamSchema), validateJson(transactionSchema), async (c) => {
  const record = await updateTransaction(createDb(c.env.DB), c.get("userId"), c.req.valid("param").id, c.req.valid("json"));
  return c.json({ data: record });
});

transactionRoutes.delete("/transactions/:id", validateParam(idParamSchema), async (c) => {
  await reverseTransaction(createDb(c.env.DB), c.get("userId"), c.req.valid("param").id);
  return c.body(null, 204);
});
