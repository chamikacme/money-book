import { beforeEach, describe, expect, it, vi } from "vitest";

// Keep these tests focused on the Worker API contract without requiring a
// Clerk token or a deployed D1 database.
vi.mock("@clerk/hono", () => ({
  clerkMiddleware: () => async (_context: unknown, next: () => Promise<Response>) => next(),
  getAuth: () => ({ userId: null }),
}));

import app from "../src/index";

describe("Hono API", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns a public health response", async () => {
    const response = await app.request("http://localhost/api/health");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ ok: true, service: "moneybook-api" });
  });

  it("requires authentication for protected resources", async () => {
    const response = await app.request("http://localhost/api/accounts");
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "UNAUTHORIZED" } });
  });

  it("applies security headers", async () => {
    const response = await app.request("http://localhost/api/health");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("x-frame-options")).toBe("DENY");
  });

  it("allows configured local frontend origins", async () => {
    const response = await app.request("http://localhost/api/health", {
      headers: { Origin: "http://localhost:5173" },
    });
    expect(response.headers.get("access-control-allow-origin")).toBe("http://localhost:5173");
    expect(response.headers.get("access-control-allow-credentials")).toBe("true");
  });

  it("does not expose unknown protected endpoints", async () => {
    const response = await app.request("http://localhost/api/does-not-exist");
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "UNAUTHORIZED" } });
  });
});
