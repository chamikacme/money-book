# Backend Security Configuration

## Local development

Copy `.dev.vars.example` to `.dev.vars` and use Clerk development credentials. `.dev.vars` must never be committed.

## Production secrets

Set secrets through Wrangler or the Cloudflare dashboard:

```bash
wrangler secret put CLERK_SECRET_KEY
wrangler secret put CLERK_PUBLISHABLE_KEY
```

Set `ALLOWED_ORIGINS` as a Worker variable to the exact production frontend origin, for example:

```text
https://app.example.com
```

Multiple origins may be comma-separated. Do not use `*` with credentialed requests.

## Request security

- Clerk authentication is required for all API routes except `GET /api/health`.
- Clerk authentication uses the maintained `@clerk/hono` middleware.
- Database queries must scope records by the authenticated Clerk `userId`.
- Related IDs, such as account, category, and goal IDs, must be verified as belonging to the same user before mutation.
- Money mutations must remain inside Drizzle transactions.
- New JSON endpoints must use a Zod validator.
- Backup imports must validate the complete payload before any write is enabled.
- Security headers and credentialed, origin-restricted CORS are applied globally.

## Deployment checklist

- [ ] Replace D1 placeholder IDs in `wrangler.jsonc`.
- [ ] Configure production Clerk secrets.
- [ ] Configure the exact frontend origin in `ALLOWED_ORIGINS`.
- [ ] Confirm the frontend uses the production Clerk publishable key.
- [ ] Run authorization tests with two different users.
- [ ] Verify that unauthenticated requests receive `401`.
- [ ] Verify that cross-user resource IDs cannot be read or mutated.
