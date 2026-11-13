import { relations, sql } from "drizzle-orm";
import {
  foreignKey,
  index,
  integer,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

const timestamp = (name: string) =>
  integer(name, { mode: "timestamp_ms" });

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email"),
  displayName: text("display_name"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").notNull().default(sql`(unixepoch() * 1000)`),
  updatedAt: timestamp("updated_at").notNull().default(sql`(unixepoch() * 1000)`),
  lastSeenAt: timestamp("last_seen_at").notNull().default(sql`(unixepoch() * 1000)`),
});

export const accounts = sqliteTable(
  "accounts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    // Validated at the API boundary: asset, liability, expense, or revenue.
    type: text("type").notNull(),
    balance: integer("balance").notNull().default(0),
    currency: text("currency").notNull().default("LKR"),
    isSystem: integer("is_system", { mode: "boolean" }).notNull().default(false),
    creationKey: text("creation_key"),
    statementBalance: integer("statement_balance"),
    dueDate: timestamp("due_date"),
    defaultCategoryId: integer("default_category_id").references(
      () => categories.id,
    ),
    isPinned: integer("is_pinned", { mode: "boolean" }).notNull().default(false),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    index("accounts_user_id_idx").on(table.userId),
  ],
);

export const categories = sqliteTable(
  "categories",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    // Validated at the API boundary: expense or revenue.
    type: text("type"),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [index("categories_user_id_idx").on(table.userId)],
);

export const transactions = sqliteTable(
  "transactions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id").notNull(),
    date: timestamp("date").notNull(),
    description: text("description").notNull(),
    amount: integer("amount").notNull(),
    // Unknown is retained for legacy rows whose original kind cannot be inferred safely.
    kind: text("kind").notNull().default("unknown"),
    postingKey: text("posting_key"),
    categoryId: integer("category_id"),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    index("transactions_user_id_idx").on(table.userId),
    index("transactions_date_idx").on(table.date),
    foreignKey({
      columns: [table.categoryId],
      foreignColumns: [categories.id],
      name: "transactions_category_id_fk",
    }),
  ],
);

export const transactionEntries = sqliteTable(
  "transaction_entries",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    transactionId: integer("transaction_id").notNull(),
    accountId: integer("account_id").notNull(),
    // Validated at the API boundary: debit or credit.
    type: text("type").notNull(),
    amount: integer("amount").notNull(),
    date: timestamp("date"),
  },
  (table) => [
    index("transaction_entries_transaction_id_idx").on(table.transactionId),
    index("transaction_entries_account_id_idx").on(table.accountId),
    index("transaction_entries_account_date_idx").on(table.accountId, table.date),
    foreignKey({
      columns: [table.transactionId],
      foreignColumns: [transactions.id],
      name: "transaction_entries_transaction_id_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.accountId],
      foreignColumns: [accounts.id],
      name: "transaction_entries_account_id_fk",
    }).onDelete("cascade"),
  ],
);

export const budgets = sqliteTable(
  "budgets",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id").notNull(),
    categoryId: integer("category_id").notNull(),
    amount: integer("amount").notNull(),
    period: text("period").notNull(),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    index("budgets_user_id_idx").on(table.userId),
    foreignKey({
      columns: [table.categoryId],
      foreignColumns: [categories.id],
      name: "budgets_category_id_fk",
    }),
  ],
);

export const goals = sqliteTable(
  "goals",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    targetAmount: integer("target_amount").notNull(),
    currentAmount: integer("current_amount").notNull().default(0),
    accountId: integer("account_id"),
    completed: integer("completed", { mode: "boolean" }).notNull().default(false),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    index("goals_user_id_idx").on(table.userId),
    foreignKey({
      columns: [table.accountId],
      foreignColumns: [accounts.id],
      name: "goals_account_id_fk",
    }),
  ],
);

