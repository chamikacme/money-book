import { and, desc, eq, inArray, lte, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { createDb } from "../db";
import { accounts, categories, recurringTransactions } from "../db/schema";
import { validateJson, validateParam, validateQuery } from "../middleware/validate";
import { idParamSchema, paginationSchema, recurringSchema } from "../validators/finance";
import { cents, fail, pageMeta } from "../services/helpers";
import { insertTransaction } from "../services/transactions";
import type { AppEnv } from "../types/env";

export const recurringRoutes = new Hono<AppEnv>();

export function advanceDate(date: Date, frequency: string) {
  const next = new Date(date);
  if (frequency === "daily") next.setDate(next.getDate() + 1);
  else if (frequency === "weekly") next.setDate(next.getDate() + 7);
  else if (frequency === "yearly") next.setFullYear(next.getFullYear() + 1);
  else {
    const day = next.getDate();
    next.setDate(1);
    next.setMonth(next.getMonth() + 1);
    const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
    next.setDate(Math.min(day, lastDay));
  }
  return next;
}

recurringRoutes.get("/recurring-transactions", validateQuery(paginationSchema), async (c) => {
  const db = createDb(c.env.DB); const userId = c.get("userId"); const { page, pageSize } = c.req.valid("query");
  const data = await db.select().from(recurringTransactions).where(eq(recurringTransactions.userId, userId))
    .orderBy(desc(recurringTransactions.nextRunDate)).limit(pageSize).offset((page - 1) * pageSize);
  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(recurringTransactions).where(eq(recurringTransactions.userId, userId));
  return c.json({ data, meta: pageMeta(page, pageSize, Number(count)) });
});

recurringRoutes.get("/recurring-transactions/upcoming", async (c) => {
  const db = createDb(c.env.DB); const now = new Date();
  return c.json({ data: await db.select().from(recurringTransactions).where(and(eq(recurringTransactions.userId, c.get("userId")), eq(recurringTransactions.active, true), lte(recurringTransactions.nextRunDate, now))).orderBy(recurringTransactions.nextRunDate) });
});

recurringRoutes.post("/recurring-transactions", validateJson(recurringSchema), async (c) => {
  const input = c.req.valid("json"); const db = createDb(c.env.DB); const userId = c.get("userId");
  const accountIds = [input.fromAccountId, input.toAccountId].filter((id): id is number => Boolean(id));
  const ownedAccounts = await db.select({ id: accounts.id }).from(accounts).where(and(eq(accounts.userId, userId), inArray(accounts.id, accountIds)));
  if (ownedAccounts.length !== new Set(accountIds).size) fail(404, "Recurring account not found");
  if (input.categoryId) {
    const [category] = await db.select({ id: categories.id }).from(categories).where(and(eq(categories.id, input.categoryId), eq(categories.userId, userId)));
    if (!category) fail(404, "Recurring category not found");
  }
  const [record] = await db.insert(recurringTransactions).values({
    userId, description: input.description, amount: cents(input.amount), categoryId: input.categoryId ?? null,
    type: input.type, fromAccountId: input.fromAccountId, toAccountId: input.toAccountId ?? null, frequency: input.frequency,
    nextRunDate: input.nextRunDate, totalOccurrences: input.totalOccurrences ?? null,
  }).returning();
  return c.json({ data: record }, 201);
});

recurringRoutes.patch("/recurring-transactions/:id", validateParam(idParamSchema), validateJson(recurringSchema), async (c) => {
  const input = c.req.valid("json"); const db = createDb(c.env.DB);
  const [record] = await db.update(recurringTransactions).set({ description: input.description, amount: cents(input.amount), categoryId: input.categoryId ?? null, type: input.type, fromAccountId: input.fromAccountId, toAccountId: input.toAccountId ?? null, frequency: input.frequency, nextRunDate: input.nextRunDate, totalOccurrences: input.totalOccurrences ?? null })
    .where(and(eq(recurringTransactions.id, c.req.valid("param").id), eq(recurringTransactions.userId, c.get("userId")))).returning();
  if (!record) fail(404, "Recurring transaction not found");
  return c.json({ data: record });
});

recurringRoutes.patch("/recurring-transactions/:id/active", validateParam(idParamSchema), validateJson(z.object({ active: z.boolean() })), async (c) => {
  const body = await c.req.json<{ active: boolean }>(); const db = createDb(c.env.DB);
  const [record] = await db.update(recurringTransactions).set({ active: body.active }).where(and(eq(recurringTransactions.id, c.req.valid("param").id), eq(recurringTransactions.userId, c.get("userId")))).returning();
  if (!record) fail(404, "Recurring transaction not found");
  return c.json({ data: record });
});

recurringRoutes.post("/recurring-transactions/:id/execute", validateParam(idParamSchema), async (c) => {
  const db = createDb(c.env.DB); const id = c.req.valid("param").id; const userId = c.get("userId");
  const [recurring] = await db.select().from(recurringTransactions).where(and(eq(recurringTransactions.id, id), eq(recurringTransactions.userId, userId)));
  if (!recurring) fail(404, "Recurring transaction not found");
  const runDate = recurring.nextRunDate;
  await insertTransaction(db, userId, { date: runDate, description: recurring.description, amount: recurring.amount / 100, categoryId: recurring.categoryId, type: recurring.type as "withdrawal" | "deposit" | "transfer", fromAccountId: recurring.fromAccountId!, toAccountId: recurring.toAccountId });
  const completed = recurring.completedOccurrences + 1;
  const shouldDeactivate = recurring.totalOccurrences != null && completed >= recurring.totalOccurrences;
  await db.update(recurringTransactions).set({ lastRunDate: runDate, completedOccurrences: completed, nextRunDate: advanceDate(runDate, recurring.frequency), active: shouldDeactivate ? false : recurring.active }).where(eq(recurringTransactions.id, id));
  return c.json({ ok: true });
});

recurringRoutes.post("/recurring-transactions/:id/skip", validateParam(idParamSchema), async (c) => {
  const db = createDb(c.env.DB); const id = c.req.valid("param").id;
  const current = await db.query.recurringTransactions.findFirst({ where: and(eq(recurringTransactions.id, id), eq(recurringTransactions.userId, c.get("userId"))) });
  if (!current) fail(404, "Recurring transaction not found");
  const [record] = await db.update(recurringTransactions).set({ nextRunDate: advanceDate(current.nextRunDate, current.frequency) }).where(eq(recurringTransactions.id, id)).returning();
  if (!record) fail(404, "Recurring transaction not found");
  return c.json({ data: record });
});

recurringRoutes.delete("/recurring-transactions/:id", validateParam(idParamSchema), async (c) => {
  const db = createDb(c.env.DB); const result = await db.delete(recurringTransactions).where(and(eq(recurringTransactions.id, c.req.valid("param").id), eq(recurringTransactions.userId, c.get("userId")))).returning({ id: recurringTransactions.id });
  if (!result.length) fail(404, "Recurring transaction not found");
  return c.body(null, 204);
});
