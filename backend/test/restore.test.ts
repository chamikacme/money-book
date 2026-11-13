import { describe, expect, it } from "vitest";
import { backupSchema } from "../src/validators/finance";
import { advanceDate } from "../src/routes/recurring";

describe("backup restore contract", () => {
  it("accepts a complete exported backup shape", () => {
    const result = backupSchema.safeParse({ version: 1, accounts: [{ id: 1 }], categories: [], transactions: [], transactionEntries: [], budgets: [], goals: [], recurringTransactions: [], shortcuts: [], userSettings: null });
    expect(result.success).toBe(true);
  });

  it("rejects incomplete or incompatible backups before mutation", () => {
    expect(backupSchema.safeParse({ version: 1, accounts: [], categories: [] }).success).toBe(false);
    expect(backupSchema.safeParse({ version: 2, accounts: [], categories: [], transactions: [], transactionEntries: [], budgets: [], goals: [], recurringTransactions: [], shortcuts: [], userSettings: null }).success).toBe(false);
  });
});

describe("recurring calendar advancement", () => {
  it("keeps monthly schedules on the last valid day", () => {
    expect(advanceDate(new Date("2026-01-31T00:00:00Z"), "monthly").toISOString().slice(0, 10)).toBe("2026-02-28");
  });
  it("supports daily, weekly, and yearly frequencies", () => {
    expect(advanceDate(new Date("2026-01-01T00:00:00Z"), "daily").toISOString().slice(0, 10)).toBe("2026-01-02");
    expect(advanceDate(new Date("2026-01-01T00:00:00Z"), "weekly").toISOString().slice(0, 10)).toBe("2026-01-08");
    expect(advanceDate(new Date("2026-01-01T00:00:00Z"), "yearly").toISOString().slice(0, 10)).toBe("2027-01-01");
  });
});
