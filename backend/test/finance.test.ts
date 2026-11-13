import { describe, expect, it } from "vitest";
import { accountSchema, transactionSchema } from "../src/validators/finance";
import { cents, pageMeta } from "../src/services/helpers";
import { balanceDelta, openingEntrySides, validatePostingSides } from "../src/services/transactions";

describe("finance primitives", () => {
  it("converts dollar values to integer cents", () => {
    expect(cents(10.005)).toBe(1001);
    expect(cents(0)).toBe(0);
  });

  it("calculates pagination metadata", () => {
    expect(pageMeta(2, 10, 25)).toEqual({ page: 2, pageSize: 10, totalCount: 25, totalPages: 3 });
  });

  it("validates transaction types and required values", () => {
    expect(transactionSchema.safeParse({
      date: "2026-01-01",
      description: "Groceries",
      amount: "12.50",
      type: "withdrawal",
      fromAccountId: "1",
      toAccountId: "2",
    }).success).toBe(true);
    expect(transactionSchema.safeParse({ description: "Missing amount" }).success).toBe(false);
  });

  it("validates supported account types", () => {
    expect(accountSchema.safeParse({ name: "Checking", type: "asset" }).success).toBe(true);
    expect(accountSchema.safeParse({ name: "Unknown", type: "crypto" }).success).toBe(false);
  });

  it("keeps debit and credit balance rules consistent", () => {
    expect(balanceDelta("asset", "debit", 100)).toBe(100);
    expect(balanceDelta("asset", "credit", 100)).toBe(-100);
    expect(balanceDelta("liability", "credit", 100)).toBe(100);
    expect(balanceDelta("liability", "debit", 100)).toBe(-100);
    expect(balanceDelta("expense", "debit", 100)).toBe(100);
    expect(balanceDelta("revenue", "credit", 100)).toBe(100);
    expect(balanceDelta("equity", "credit", 100)).toBe(100);
    expect(balanceDelta("equity", "debit", 100)).toBe(-100);
  });

  it.each([
    ["withdrawal", "asset", "expense"],
    ["withdrawal", "liability", "expense"],
    ["deposit", "revenue", "asset"],
    ["deposit", "revenue", "liability"],
    ["transfer", "asset", "asset"],
    ["transfer", "asset", "liability"],
    ["transfer", "liability", "asset"],
    ["transfer", "liability", "liability"],
  ] as const)("accepts balanced %s posting from %s to %s", (kind, from, to) => {
    expect(() => validatePostingSides(kind, from, to)).not.toThrow();
  });

  it.each([
    ["withdrawal", "revenue", "expense"],
    ["withdrawal", "asset", "asset"],
    ["deposit", "asset", "asset"],
    ["deposit", "revenue", "expense"],
    ["transfer", "expense", "asset"],
    ["transfer", "asset", "revenue"],
  ] as const)("rejects invalid %s posting from %s to %s", (kind, from, to) => {
    expect(() => validatePostingSides(kind, from, to)).toThrow();
  });

  it.each([
    ["asset", 500, "debit", "credit"],
    ["asset", -500, "credit", "debit"],
    ["expense", 500, "debit", "credit"],
    ["liability", 500, "credit", "debit"],
    ["liability", -500, "debit", "credit"],
    ["revenue", 500, "credit", "debit"],
    ["equity", 500, "credit", "debit"],
  ] as const)("places %s opening balance %i on the normal/opposite sides", (accountType, amount, accountSide, equitySide) => {
    expect(openingEntrySides(accountType, amount)).toEqual({ accountSide, equitySide });
  });
});
