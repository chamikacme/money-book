import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { DatabaseSync } from "node:sqlite";

vi.mock("@clerk/hono", () => ({
  clerkMiddleware: () => async (_context: unknown, next: () => Promise<Response>) => next(),
  getAuth: () => ({ userId: "ledger-e2e-user", sessionClaims: null }),
}));

import app from "../src/index";

class SQLiteD1Statement {
  constructor(private readonly sqlite: DatabaseSync, private readonly sql: string, private readonly params: unknown[] = []) {}
  bind(...params: unknown[]) { return new SQLiteD1Statement(this.sqlite, this.sql, params); }
  all() {
    const results = this.sqlite.prepare(this.sql).all(...this.params as never[]) as Array<Record<string, unknown>>;
    return { results, success: true, meta: { changes: 0, last_row_id: 0 } };
  }
  first<T = Record<string, unknown>>(column?: string) {
    const row = this.sqlite.prepare(this.sql).get(...this.params as never[]) as Record<string, unknown> | undefined;
    return (column ? row?.[column] : row) as T | undefined;
  }
  run() {
    const result = this.sqlite.prepare(this.sql).run(...this.params as never[]);
    return { success: true, meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid) } };
  }
  raw() {
    return this.sqlite.prepare(this.sql).all(...this.params as never[]).map((row) => Object.values(row as Record<string, unknown>));
  }
}

class SQLiteD1 {
  constructor(private readonly sqlite: DatabaseSync) {}
  prepare(sql: string) { return new SQLiteD1Statement(this.sqlite, sql); }
  exec(sql: string) { this.sqlite.exec(sql); return { count: 1, duration: 0 }; }
  batch(statements: SQLiteD1Statement[]) {
    this.sqlite.exec("BEGIN IMMEDIATE");
    try {
      const results = statements.map((statement) => statement.run());
      this.sqlite.exec("COMMIT");
      return results;
    } catch (error) {
      this.sqlite.exec("ROLLBACK");
      throw error;
    }
  }
}

let sqlite: DatabaseSync;
let db: SQLiteD1;
const originalFetch = globalThis.fetch;

async function request(path: string, init: RequestInit = {}) {
  return app.request(`http://localhost/api${path}`, init, {
    DB: db,
    CLERK_SECRET_KEY: "test-secret",
    CLERK_PUBLISHABLE_KEY: "test-publishable",
    ALLOWED_ORIGINS: "http://localhost:5173",
  });
}

async function responseData<T>(response: Response): Promise<T> {
  const body = await response.json() as { data: T };
  return body.data;
}

