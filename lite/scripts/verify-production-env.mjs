import { loadEnv } from "vite";

const env = { ...loadEnv("production", process.cwd(), "VITE_"), ...process.env };
const apiUrl = env.VITE_API_URL;
const clerkKey = env.VITE_CLERK_PUBLISHABLE_KEY;

if (!apiUrl || !/^https:\/\//i.test(apiUrl) || /localhost|127\.0\.0\.1/i.test(apiUrl)) {
  console.error("Set VITE_API_URL to the production HTTPS API origin before building.");
  process.exit(1);
}

if (!clerkKey || !clerkKey.startsWith("pk_live_")) {
  console.error("Set VITE_CLERK_PUBLISHABLE_KEY to the production pk_live_ key before building.");
  process.exit(1);
}

console.log("Production frontend configuration is present.");
