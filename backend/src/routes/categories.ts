import { and, desc, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { accounts, budgets, categories, recurringTransactions, shortcuts, transactions } from "../db/schema";
import { createDb } from "../db";
import { validateJson, validateParam } from "../middleware/validate";
import { categorySchema, idParamSchema } from "../validators/finance";
import { fail } from "../services/helpers";
import type { AppEnv } from "../types/env";

export const categoryRoutes = new Hono<AppEnv>();

categoryRoutes.get("/categories", async (c) => {
  const db = createDb(c.env.DB);
  return c.json({ data: await db.select().from(categories).where(eq(categories.userId, c.get("userId"))).orderBy(desc(categories.createdAt)) });
});

categoryRoutes.post("/categories", validateJson(categorySchema), async (c) => {
  const db = createDb(c.env.DB);
  const [category] = await db.insert(categories).values({ userId: c.get("userId"), ...c.req.valid("json") }).returning();
  return c.json({ data: category }, 201);
});

categoryRoutes.patch("/categories/:id", validateParam(idParamSchema), validateJson(categorySchema), async (c) => {
  const db = createDb(c.env.DB);
  const [category] = await db.update(categories).set(c.req.valid("json"))
    .where(and(eq(categories.id, c.req.valid("param").id), eq(categories.userId, c.get("userId")))).returning();
  if (!category) fail(404, "Category not found");
  return c.json({ data: category });
});

categoryRoutes.delete("/categories/:id", validateParam(idParamSchema), async (c) => {
  const db = createDb(c.env.DB);
  const id = c.req.valid("param").id;
  const userId = c.get("userId");
  const checks = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(transactions).where(and(eq(transactions.categoryId, id), eq(transactions.userId, userId))),
    db.select({ count: sql<number>`count(*)` }).from(budgets).where(and(eq(budgets.categoryId, id), eq(budgets.userId, userId))),
    db.select({ count: sql<number>`count(*)` }).from(recurringTransactions).where(and(eq(recurringTransactions.categoryId, id), eq(recurringTransactions.userId, userId))),
    db.select({ count: sql<number>`count(*)` }).from(accounts).where(and(eq(accounts.defaultCategoryId, id), eq(accounts.userId, userId))),
    db.select({ count: sql<number>`count(*)` }).from(shortcuts).where(and(eq(shortcuts.categoryId, id), eq(shortcuts.userId, userId))),
  ]);
  if (checks.some(([row]) => Number(row.count) > 0)) fail(409, "Category is still in use");
  const result = await db.delete(categories).where(and(eq(categories.id, id), eq(categories.userId, userId))).returning({ id: categories.id });
  if (!result.length) fail(404, "Category not found");
  return c.body(null, 204);
});
