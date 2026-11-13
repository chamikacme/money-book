import { Hono } from "hono";
import { logger } from "hono/logger";
import { securityHeaders } from "./middleware/security";
import { appCors } from "./middleware/cors";
import { clerkAuth, requireAuth } from "./middleware/auth";
import { onError, onNotFound } from "./middleware/errors";
import { protectedSystemRoutes, systemRoutes } from "./routes/system";
import { accountRoutes } from "./routes/accounts";
import { categoryRoutes } from "./routes/categories";
import { budgetRoutes } from "./routes/budgets";
import { transactionRoutes } from "./routes/transactions";
import { goalRoutes } from "./routes/goals";
import { recurringRoutes } from "./routes/recurring";
import { shortcutRoutes } from "./routes/shortcuts";
import { dashboardRoutes } from "./routes/dashboard";
import { journalRoutes } from "./routes/journal";
import { reportRoutes } from "./routes/reports";
import { backupRoutes } from "./routes/backup";
import type { AppEnv } from "./types/env";

const app = new Hono<AppEnv>().basePath("/api");

app.use("*", logger());
app.use("*", securityHeaders);
app.use("*", appCors());

// Keep health public so deployment checks do not require a Clerk token.
app.route("/", systemRoutes);

// All non-public API routes added after this point require Clerk auth.
app.use("*", clerkAuth);
app.use("*", requireAuth);
app.route("/", protectedSystemRoutes);
app.route("/", accountRoutes);
app.route("/", categoryRoutes);
app.route("/", budgetRoutes);
app.route("/", transactionRoutes);
app.route("/", goalRoutes);
app.route("/", recurringRoutes);
app.route("/", shortcutRoutes);
app.route("/", dashboardRoutes);
app.route("/", journalRoutes);
app.route("/", reportRoutes);
app.route("/", backupRoutes);

app.onError(onError);
app.notFound(onNotFound);

export default app;
