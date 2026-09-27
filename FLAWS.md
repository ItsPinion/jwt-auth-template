# Flaw Report — `jwt-auth-template`

Static review of the monorepo (Express/Bun API + Next.js web + shared Zod schemas), with the
most important claims verified empirically (cookie behavior, Zod parsing, ESLint 10 behavior,
expiry math). Ordered by severity.

---

## High

### 1. Email normalization inconsistency in `register` → HTTP 500s on legitimate signups
**Where:** `apps/api/src/controllers/auth.controller.ts:31` vs `:43`

The duplicate-email check uses the **raw** `email`, but the insert stores
`email.trim().toLowerCase()` (and `login` at `:84` looks up the normalized form).
Verified: `z.email()` accepts mixed case (`Test@X.com` passes).

Consequences:
- Registering `Test@X.com` when `test@x.com` exists bypasses the duplicate check, then the
  `UNIQUE` constraint on `users.email` (migration.sql) fires and the Drizzle error is not an
  `AppError` → **HTTP 500 "Internal Server Error" instead of 409**.
- The check-then-insert pattern is also racy (two concurrent registrations of the same email
  both pass the check) → same unhandled 500.

**Fix:** normalize once (`email.trim().toLowerCase()`) before the lookup; catch unique-violation
errors (Drizzle `23505`) and map to 409. Consider a `citext`/`lower(email)` unique index so the
database enforces case-insensitive uniqueness regardless of code paths.

### 2. No rate limiting on auth endpoints — brute force + CPU-exhaustion DoS
**Where:** `apps/api/src/index.ts`, `apps/api/src/routes/auth.routes.ts`

`/auth/login`, `/auth/register`, and `/auth/refresh` are unauthenticated and unlimited. Every
attempt runs `bcrypt` at cost 12 (~250 ms of CPU). An attacker can:
- credential-stuff/brute-force passwords at whatever rate the server allows, and
- trivially DoS the API just by spamming `/auth/register` (each request burns a full bcrypt hash).

**Fix:** `express-rate-limit` (stricter on login/register), plus lockout/backoff on repeated
failures for an account/IP. Move bcrypt work behind a queue if possible.

### 3. Refresh-token rotation without reuse detection (stolen token = permanent session, silent victim logout)
**Where:** `apps/api/src/controllers/auth.controller.ts` `refresh` (`:163–220`)

Rotation exists (old row revoked, new token issued), but:
- **No reuse detection / token family.** If an attacker steals a refresh token and refreshes
  first, the attacker gets a fresh valid token while the victim's token is revoked. The victim
  is silently bounced to `/login` and the attacker's session persists indefinitely (sliding
  30-day expiry on every rotation). Standard mitigation (OWASP): when a revoked/rotated token is
  replayed, revoke **all** of that user's refresh tokens and alert.
