# MoneyBook Lite

A lightweight, phone-first companion frontend for everyday MoneyBook activity. It shares the MoneyBook Clerk application, API, and D1 database; the full MoneyBook Web application remains the place for advanced finance workflows.

## Local development

1. In `backend/.dev.vars`, set the local CORS origins to both local frontends. Preserve the existing Clerk secret entry:

   ```dotenv
   ALLOWED_ORIGINS="http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174"
   ```

2. Start the API from `backend/`:

   ```sh
   npm run dev
   ```

3. Copy `.env.example` to `.env` and set `VITE_CLERK_PUBLISHABLE_KEY` to the existing MoneyBook Clerk publishable key. Keep `VITE_API_URL=http://localhost:8787`.

4. Install and start Lite:

   ```sh
   npm install
   npm run dev
   ```

Lite runs at `http://localhost:5174` and calls the API directly at `http://localhost:8787`. Restart both dev servers after changing their environment files.

For a deployed frontend, set `VITE_API_URL` to the API origin and allow the Lite site origin in the backend `ALLOWED_ORIGINS` variable.

## Production deployment with Wrangler

Lite uses the same Cloudflare Pages Direct Upload approach as MoneyBook Web, but deploys to the separate `moneybook-lite` Pages project.

1. From `lite/`, authenticate and confirm the Cloudflare account:

   ```sh
   npx wrangler whoami
   ```

2. Create the Pages project once. This checkout is currently on branch `dev`, so this command makes `dev` the Pages production branch. Change it if you intend to deploy another branch:

   ```sh
   npx wrangler pages project create moneybook-lite --production-branch dev
   ```

   Skip this if `moneybook-lite` already exists.

3. Add `https://lite.moneybook.chamikacme.com` to the production `ALLOWED_ORIGINS` value in `backend/wrangler.jsonc`, preserving the MoneyBook Web origin. Deploy the API Worker from `backend/` so it accepts requests from Lite:

   ```sh
   npm run test
   npm run typecheck
   npm run deploy:production
   ```

4. Ensure the production build values are available in Lite's Vite environment. `build:production` reads `.env.production.local`, `.env.production`, `.env.local`, and `.env`; values already set in the shell take precedence. Prefer the ignored `.env.production.local` for production-only values. Or set them in the same PowerShell window:

   ```powershell
   $env:VITE_API_URL = "https://your-production-api-origin"
   $env:VITE_CLERK_PUBLISHABLE_KEY = "pk_live_your-production-publishable-key"
   ```

   Use the exact HTTPS API origin and production Clerk publishable key used by MoneyBook Web. These are public frontend configuration values, not backend secrets. Do not use the local `localhost:8787` API URL or a `pk_test_` key.

5. From `lite/`, build and upload to the Lite Pages project:

   ```sh
   npm run deploy:production
   ```

   The production build checks that both values are present and production-shaped before building. Wrangler uploads `dist/` to `moneybook-lite`, leaving the `moneybook-web` project untouched.

6. In Cloudflare, open **Workers & Pages → moneybook-lite → Custom domains** and add `lite.moneybook.chamikacme.com`. Wait for DNS and HTTPS to become active.

7. Add the Lite hostname to the production Clerk application's allowed origins if required, then test sign-in, API calls, refresh/deep links, shared balances and transactions, and PWA installation.

To inspect deployments later, run `npx wrangler pages deployment list --project-name moneybook-lite` from `lite/`.

## Current scope

- Clerk sign-in
- Dashboard quick view and recent transactions
- Accounts overview
- Create, edit, and delete withdrawal, deposit, and transfer transactions
- Server-side transaction search and pagination
- Execute existing shortcuts
- View active recurring schedules
- Links to advanced MoneyBook Web workflows

All financial writes go through the shared MoneyBook API.
