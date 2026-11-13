import { clerkMiddleware, getAuth } from "@clerk/hono";
import type { Context, Next } from "hono";
import type { AppEnv } from "../types/env";

export const clerkAuth = clerkMiddleware();

export async function requireAuth(c: Context<AppEnv>, next: Next) {
  const auth = getAuth(c);
  const { userId } = auth;

  if (!userId) {
    return c.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication is required",
        },
      },
      401,
    );
  }

  c.set("userId", userId);
  const claims = auth.sessionClaims as Record<string, unknown> | null;
  const firstName = typeof claims?.first_name === "string" ? claims.first_name : "";
  const lastName = typeof claims?.last_name === "string" ? claims.last_name : "";
  let profile: { email?: string | null; displayName?: string | null; imageUrl?: string | null } = {
    displayName: typeof claims?.name === "string"
    ? claims.name
    : [firstName, lastName].filter(Boolean).join(" ") || null,
    email: typeof claims?.email === "string"
    ? claims.email
    : typeof claims?.email_address === "string" ? claims.email_address : null,
    imageUrl: typeof claims?.image_url === "string" ? claims.image_url : null,
  };
  try {
    const response = await fetch(`https://api.clerk.com/v1/users/${encodeURIComponent(userId)}`, {
      headers: { Authorization: `Bearer ${c.env.CLERK_SECRET_KEY}` },
    });
    if (response.ok) {
      const clerkUser = await response.json() as {
        first_name?: string | null;
        last_name?: string | null;
        image_url?: string | null;
        primary_email_address_id?: string | null;
        email_addresses?: Array<{ id: string; email_address: string }>;
      };
      const primaryEmail = clerkUser.email_addresses?.find((item) => item.id === clerkUser.primary_email_address_id)?.email_address
        ?? clerkUser.email_addresses?.[0]?.email_address;
      profile = {
        email: primaryEmail ?? profile.email,
        displayName: [clerkUser.first_name, clerkUser.last_name].filter(Boolean).join(" ") || profile.displayName,
        imageUrl: clerkUser.image_url ?? profile.imageUrl,
      };
    }
  } catch {
    // The local row still gets updated from token claims if Clerk's API is unavailable.
  }
  const now = Date.now();
  await c.env.DB.prepare(`
    INSERT INTO users (id, email, display_name, image_url, created_at, updated_at, last_seen_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      email = COALESCE(excluded.email, users.email),
      display_name = COALESCE(excluded.display_name, users.display_name),
      image_url = COALESCE(excluded.image_url, users.image_url),
      updated_at = ?,
      last_seen_at = ?
  `).bind(userId, profile.email, profile.displayName, profile.imageUrl, now, now, now, now, now).run();
  await next();
}