- **Concurrent refresh race.** Two parallel `/auth/refresh` calls with the same cookie both pass
  the `storedToken.revokedAt` check (read-then-write, no transaction — `drizzle-orm/neon-http`
  can't do transactions), so one token can mint two independent sessions and orphan a valid
  token the client never sees.

---

## Medium

### 4. Refresh JWT, cookie, and DB expiry can silently diverge
**Where:** `apps/api/env.ts` (`getJwtExpiresIn` vs `getJwtExpiresInMs`), `apps/api/src/config/cookies.ts`

`getJwtExpiresIn` enforces an allowlist and falls back to `"15m"`; `getJwtExpiresInMs` parses
**any** `ms` string. Verified behavior:

| `REFRESH_EXPIRES_IN` | JWT `expiresIn` | cookie `maxAge` / DB `expiresAt` |
|---|---|---|
| `"20m"` | 15m (fallback) | 20 minutes |
| `"5y"` | 15m (fallback) | 5 years |
| `"0"` | 15m (fallback) | 0 |
| `"abc"` | 15m | 15m (aligned) |

So the cookie/DB row can outlive the actual JWT by minutes or years — users hit confusing 401s
from `verifyRefreshToken` while the cookie is still present, and a `"5y"` misconfiguration leaves
a 5-year cookie around a 15-minute token. The warning text also names the wrong env vars
(`JWT_EXPIRES_IN` instead of `ACCESS_TOKEN_EXPIRES_IN` / `REFRESH_EXPIRES_IN`).

**Fix:** one validated parser used for all three consumers (JWT `expiresIn`, cookie `maxAge`,
DB `expiresAt`), computed once.

### 5. Debug leftovers that leak config / add noise
- `apps/api/drizzle.config.ts:4` — `console.log("test2", process.env.DATABASE_URL)` prints the
  **database connection string (with credentials)** to the terminal/CI logs on every drizzle
  command.
- `apps/api/src/index.ts:31` — `/test-error` throwaway route is wired into the production
  entrypoint.

### 6. Frontend → API wiring is fragile, and error envelopes are inconsistent
- `apps/web/lib/api.ts:4` falls back to `http://localhost:8000` — a browser can't reach the
  backend's localhost in any hosted/preview setup; everything breaks unless `NEXT_PUBLIC_API_URL`
  is set.
- `apps/web/next.config.js` ships a `/api/:path*` rewrite proxy that **nothing uses** (`api.ts`
  calls the API cross-origin directly). Two competing mechanisms, neither documented.
- `apps/api/src/middleware/validate.ts:12` returns `{ errors: ... }` on 400 while every other
  response uses `{ success, message, data }`. `getApiErrorMessage` looks for `data.message`, so
  any server-side validation error surfaces as the generic *"Something went wrong."*

### 7. Self-serve `teacher` role at registration
**Where:** `packages/shared/src/schemas/auth.ts` (`roleSchema.exclude(["admin"])`), register form

Verified: `role: "admin"` is rejected, but `role: "teacher"` is accepted from the request body.
The UI itself advertises teacher as privileged ("Create quizzes and view results"). Anyone can
upgrade themselves to teacher by signing up. `admin` is correctly blocked — but privileged roles
should generally be assigned after verification/admin action, not self-declared.

### 8. Login timing oracle (user enumeration)
**Where:** `apps/api/src/controllers/auth.controller.ts:87–94`

Non-existent emails return 401 **before** `bcrypt.compare` runs; existing emails pay the full
bcrypt cost. The timing difference reliably reveals whether an email is registered. (The message
text is correctly generic.) **Fix:** run a dummy `bcrypt.compare` against a fixed hash when the
user doesn't exist.

---

## Low / hygiene

9. **API lint is broken.** `apps/api/package.json` runs `eslint . --ext .ts` but `apps/api` has no
   `eslint.config.*` — verified ESLint 10 fails with *"couldn't find an eslint.config.(js|mjs|cjs)
   file"*. Also eslint `^10` (api) vs `^9` (web / `@repo/eslint-config`) = duplicate majors across
   the workspace, and `--ext` is a legacy flag. `turbo run lint` therefore fails for `api`.
10. **No type-check/build for the API.** `apps/api` has no `check-types`, `build`, or `start`
   script, so root `turbo run check-types`/`build` silently skip the API entirely.
11. **Session hygiene.**
    - `logout` revokes only the presented token — no "sign out everywhere".
    - Revoked/expired `refreshTokens` rows accumulate forever (only deleted when an expired token
      happens to be replayed at `/refresh`); no cleanup job. `tokenHash` has a non-unique index.
    - Rotation grants a fresh 30 days every time — no absolute session cap (sliding forever).
12. **Cookie/env nits.** `secure` on the refresh cookie depends on `NODE_ENV` being set
    (`cookies.ts`); `apps/api/.env.example` is actively wrong —
    `DATABASE_URL= "development" or "production"` is NODE_ENV guidance pasted on the wrong line,
    `NODE_ENV=` is blank. Copy-pasting it produces an unusable config. The API entry never loads
    dotenv itself (works only because Bun auto-loads `.env`; running under node/tsx breaks).
13. **Schema/policy nits.** `users.createdAt` is nullable while `updatedAt` is not; password
    policy is min-8 only (no breach/complexity checks); no email verification or password-reset
    flow at all; `/auth/me` returns stale JWT claims (role/email changes require re-login);
    `loginSchema` applies the min-8 rule to *login* too (blocks legacy short passwords with a 400).
14. **Dead code / package hygiene.** `src/middleware/authorize.ts` unused; `multer` +
    `@types/multer` unused deps; `@types/express` in prod `dependencies`; `dotenv` in prod deps
    but only used by dev tooling; `"module": "index.ts"` points at a non-existent file; `.ts`
    import extensions used inconsistently (`auth.routes.ts` vs everything else); stray blank lines
    in `getJwtExpiresInMs`.
15. **No tests, no root README.** An auth template with zero tests and zero setup docs (env vars,
    migrations, ports, proxy vs CORS) — `apps/web/README.md` is stock Next.js boilerplate.
16. **Client-only route guard.** `/dashboard` is protected only by a `useEffect` redirect
    (`dashboard/page.tsx`) — no `middleware.ts`/server check; unauthenticated visitors get a
    rendered shell + request before being bounced.

---

## What's actually done well (for balance)

- bcrypt at cost 12; refresh tokens stored **hashed** (SHA-256 of a high-entropy secret is
  appropriate); separate secrets for access vs refresh tokens (prevents token-type confusion).
- Refresh cookie is `httpOnly` + `SameSite=Strict`; access token lives in **module memory** only
  (not localStorage) — good XSS posture; single-flight refresh in `lib/api.ts`.
- Generic "Invalid email or password" message; helmet; Zod validation with shared schemas;
  `admin` excluded from self-registration; login normalizes email correctly.
