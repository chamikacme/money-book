# MoneyBook Backend

Hono API running on Cloudflare Workers with Clerk authentication, CORS, request logging, error handling, and D1 bindings.

## Development

```bash
npm install
npm run dev
```

Copy `.dev.vars.example` to `.dev.vars` and provide Clerk development keys before testing authenticated routes.

Public endpoint:

```text
GET /api/health
```

Protected foundation endpoints:

```text
GET  /api/auth/me
POST /api/validation-check
```

All future application routes must be registered after the authentication middleware in `src/index.ts` or mounted behind an equivalent protected router.
