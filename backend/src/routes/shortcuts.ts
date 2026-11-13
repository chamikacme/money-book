import { and, desc, eq, inArray } from "drizzle-orm";
import { Hono } from "hono";
import { createDb } from "../db";
import { accounts, categories, shortcuts } from "../db/schema";
import { validateJson, validateParam } from "../middleware/validate";
import { amountSchema, idParamSchema, shortcutSchema } from "../validators/finance";
import { fail } from "../services/helpers";
import { insertTransaction } from "../services/transactions";
import type { AppEnv } from "../types/env";
import { z } from "zod";

export const shortcutRoutes = new Hono<AppEnv>();

shortcutRoutes.get("/shortcuts", async (c) => c.json({ data: await createDb(c.env.DB).select().from(shortcuts).where(eq(shortcuts.userId, c.get("userId"))).orderBy(desc(shortcuts.createdAt)) }));
shortcutRoutes.post("/shortcuts", validateJson(shortcutSchema), async (c) => {
  const db = createDb(c.env.DB); const input = c.req.valid("json"); const userId = c.get("userId");
  const ownedAccounts = await db.select({ id: accounts.id }).from(accounts).where(and(eq(accounts.userId, userId), inArray(accounts.id, [input.fromAccountId, input.toAccountId])));
  if (ownedAccounts.length !== 2) fail(404, "Shortcut account not found");
  if (input.categoryId) {
    const [category] = await db.select({ id: categories.id }).from(categories).where(and(eq(categories.id, input.categoryId), eq(categories.userId, userId)));
    if (!category) fail(404, "Shortcut category not found");
  }
  const [shortcut] = await db.insert(shortcuts).values({ userId, ...input }).returning();
  return c.json({ data: shortcut }, 201);
});
shortcutRoutes.patch("/shortcuts/:id", validateParam(idParamSchema), validateJson(shortcutSchema), async (c) => {
  const [shortcut] = await createDb(c.env.DB).update(shortcuts).set(c.req.valid("json")).where(and(eq(shortcuts.id, c.req.valid("param").id), eq(shortcuts.userId, c.get("userId")))).returning();
  if (!shortcut) fail(404, "Shortcut not found"); return c.json({ data: shortcut });
});
shortcutRoutes.delete("/shortcuts/:id", validateParam(idParamSchema), async (c) => {
  const result = await createDb(c.env.DB).delete(shortcuts).where(and(eq(shortcuts.id, c.req.valid("param").id), eq(shortcuts.userId, c.get("userId")))).returning({ id: shortcuts.id });
  if (!result.length) fail(404, "Shortcut not found"); return c.body(null, 204);
});
shortcutRoutes.post("/shortcuts/:id/execute", validateParam(idParamSchema), validateJson(amountSchema.extend({ description: z.string().max(240).optional() })), async (c) => {
  const db = createDb(c.env.DB); const [shortcut] = await db.select().from(shortcuts).where(and(eq(shortcuts.id, c.req.valid("param").id), eq(shortcuts.userId, c.get("userId"))));
  if (!shortcut) fail(404, "Shortcut not found"); const input = c.req.valid("json");
  const record = await insertTransaction(db, c.get("userId"), { date: new Date(), description: input.description ?? shortcut.description ?? shortcut.name, amount: input.amount, categoryId: shortcut.categoryId, type: shortcut.type as "withdrawal" | "deposit" | "transfer", fromAccountId: shortcut.fromAccountId, toAccountId: shortcut.toAccountId });
  return c.json({ data: record }, 201);
});
