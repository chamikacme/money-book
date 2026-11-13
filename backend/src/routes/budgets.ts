import { and, desc, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { budgets, categories, transactions } from "../db/schema";
import { createDb } from "../db";
import { validateJson, validateParam } from "../middleware/validate";
import { budgetSchema, idParamSchema } from "../validators/finance";
import { cents, fail } from "../services/helpers";
import type { AppEnv } from "../types/env";

export const budgetRoutes = new Hono<AppEnv>();

budgetRoutes.get("/budgets", async (c) => {
  const db = createDb(c.env.DB);
  const userId = c.get("userId");
  const rows = await db.select({ budget: budgets, category: categories }).from(budgets)
    .leftJoin(categories, eq(budgets.categoryId, categories.id))
    .where(eq(budgets.userId, userId)).orderBy(desc(budgets.createdAt));
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();
  const spentRows = await db.select({ categoryId: transactions.categoryId, spent: sql<number>`coalesce(sum(${transactions.amount}), 0)` })
    .from(transactions)
    .where(and(eq(transactions.userId, userId), sql`${transactions.date} >= ${start}`, sql`${transactions.date} < ${end}`))
    .groupBy(transactions.categoryId);
  const spentByCategory = new Map(spentRows.map(({ categoryId, spent }) => [categoryId, Number(spent)]));
  const data = rows.map(({ budget, category }) => {
    const spent = spentByCategory.get(budget.categoryId) ?? 0;
    return { ...budget, category, spent, remaining: budget.amount - spent, progress: Math.min((spent / budget.amount) * 100, 100) };
  });
  return c.json({ data });
});

budgetRoutes.post("/budgets", validateJson(budgetSchema), async (c) => {
  const db = createDb(c.env.DB); const userId = c.get("userId"); const input = c.req.valid("json");
  const [category] = await db.select({ id: categories.id }).from(categories).where(and(eq(categories.id, input.categoryId), eq(categories.userId, userId)));
  if (!category) fail(404, "Category not found");
  const [existing] = await db.select().from(budgets).where(and(eq(budgets.userId, userId), eq(budgets.categoryId, input.categoryId))).limit(1);
  const [budget] = existing
    ? await db.update(budgets).set({ amount: cents(input.amount), period: input.period }).where(eq(budgets.id, existing.id)).returning()
    : await db.insert(budgets).values({ userId, categoryId: input.categoryId, amount: cents(input.amount), period: input.period }).returning();
  return c.json({ data: budget }, existing ? 200 : 201);
});

budgetRoutes.patch("/budgets/:id", validateParam(idParamSchema), validateJson(budgetSchema), async (c) => {
  const db = createDb(c.env.DB); const input = c.req.valid("json");
  const [category] = await db.select({ id: categories.id }).from(categories).where(and(eq(categories.id, input.categoryId), eq(categories.userId, c.get("userId"))));
  if (!category) fail(404, "Category not found");
  const [budget] = await db.update(budgets).set({ categoryId: input.categoryId, amount: cents(input.amount), period: input.period })
    .where(and(eq(budgets.id, c.req.valid("param").id), eq(budgets.userId, c.get("userId")))).returning();
  if (!budget) fail(404, "Budget not found");
  return c.json({ data: budget });
});

budgetRoutes.delete("/budgets/:id", validateParam(idParamSchema), async (c) => {
  const db = createDb(c.env.DB); const result = await db.delete(budgets)
    .where(and(eq(budgets.id, c.req.valid("param").id), eq(budgets.userId, c.get("userId")))).returning({ id: budgets.id });
  if (!result.length) fail(404, "Budget not found");
  return c.body(null, 204);
});
