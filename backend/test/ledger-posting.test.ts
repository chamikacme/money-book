import { describe, expect, it } from "vitest";
import { accounts, transactionEntries, transactions } from "../src/db/schema";
import { insertTransaction, reverseTransaction, updateTransaction } from "../src/services/transactions";
import { transactionSchema } from "../src/validators/finance";

const userId = "user-test";
const date = new Date("2026-04-08T12:00:00.000Z");
const accountRows = [
  { id: 10, userId, type: "asset", isSystem: false },
  { id: 11, userId, type: "expense", isSystem: false },
];
const transactionRow = { id: 40, userId, date, description: "Groceries", amount: 1234, kind: "withdrawal", categoryId: null };
const entryRows = [
  { id: 51, transactionId: 40, accountId: 10, type: "credit", amount: 1234, date },
  { id: 52, transactionId: 40, accountId: 11, type: "debit", amount: 1234, date },
];

function fakeDatabase(options: { failBatch?: boolean } = {}) {
  const batches: Array<Array<{ sql: string; values: unknown[] }>> = [];
  const db = {
    $client: {
      prepare(sql: string) {
        const statement = { sql, values: [] as unknown[], bind(...values: unknown[]) { this.values = values; return this; } };
        return statement;
      },
      async batch(statements: Array<{ sql: string; values: unknown[] }>) {
        batches.push(statements);
        if (options.failBatch) throw new Error("simulated D1 batch failure");
        return [];
      },
    },
    select() {
      let table: unknown;
      const query = {
        from(value: unknown) { table = value; return this; },
        where() { return this; },
        limit() { return Promise.resolve(table === transactions ? [transactionRow] : []); },
        then(resolve: (value: unknown[]) => unknown, reject: (reason: unknown) => unknown) {
          const rows = table === accounts ? accountRows : table === transactionEntries ? entryRows : table === transactions ? [transactionRow] : [];
          return Promise.resolve(rows).then(resolve, reject);
        },
      };
      return query;
    },
    query: {
      categories: { async findFirst() { return null; } },
      transactions: { async findFirst() { return transactionRow; } },
    },
  };
  return { db: db as never, batches };
}

const input = () => transactionSchema.parse({
  date,
  description: "Groceries",
  amount: 12.34,
  type: "withdrawal",
  fromAccountId: 10,
  toAccountId: 11,
  categoryId: null,
});

describe("ledger posting writes", () => {
  it("creates both dated entries and cached balance changes in one D1 batch", async () => {
    const { db, batches } = fakeDatabase();
    await insertTransaction(db, userId, input());

    expect(batches).toHaveLength(1);
    const statements = batches[0];
    expect(statements.filter((statement) => statement.sql.includes("INSERT INTO transaction_entries"))).toHaveLength(2);
    expect(statements.every((statement) => !statement.sql.includes("INSERT INTO transaction_entries") || statement.sql.includes("date"))).toBe(true);
    expect(statements.filter((statement) => statement.sql.includes("UPDATE accounts SET balance"))).toHaveLength(2);
    expect(statements[0].sql).toContain("INSERT INTO transactions");
  });

  it("updates the transaction date, replacement entries, and balances in one batch", async () => {
    const { db, batches } = fakeDatabase();
    const changedDate = new Date("2026-04-12T12:00:00.000Z");
    await updateTransaction(db, userId, 40, transactionSchema.parse({ ...input(), date: changedDate, amount: 20 }));

    expect(batches).toHaveLength(1);
    expect(batches[0][0].sql).toContain("UPDATE transactions SET date");
    expect(batches[0].filter((statement) => statement.sql.includes("INSERT INTO transaction_entries"))).toHaveLength(2);
    expect(batches[0].filter((statement) => statement.sql.includes("INSERT INTO transaction_entries")).every((statement) => statement.values.includes(changedDate.getTime()))).toBe(true);
  });

  it("reverses cached effects and deletes the transaction atomically", async () => {
    const { db, batches } = fakeDatabase();
    await reverseTransaction(db, userId, 40);

    expect(batches).toHaveLength(1);
    expect(batches[0].at(-1)?.sql).toContain("DELETE FROM transactions");
    expect(batches[0].filter((statement) => statement.sql.includes("UPDATE accounts SET balance"))).toHaveLength(2);
  });

  it("propagates a failed D1 batch instead of reporting a successful post", async () => {
    const { db, batches } = fakeDatabase({ failBatch: true });
    await expect(insertTransaction(db, userId, input())).rejects.toThrow("simulated D1 batch failure");
    expect(batches).toHaveLength(1);
  });
});
