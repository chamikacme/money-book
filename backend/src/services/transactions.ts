import { and, eq } from "drizzle-orm";
import { createDb } from "../db";
import { accounts, categories, goals, transactionEntries, transactions } from "../db/schema";
import { cents, fail } from "./helpers";
import type { z } from "zod";
import type { transactionSchema } from "../validators/finance";

type TransactionInput = z.infer<typeof transactionSchema>;
type Database = ReturnType<typeof createDb>;
export type LedgerAccountType = "asset" | "liability" | "expense" | "revenue" | "equity";
type EntryType = "debit" | "credit";

export function balanceDelta(accountType: LedgerAccountType, entryType: EntryType, amount: number) {
  const increases = accountType === "asset" || accountType === "expense"
    ? entryType === "debit"
    : entryType === "credit";
  return increases ? amount : -amount;
}

function addDelta(deltas: Map<number, number>, accountId: number, delta: number) {
  deltas.set(accountId, (deltas.get(accountId) ?? 0) + delta);
}

export function validatePostingSides(type: TransactionInput["type"], fromType: string, toType: string) {
  const valid = type === "withdrawal"
    ? (fromType === "asset" || fromType === "liability") && toType === "expense"
    : type === "deposit"
      ? fromType === "revenue" && (toType === "asset" || toType === "liability")
      : (fromType === "asset" || fromType === "liability") && (toType === "asset" || toType === "liability");
  if (!valid) fail(400, "Choose accounts that match the transaction type and ledger sides");
}

export function openingEntrySides(accountType: LedgerAccountType, signedBalance: number) {
  const normalSide: EntryType = accountType === "asset" || accountType === "expense" ? "debit" : "credit";
  const accountSide = signedBalance < 0 ? (normalSide === "debit" ? "credit" : "debit") : normalSide;
  return { accountSide, equitySide: accountSide === "debit" ? "credit" as const : "debit" as const };
}

async function ownedAccounts(db: Database, userId: string, ids: number[]) {
  const uniqueIds = [...new Set(ids)];
  const rows = uniqueIds.length ? await db.select().from(accounts).where(and(eq(accounts.userId, userId))) : [];
  const byId = new Map(rows.filter((row) => uniqueIds.includes(row.id) && !row.isSystem).map((row) => [row.id, row]));
  if (byId.size !== uniqueIds.length) fail(404, "Transaction account not found");
  return byId;
}

