# Production deployment

## Architecture

```text
frontend/  React + Vite SPA → Cloudflare Pages
backend/   Hono API         → Cloudflare Worker (moneybook-api)
                            → D1 (moneybook-db)
```

The frontend is uploaded as a Pages Direct Upload project (`moneybook-web`). The API remains a separate Worker. The frontend's `wrangler.jsonc` is retained for the previous static-assets Worker deployment/rollback; normal frontend deployment uses `wrangler pages deploy`.

## Before deploying

- Authenticate with Wrangler: `npx wrangler whoami`.
- Confirm `backend/wrangler.jsonc` targets the intended production D1 database.
- Keep a verified D1 export before applying migrations or changing live data.
- Set the Worker's `CLERK_SECRET_KEY` and `CLERK_PUBLISHABLE_KEY` in Cloudflare. The publishable key must match the production Clerk instance used by the frontend.
- Set `VITE_CLERK_PUBLISHABLE_KEY` and `VITE_API_URL` in the frontend build environment. Vite embeds these values at build time; `VITE_API_URL` is the API origin, without an `/api` suffix.
- Ensure the API `ALLOWED_ORIGINS` includes the deployed frontend's exact origin.

## Deploy the API

From `backend/`:

```powershell
npx wrangler d1 export moneybook-db --remote --output backup.sql
npx wrangler d1 migrations list moneybook-db --remote
npm test
npm run typecheck
npm run deploy:dry-run
```

After reviewing the backup and confirming the target database, apply any pending migrations and deploy:

```powershell
npm run db:migrate:remote
npm run deploy:production
```

Set or update a Worker secret interactively with `npx wrangler secret put SECRET_NAME`. Wrangler deploys a new Worker version when a secret is changed.

## Deploy the frontend to Pages

From `frontend/`, after setting the production Vite variables in the current shell:

```powershell
npm run build:production
npx wrangler pages project list
npm run deploy:production
```

The deployment script builds `dist/` and uploads it to Pages project `moneybook-web`. On first use, create the Direct Upload Pages project if prompted. Direct Upload projects cannot later be converted to Git integration; create a Git-integrated project instead if automatic repository deployments are required.

Test the project's `pages.dev` URL before changing the production domain. API CORS and Clerk allowed origins must permit the URL used for testing.

## Custom domain cutover

When Pages passes smoke tests, attach `moneybook.chamikacme.com` to the Pages project in Cloudflare Pages **Custom domains**. If the domain is still attached to the frontend Worker, remove that assignment from the Worker when Cloudflare prompts you, then add it to Pages. Verify sign-in, API requests, refresh/direct navigation, and backup export before retiring the old Worker.

## Smoke checks and rollback

- `GET https://moneybook-api.<account-subdomain>.workers.dev/api/health` returns `200`.
- Clerk sign-in succeeds and authenticated dashboard, accounts, and transactions load.
- Direct navigation to SPA routes works after refresh.
- Backup export and restore work as expected.

Keep the previous frontend Worker and deployment available until Pages is verified. If needed, the old Worker asset deployment can be restored with `npx wrangler deploy` from `frontend/` using its retained `wrangler.jsonc`. Backend rollback should only be done if compatible with the current D1 schema; rolling back Worker code does not roll back D1 data or migrations.
