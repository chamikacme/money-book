import { afterEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./lib/api-client";

afterEach(() => vi.restoreAllMocks());

describe("apiRequest", () => {
  it("sends the Clerk token and parses successful responses", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ data: { ok: true } }), { status: 200 }));
    await expect(apiRequest("/api/health", "token-123")).resolves.toEqual({ data: { ok: true } });
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ headers: expect.any(Headers) });
    expect((fetchMock.mock.calls[0]?.[1] as RequestInit).headers).toBeInstanceOf(Headers);
    expect(((fetchMock.mock.calls[0]?.[1] as RequestInit).headers as Headers).get("Authorization")).toBe("Bearer token-123");
  });

  it("returns a typed ApiError for failed responses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ error: { message: "Unauthorized" } }), { status: 401 }));
    await expect(apiRequest("/api/private", null)).rejects.toMatchObject({ status: 401, message: "Unauthorized" });
  });
});