export async function insertTransaction(db: Database, userId: string, input: TransactionInput) {
  const amount = cents(input.amount);
  if (!input.toAccountId) fail(400, "Destination account required");
  if (input.fromAccountId === input.toAccountId) fail(400, "Source and destination accounts must differ");
  const accountById = await ownedAccounts(db, userId, [input.fromAccountId, input.toAccountId]);
  const from = accountById.get(input.fromAccountId)!;
  const to = accountById.get(input.toAccountId)!;
  validatePostingSides(input.type, from.type, to.type);
  if (input.categoryId) {
    const category = await db.query.categories.findFirst({ where: and(eq(categories.id, input.categoryId), eq(categories.userId, userId)) });
    if (!category) fail(404, "Category not found");
    if ((input.type === "withdrawal" && category.type !== "expense") || (input.type === "deposit" && category.type !== "revenue")) fail(400, "Category type must match the transaction type");
  }
  const postingKey = crypto.randomUUID();
  const date = input.date.getTime();
  const deltas = new Map<number, number>();
  addDelta(deltas, from.id, balanceDelta(from.type as LedgerAccountType, "credit", amount));
  addDelta(deltas, to.id, balanceDelta(to.type as LedgerAccountType, "debit", amount));
  const statements: D1PreparedStatement[] = [
    db.$client.prepare("INSERT INTO transactions (user_id, date, description, amount, kind, category_id, posting_key) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(userId, date, input.description, amount, input.type, input.categoryId ?? null, postingKey),
    db.$client.prepare("INSERT INTO transaction_entries (transaction_id, account_id, type, amount, date) SELECT id, ?, 'credit', ?, ? FROM transactions WHERE posting_key = ?").bind(from.id, amount, date, postingKey),
    db.$client.prepare("INSERT INTO transaction_entries (transaction_id, account_id, type, amount, date) SELECT id, ?, 'debit', ?, ? FROM transactions WHERE posting_key = ?").bind(to.id, amount, date, postingKey),
    ...[...deltas].filter(([, delta]) => delta !== 0).map(([accountId, delta]) => db.$client.prepare("UPDATE accounts SET balance = balance + ? WHERE id = ? AND user_id = ?").bind(delta, accountId, userId)),
    ...[...deltas.keys()].map((accountId) => db.$client.prepare("UPDATE goals SET current_amount = MAX(0, (SELECT balance FROM accounts WHERE id = ?)) WHERE account_id = ? AND user_id = ?").bind(accountId, accountId, userId)),
  ];
  await db.$client.batch(statements);
  const [record] = await db.select().from(transactions).where(eq(transactions.postingKey, postingKey)).limit(1);
  return record;
}

export async function updateTransaction(db: Database, userId: string, id: number, input: TransactionInput) {
  const existing = await db.query.transactions.findFirst({ where: and(eq(transactions.id, id), eq(transactions.userId, userId)) });
  if (!existing) fail(404, "Transaction not found");
  if (existing.kind === "opening_balance") fail(409, "Opening balances can only be changed from the account settings");
  if (!input.toAccountId) fail(400, "Destination account required");
  if (input.fromAccountId === input.toAccountId) fail(400, "Source and destination accounts must differ");
  if (input.categoryId) {
    const category = await db.query.categories.findFirst({ where: and(eq(categories.id, input.categoryId), eq(categories.userId, userId)) });
    if (!category) fail(404, "Category not found");
    if ((input.type === "withdrawal" && category.type !== "expense") || (input.type === "deposit" && category.type !== "revenue")) fail(400, "Category type must match the transaction type");
  }
  const oldEntries = await db.select().from(transactionEntries).where(eq(transactionEntries.transactionId, id));
  const accountById = await ownedAccounts(db, userId, [...oldEntries.map((entry) => entry.accountId), input.fromAccountId, input.toAccountId]);
  validatePostingSides(input.type, accountById.get(input.fromAccountId)!.type, accountById.get(input.toAccountId)!.type);
  const amount = cents(input.amount);
  const date = input.date.getTime();
  const deltas = new Map<number, number>();
  for (const entry of oldEntries) addDelta(deltas, entry.accountId, -balanceDelta(accountById.get(entry.accountId)!.type as LedgerAccountType, entry.type as EntryType, entry.amount));
  addDelta(deltas, input.fromAccountId, balanceDelta(accountById.get(input.fromAccountId)!.type as LedgerAccountType, "credit", amount));
  addDelta(deltas, input.toAccountId, balanceDelta(accountById.get(input.toAccountId)!.type as LedgerAccountType, "debit", amount));

  const statements: D1PreparedStatement[] = [
    db.$client.prepare("UPDATE transactions SET date = ?, description = ?, amount = ?, kind = ?, category_id = ? WHERE id = ? AND user_id = ?").bind(date, input.description, amount, input.type, input.categoryId ?? null, id, userId),
    db.$client.prepare("DELETE FROM transaction_entries WHERE transaction_id = ?").bind(id),
    db.$client.prepare("INSERT INTO transaction_entries (transaction_id, account_id, type, amount, date) VALUES (?, ?, 'credit', ?, ?)").bind(id, input.fromAccountId, amount, date),
    db.$client.prepare("INSERT INTO transaction_entries (transaction_id, account_id, type, amount, date) VALUES (?, ?, 'debit', ?, ?)").bind(id, input.toAccountId, amount, date),
    ...[...deltas].filter(([, delta]) => delta !== 0).map(([accountId, delta]) => db.$client.prepare("UPDATE accounts SET balance = balance + ? WHERE id = ? AND user_id = ?").bind(delta, accountId, userId)),
    ...[...deltas.keys()].map((accountId) => db.$client.prepare("UPDATE goals SET current_amount = MAX(0, (SELECT balance FROM accounts WHERE id = ?)) WHERE account_id = ? AND user_id = ?").bind(accountId, accountId, userId)),
  ];
  await db.$client.batch(statements);
  const [record] = await db.select().from(transactions).where(eq(transactions.id, id)).limit(1);
  return record;
}

export async function reverseTransaction(db: Database, userId: string, id: number) {
  const record = await db.query.transactions.findFirst({ where: and(eq(transactions.id, id), eq(transactions.userId, userId)) });
  if (!record) fail(404, "Transaction not found");
  if (record.kind === "opening_balance") fail(409, "Opening balances cannot be deleted; edit the account starting balance instead");
  const entries = await db.select().from(transactionEntries).where(eq(transactionEntries.transactionId, id));
  const accountById = await ownedAccounts(db, userId, entries.map((entry) => entry.accountId));
  const deltas = new Map<number, number>();
  for (const entry of entries) addDelta(deltas, entry.accountId, -balanceDelta(accountById.get(entry.accountId)!.type as LedgerAccountType, entry.type as EntryType, entry.amount));
  const statements = [
    ...[...deltas].filter(([, delta]) => delta !== 0).map(([accountId, delta]) => db.$client.prepare("UPDATE accounts SET balance = balance + ? WHERE id = ? AND user_id = ?").bind(delta, accountId, userId)),
    ...[...deltas.keys()].map((accountId) => db.$client.prepare("UPDATE goals SET current_amount = MAX(0, (SELECT balance FROM accounts WHERE id = ?)) WHERE account_id = ? AND user_id = ?").bind(accountId, accountId, userId)),
    db.$client.prepare("DELETE FROM transactions WHERE id = ? AND user_id = ?").bind(id, userId),
  ];
  await db.$client.batch(statements);
  return record;
}