export const userSettings = sqliteTable("user_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull().unique(),
  currency: text("currency").notNull().default("LKR"),
  showNetWorth: integer("show_net_worth", { mode: "boolean" }).notNull().default(true),
  showMonthlySpending: integer("show_monthly_spending", { mode: "boolean" })
    .notNull()
    .default(true),
  showDefinedNetWorth: integer("show_defined_net_worth", { mode: "boolean" })
    .notNull()
    .default(false),
  // SQLite TEXT JSON replacement for the PostgreSQL integer[] column.
  definedNetWorthIncludes: text("defined_net_worth_includes", { mode: "json" })
    .$type<number[]>()
    .default([]),
  createdAt: timestamp("created_at")
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAt: timestamp("updated_at")
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const recurringTransactions = sqliteTable(
  "recurring_transactions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id").notNull(),
    description: text("description").notNull(),
    amount: integer("amount").notNull(),
    categoryId: integer("category_id"),
    type: text("type").notNull(),
    fromAccountId: integer("from_account_id"),
    toAccountId: integer("to_account_id"),
    frequency: text("frequency").notNull(),
    nextRunDate: timestamp("next_run_date").notNull(),
    lastRunDate: timestamp("last_run_date"),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    totalOccurrences: integer("total_occurrences"),
    completedOccurrences: integer("completed_occurrences").notNull().default(0),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    index("recurring_transactions_user_id_idx").on(table.userId),
    foreignKey({
      columns: [table.categoryId],
      foreignColumns: [categories.id],
      name: "recurring_transactions_category_id_fk",
    }),
    foreignKey({
      columns: [table.fromAccountId],
      foreignColumns: [accounts.id],
      name: "recurring_transactions_from_account_id_fk",
    }),
    foreignKey({
      columns: [table.toAccountId],
      foreignColumns: [accounts.id],
      name: "recurring_transactions_to_account_id_fk",
    }),
  ],
);

export const shortcuts = sqliteTable(
  "shortcuts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    icon: text("icon"),
    fromAccountId: integer("from_account_id").notNull(),
    toAccountId: integer("to_account_id").notNull(),
    categoryId: integer("category_id"),
    type: text("type").notNull().default("withdrawal"),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    index("shortcuts_user_id_idx").on(table.userId),
    foreignKey({
      columns: [table.fromAccountId],
      foreignColumns: [accounts.id],
      name: "shortcuts_from_account_id_fk",
    }),
    foreignKey({
      columns: [table.toAccountId],
      foreignColumns: [accounts.id],
      name: "shortcuts_to_account_id_fk",
    }),
    foreignKey({
      columns: [table.categoryId],
      foreignColumns: [categories.id],
      name: "shortcuts_category_id_fk",
    }),
  ],
);

export const accountsRelations = relations(accounts, ({ many, one }) => ({
  entries: many(transactionEntries),
  defaultCategory: one(categories, {
    fields: [accounts.defaultCategoryId],
    references: [categories.id],
  }),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  transactions: many(transactions),
  budgets: many(budgets),
  recurringTransactions: many(recurringTransactions),
  shortcuts: many(shortcuts),
}));

export const transactionsRelations = relations(transactions, ({ many, one }) => ({
  entries: many(transactionEntries),
  category: one(categories, {
    fields: [transactions.categoryId],
    references: [categories.id],
  }),
}));

export const transactionEntriesRelations = relations(transactionEntries, ({ one }) => ({
  transaction: one(transactions, {
    fields: [transactionEntries.transactionId],
    references: [transactions.id],
  }),
  account: one(accounts, {
    fields: [transactionEntries.accountId],
    references: [accounts.id],
  }),
}));

export const budgetsRelations = relations(budgets, ({ one }) => ({
  category: one(categories, {
    fields: [budgets.categoryId],
    references: [categories.id],
  }),
}));

export const goalsRelations = relations(goals, ({ one }) => ({
  account: one(accounts, {
    fields: [goals.accountId],
    references: [accounts.id],
  }),
}));

export const recurringTransactionsRelations = relations(
  recurringTransactions,
  ({ one }) => ({
    category: one(categories, {
      fields: [recurringTransactions.categoryId],
      references: [categories.id],
    }),
    fromAccount: one(accounts, {
      fields: [recurringTransactions.fromAccountId],
      references: [accounts.id],
      relationName: "recurring_from_account",
    }),
    toAccount: one(accounts, {
      fields: [recurringTransactions.toAccountId],
      references: [accounts.id],
      relationName: "recurring_to_account",
    }),
  }),
);

export const shortcutsRelations = relations(shortcuts, ({ one }) => ({
  fromAccount: one(accounts, {
    fields: [shortcuts.fromAccountId],
    references: [accounts.id],
    relationName: "shortcut_from_account",
  }),
  toAccount: one(accounts, {
    fields: [shortcuts.toAccountId],
    references: [accounts.id],
    relationName: "shortcut_to_account",
  }),
  category: one(categories, {
    fields: [shortcuts.categoryId],
    references: [categories.id],
  }),
}));

export const schema = {
  users,
  accounts,
  categories,
  transactions,
  transactionEntries,
  budgets,
  goals,
  userSettings,
  recurringTransactions,
  shortcuts,
};
