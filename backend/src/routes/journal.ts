import { and, desc, eq, like, sql } from "drizzle-orm";
import { Hono } from "hono";
import { createDb } from "../db";
import { accounts, transactionEntries, transactions } from "../db/schema";
import { validateQuery } from "../middleware/validate";
import { paginationSchema } from "../validators/finance";
import { pageMeta } from "../services/helpers";
import type { AppEnv } from "../types/env";

export const journalRoutes = new Hono<AppEnv>();
journalRoutes.get("/journal", validateQuery(paginationSchema), async (c) => {
  const db = createDb(c.env.DB); const userId = c.get("userId"); const { page, pageSize, search } = c.req.valid("query");
  const where = search ? and(eq(transactions.userId, userId), like(transactions.description, `%${search}%`)) : eq(transactions.userId, userId);
  const rows = await db.select({ transaction: transactions, entry: transactionEntries, account: accounts }).from(transactions)
    .innerJoin(transactionEntries, eq(transactionEntries.transactionId, transactions.id)).leftJoin(accounts, eq(accounts.id, transactionEntries.accountId))
    .where(where).orderBy(desc(transactions.date)).limit(pageSize).offset((page - 1) * pageSize);
  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(transactions).where(where);
  return c.json({ data: rows, meta: pageMeta(page, pageSize, Number(count)) });
});
