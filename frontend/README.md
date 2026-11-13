# MoneyBook Frontend

React + Vite single-page app for MoneyBook, deployed to Cloudflare Pages.

## Development

```bash
npm install
npm run dev
```

The Vite development server proxies `/api` requests to the Hono Worker at `http://localhost:8787`.

Set `VITE_CLERK_PUBLISHABLE_KEY` in `.env.local` for local auth. For production builds, provide `VITE_CLERK_PUBLISHABLE_KEY` and `VITE_API_URL` in the build environment; Vite embeds both values into the generated assets. `VITE_API_URL` should be the API origin, such as `https://moneybook-api.<account-subdomain>.workers.dev`, without an `/api` suffix. It can be omitted for local development, where Vite proxies `/api`.

## Production deployment

```bash
npm run deploy:production
```

This builds the production SPA and uploads `dist/` to the Pages project `moneybook-web`. See [`../DEPLOYMENT.md`](../DEPLOYMENT.md) for the API, database, and domain cutover steps.
