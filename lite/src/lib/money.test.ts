import { describe, expect, it } from "vitest";
import { formatMoney } from "./money";

describe("formatMoney", () => {
  it("formats integer minor units as currency", () => {
    expect(formatMoney(123456, "USD")).toContain("1,234.56");
  });

  it("handles zero balances", () => {
    expect(formatMoney(0, "USD")).toContain("0.00");
  });

  it("falls back for an unsupported currency code", () => {
    expect(formatMoney(125, "NOT_A_CURRENCY")).toBe("NOT_A_CURRENCY 1.25");
  });
});
