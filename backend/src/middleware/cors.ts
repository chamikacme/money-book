import { cors } from "hono/cors";

const localOrigins = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5174",
]);

export function appCors() {
  return cors({
    origin: (origin, c) => {
      const configuredOrigins = c.env?.ALLOWED_ORIGINS?.split(",")
        .map((value: string) => value.trim())
        .filter(Boolean);

      if (configuredOrigins?.includes(origin)) {
        return origin;
      }

      if (!configuredOrigins?.length && localOrigins.has(origin)) {
        return origin;
      }

      return undefined;
    },
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
    maxAge: 86400,
  });
}
