import { z } from "zod";

export const idParamSchema = z.object({ id: z.coerce.number().int().positive() });
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().default(""),
});
export const transactionListQuerySchema = paginationSchema.extend({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  accountId: z.coerce.number().int().positive().optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  categoryType: z.enum(["expense", "revenue", "uncategorized"]).optional(),
  sortBy: z.enum(["date", "amount", "description"]).default("date"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
}).refine((query) => !query.startDate || !query.endDate || query.startDate <= query.endDate, {
  message: "startDate must be before or equal to endDate",
});

export const accountSchema = z.object({
  name: z.string().trim().min(1).max(120),
  type: z.enum(["asset", "liability", "expense", "revenue"]),
  startingBalance: z.coerce.number().default(0),
  statementBalance: z.coerce.number().nullable().optional(),
  dueDate: z.coerce.date().nullable().optional(),
  defaultCategoryId: z.coerce.number().int().positive().nullable().optional(),
});
export const accountUpdateSchema = accountSchema.omit({ startingBalance: true });

export const categorySchema = z.object({
  name: z.string().trim().min(1).max(120),
  type: z.enum(["expense", "revenue"]),
});

export const budgetSchema = z.object({
  categoryId: z.coerce.number().int().positive(),
  amount: z.coerce.number().positive(),
  period: z.literal("monthly"),
});

export const transactionSchema = z.object({
  date: z.coerce.date(),
  description: z.string().trim().min(1).max(240),
  amount: z.coerce.number().positive(),
  categoryId: z.coerce.number().int().positive().nullable().optional(),
  type: z.enum(["withdrawal", "deposit", "transfer"]),
  fromAccountId: z.coerce.number().int().positive(),
  toAccountId: z.coerce.number().int().positive().nullable().optional(),
});

export const goalSchema = z.object({
  name: z.string().trim().min(1).max(120),
  targetAmount: z.coerce.number().positive(),
  currentAmount: z.coerce.number().min(0).default(0),
});

export const recurringSchema = transactionSchema.extend({
  frequency: z.enum(["daily", "weekly", "monthly", "yearly"]),
  nextRunDate: z.coerce.date(),
  totalOccurrences: z.coerce.number().int().positive().nullable().optional(),
});

export const shortcutSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().max(240).nullable().optional(),
  icon: z.string().max(40).nullable().optional(),
  fromAccountId: z.coerce.number().int().positive(),
  toAccountId: z.coerce.number().int().positive(),
  categoryId: z.coerce.number().int().positive().nullable().optional(),
  type: z.enum(["withdrawal", "deposit", "transfer"]).default("withdrawal"),
});

export const settingsSchema = z.object({
  currency: z.string().trim().min(3).max(8).optional(),
  showNetWorth: z.boolean().optional(),
  showMonthlySpending: z.boolean().optional(),
  showDefinedNetWorth: z.boolean().optional(),
  definedNetWorthIncludes: z.array(z.coerce.number().int().positive()).optional(),
});

export const amountSchema = z.object({ amount: z.coerce.number().positive() });

const backupRow = z.object({ id: z.coerce.number().int().positive() }).passthrough();
export const backupSchema = z.object({
  version: z.literal(1),
  accounts: z.array(backupRow),
  categories: z.array(backupRow),
  transactions: z.array(backupRow),
  transactionEntries: z.array(backupRow),
  budgets: z.array(backupRow),
  goals: z.array(backupRow),
  recurringTransactions: z.array(backupRow),
  shortcuts: z.array(backupRow),
  userSettings: z.union([backupRow, z.null()]),
});
