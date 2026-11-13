import { describe, expect, it } from "vitest";
import { transactionListQuerySchema } from "../src/validators/finance";

describe("transaction list query validation", () => {
  it("keeps existing pagination defaults and adds deterministic sort defaults", () => {
    expect(transactionListQuerySchema.parse({})).toMatchObject({ page: 1, pageSize: 20, search: "", sortBy: "date", sortOrder: "desc" });
  });

  it("coerces filter IDs and accepts supported filter types", () => {
    const query = transactionListQuerySchema.parse({ accountId: "4", categoryId: "9", categoryType: "expense", startDate: "2026-01-01", endDate: "2026-01-31", sortBy: "amount", sortOrder: "asc" });
    expect(query).toMatchObject({ accountId: 4, categoryId: 9, categoryType: "expense", sortBy: "amount", sortOrder: "asc" });
  });

  it("rejects invalid date order and unsupported filter values", () => {
    expect(transactionListQuerySchema.safeParse({ startDate: "2026-02-01", endDate: "2026-01-01" }).success).toBe(false);
    expect(transactionListQuerySchema.safeParse({ categoryType: "transfer" }).success).toBe(false);
  });
});
