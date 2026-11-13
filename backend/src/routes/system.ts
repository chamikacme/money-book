import { Hono } from "hono";
import { z } from "zod";
import { validateJson } from "../middleware/validate";
import { createDb } from "../db";
import { eq } from "drizzle-orm";
import { users } from "../db/schema";
import type { AppEnv } from "../types/env";

export const systemRoutes = new Hono<AppEnv>();

systemRoutes.get("/health", (c) =>
  c.json({
    ok: true,
    service: "moneybook-api",
  }),
);

export const protectedSystemRoutes = new Hono<AppEnv>();

protectedSystemRoutes.get("/auth/me", async (c) => {
  const userId = c.get("userId");
  const [user] = await createDb(c.env.DB).select().from(users).where(eq(users.id, userId)).limit(1);
  return c.json({ userId, user: user ?? null });
});

protectedSystemRoutes.post(
  "/validation-check",
  validateJson(z.object({ message: z.string().min(1).max(100) })),
  (c) => c.json({ ok: true, data: c.req.valid("json") }),
);