describe("ledger flows against D1", () => {
  beforeAll(async () => {
    sqlite = new DatabaseSync(":memory:");
    sqlite.exec("PRAGMA foreign_keys = ON;");
    db = new SQLiteD1(sqlite);
    const migrationDirectory = resolve(process.cwd(), "migrations");
    for (const file of readdirSync(migrationDirectory).filter((name) => name.endsWith(".sql")).sort()) {
      db.exec(readFileSync(resolve(migrationDirectory, file), "utf8"));
    }
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 404 })));
  });

  afterAll(async () => {
    vi.stubGlobal("fetch", originalFetch);
    sqlite.close();
  });

  it("creates, edits, deletes, dates, reconciles, and atomically rolls back ledger postings", async () => {
    const cashResponse = await request("/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Main cash", type: "asset", startingBalance: 100 }),
    });
    expect(cashResponse.status).toBe(201);
    const cash = await responseData<{ id: number; balance: number }>(cashResponse);
    expect(cash.balance).toBe(10_000);

    const expenseResponse = await request("/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Groceries", type: "expense", startingBalance: 0 }),
    });
    expect(expenseResponse.status).toBe(201);
    const expense = await responseData<{ id: number; balance: number }>(expenseResponse);
    expect(expense.balance).toBe(0);

    const today = new Date();
    const todayText = today.toISOString().slice(0, 10);
    const postedDate = new Date(`${todayText}T12:00:00.000Z`);
    const createTransaction = (amount: number, date: Date) => request("/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: date.toISOString(), description: "Groceries", amount, type: "withdrawal", fromAccountId: cash.id, toAccountId: expense.id }),
    });

    const posted = await createTransaction(12.34, postedDate);
    expect(posted.status).toBe(201);
    const postedTransaction = await responseData<{ id: number }>(posted);
    let accountRows = await responseData<Array<{ id: number; balance: number; startingBalance: number }>>(await request("/accounts?pageSize=100"));
    expect(accountRows.find((account) => account.id === cash.id)?.balance).toBe(8_766);
    expect(accountRows.find((account) => account.id === expense.id)?.balance).toBe(1_234);

    const tomorrow = new Date(`${new Date(today.getTime() + 86_400_000).toISOString().slice(0, 10)}T12:00:00.000Z`);
    const edit = await request(`/transactions/${postedTransaction.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: tomorrow.toISOString(), description: "Updated groceries", amount: 20, type: "withdrawal", fromAccountId: cash.id, toAccountId: expense.id }),
    });
    expect(edit.status).toBe(200);
    accountRows = await responseData(await request("/accounts?pageSize=100"));
    expect(accountRows.find((account) => account.id === cash.id)?.balance).toBe(8_000);
    expect(accountRows.find((account) => account.id === expense.id)?.balance).toBe(2_000);

    const statement = await responseData<{ openingBalance: number; endingBalance: number; entries: Array<{ entry: { date: string; amount: number } }> }>(
      await request(`/accounts/${cash.id}/statement?startDate=${tomorrow.toISOString().slice(0, 10)}&endDate=${tomorrow.toISOString().slice(0, 10)}`),
    );
    expect(statement.openingBalance).toBe(10_000);
    expect(statement.endingBalance).toBe(8_000);
    expect(statement.entries).toHaveLength(1);
    expect(statement.entries[0]).toMatchObject({ transaction: { amount: 2_000, date: tomorrow.toISOString() } });

    const openingUpdate = await request(`/accounts/${cash.id}/opening-balance`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startingBalance: 150 }),
    });
    expect(openingUpdate.status).toBe(200);
    accountRows = await responseData(await request("/accounts?pageSize=100"));
    expect(accountRows.find((account) => account.id === cash.id)).toMatchObject({ balance: 13_000, startingBalance: 15_000 });

    const deleteTransaction = await request(`/transactions/${postedTransaction.id}`, { method: "DELETE" });
    expect(deleteTransaction.status).toBe(204);
    accountRows = await responseData(await request("/accounts?pageSize=100"));
    expect(accountRows.find((account) => account.id === cash.id)?.balance).toBe(15_000);
    expect(accountRows.find((account) => account.id === expense.id)?.balance).toBe(0);

    await db.exec("CREATE TRIGGER fail_e2e_entry BEFORE INSERT ON transaction_entries WHEN NEW.amount = 333 BEGIN SELECT RAISE(ABORT, 'simulated ledger failure'); END;");
    const beforeFailureCount = await db.prepare("SELECT COUNT(*) AS count FROM transactions WHERE user_id = ?").bind("ledger-e2e-user").first<{ count: number }>();
    const failedPost = await createTransaction(3.33, new Date());
    expect(failedPost.status).toBeGreaterThanOrEqual(400);
    const afterFailureCount = await db.prepare("SELECT COUNT(*) AS count FROM transactions WHERE user_id = ?").bind("ledger-e2e-user").first<{ count: number }>();
    expect(afterFailureCount?.count).toBe(beforeFailureCount?.count);
    accountRows = await responseData(await request("/accounts?pageSize=100"));
    expect(accountRows.find((account) => account.id === cash.id)?.balance).toBe(15_000);
    await db.exec("DROP TRIGGER fail_e2e_entry;");

    await db.prepare("UPDATE accounts SET balance = balance + 777 WHERE id = ?").bind(cash.id).run();
    const mismatchData = await responseData<Array<{ accountId: number; difference: number }>>(await request("/accounts/reconcile"));
    expect(mismatchData).toContainEqual(expect.objectContaining({ accountId: cash.id, difference: -777 }));
    expect((await request("/accounts/reconcile", { method: "POST" })).status).toBe(200);
    expect(await responseData(await request("/accounts/reconcile"))).toEqual([]);

    const backupResponse = await request("/backup/export");
    expect(backupResponse.status).toBe(200);
    const backup = await backupResponse.json();
    const changedAccount = await request(`/accounts/${cash.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Changed after backup", type: "asset" }),
    });
    expect(changedAccount.status).toBe(200);
    const restored = await request("/backup/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(backup),
    });
    expect(restored.status).toBe(200);
    accountRows = await responseData(await request("/accounts?pageSize=100"));
    expect(accountRows.find((account) => account.id === cash.id)).toMatchObject({ name: "Main cash", balance: 15_000, startingBalance: 15_000 });
    expect(await responseData(await request("/accounts/reconcile"))).toEqual([]);

    const totals = await db.prepare(`SELECT COUNT(*) AS bad_count FROM (
      SELECT t.id FROM transactions t JOIN transaction_entries e ON e.transaction_id = t.id
      WHERE t.user_id = ? GROUP BY t.id
      HAVING COUNT(e.id) != 2 OR SUM(CASE WHEN e.type = 'debit' THEN e.amount ELSE -e.amount END) != 0
    )`).bind("ledger-e2e-user").first<{ bad_count: number }>();
    expect(totals?.bad_count).toBe(0);
  });
});
