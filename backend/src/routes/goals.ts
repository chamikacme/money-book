import { and, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { createDb } from "../db";
import { accounts, goals, userSettings } from "../db/schema";
import { validateJson, validateParam } from "../middleware/validate";
import { amountSchema, goalSchema, idParamSchema } from "../validators/finance";
import { cents, fail } from "../services/helpers";
import type { AppEnv } from "../types/env";
import { insertTransaction } from "../services/transactions";

export const goalRoutes = new Hono<AppEnv>();

goalRoutes.get("/goals", async (c) => {
  const db = createDb(c.env.DB);
  return c.json({ data: await db.select().from(goals).where(eq(goals.userId, c.get("userId"))).orderBy(desc(goals.createdAt)) });
});

goalRoutes.post("/goals", validateJson(goalSchema), async (c) => {
  const db = createDb(c.env.DB); const userId = c.get("userId"); const input = c.req.valid("json");
  const [settings] = await db.select({ currency: userSettings.currency }).from(userSettings).where(eq(userSettings.userId, userId)).limit(1);
  if (input.currentAmount !== 0) fail(400, "Create the goal with a zero balance, then record contributions from an account");
  const creationKey = crypto.randomUUID();
  await c.env.DB.batch([
    c.env.DB.prepare("INSERT INTO accounts (user_id, name, type, balance, currency, creation_key) VALUES (?, ?, 'asset', 0, ?, ?)").bind(userId, `💰 ${input.name}`, settings?.currency ?? "LKR", creationKey),
    c.env.DB.prepare("INSERT INTO goals (user_id, name, target_amount, current_amount, account_id) SELECT ?, ?, ?, 0, id FROM accounts WHERE creation_key = ?").bind(userId, input.name, cents(input.targetAmount), creationKey),
  ]);
  const [goalAccount] = await db.select({ id: accounts.id }).from(accounts).where(eq(accounts.creationKey, creationKey)).limit(1);
  const [result] = await db.select().from(goals).where(and(eq(goals.userId, userId), eq(goals.accountId, goalAccount.id))).limit(1);
  return c.json({ data: result }, 201);
});

goalRoutes.patch("/goals/:id", validateParam(idParamSchema), validateJson(goalSchema.pick({ name: true, targetAmount: true })), async (c) => {
  const db = createDb(c.env.DB); const input = c.req.valid("json");
  const [goal] = await db.update(goals).set({ name: input.name, targetAmount: cents(input.targetAmount) })
    .where(and(eq(goals.id, c.req.valid("param").id), eq(goals.userId, c.get("userId")))).returning();
  if (!goal) fail(404, "Goal not found");
  return c.json({ data: goal });
});

goalRoutes.post("/goals/:id/contributions", validateParam(idParamSchema), validateJson(amountSchema.extend({ fromAccountId: z.coerce.number().int().positive() })), async (c) => {
  const db = createDb(c.env.DB); const userId = c.get("userId"); const goalId = c.req.valid("param").id;
  const body = c.req.valid("json"); const amount = cents(Number(body.amount));
  const goal = await db.query.goals.findFirst({ where: and(eq(goals.id, goalId), eq(goals.userId, userId)) });
  if (!goal?.accountId) fail(404, "Goal or linked account not found");
  const [source] = await db.select().from(accounts).where(and(eq(accounts.id, Number(body.fromAccountId)), eq(accounts.userId, userId), eq(accounts.isSystem, false)));
  if (!source) fail(404, "Source account not found");
  if (source.type !== "asset") fail(400, "Goal contributions must come from an asset account");
  await insertTransaction(db, userId, { date: new Date(), description: `Contribution to ${goal.name}`, amount: Number(body.amount), type: "transfer", fromAccountId: source.id, toAccountId: goal.accountId, categoryId: null });
  return c.json({ ok: true });
});

goalRoutes.post("/goals/:id/withdraw", validateParam(idParamSchema), validateJson(z.object({ toAccountId: z.coerce.number().int().positive() })), async (c) => {
  const db = createDb(c.env.DB); const userId = c.get("userId"); const goalId = c.req.valid("param").id;
  const body = c.req.valid("json");
  const goal = await db.query.goals.findFirst({ where: and(eq(goals.id, goalId), eq(goals.userId, userId)) });
  if (!goal?.accountId) fail(404, "Goal or linked account not found");
  const [destination] = await db.select().from(accounts).where(and(eq(accounts.id, body.toAccountId), eq(accounts.userId, userId), eq(accounts.isSystem, false)));
  if (!destination) fail(404, "Destination account not found");
  if (destination.type !== "asset") fail(400, "Goal funds can only be withdrawn to an asset account");
  if (goal.currentAmount <= 0) fail(409, "This goal has no balance to withdraw");
  await insertTransaction(db, userId, { date: new Date(), description: `Withdrawal from ${goal.name} (Goal Completed)`, amount: goal.currentAmount / 100, type: "transfer", fromAccountId: goal.accountId!, toAccountId: destination.id, categoryId: null });
  await db.update(goals).set({ currentAmount: 0, completed: true }).where(eq(goals.id, goalId));
  return c.json({ ok: true });
});

goalRoutes.delete("/goals/:id", validateParam(idParamSchema), async (c) => {
  const db = createDb(c.env.DB); const id = c.req.valid("param").id; const userId = c.get("userId");
  const [goal] = await db.select().from(goals).where(and(eq(goals.id, id), eq(goals.userId, userId)));
  if (!goal) fail(404, "Goal not found");
  if (goal.currentAmount > 0) fail(409, "Goal must be empty before deletion");
  const statements = [c.env.DB.prepare("DELETE FROM goals WHERE id = ? AND user_id = ?").bind(id, userId)];
  if (goal.accountId) statements.push(c.env.DB.prepare("UPDATE accounts SET name = ?, updated_at = ? WHERE id = ? AND user_id = ?").bind(`Closed goal · ${goal.name}`, Date.now(), goal.accountId, userId));
  await c.env.DB.batch(statements);
  return c.body(null, 204);
});
