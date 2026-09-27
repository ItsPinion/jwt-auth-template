# jwt-auth-template

A batteries-included JWT authentication starter: Bun + Express + Drizzle/Postgres (Neon-ready) API,
Next.js web app, and shared Zod schemas, organized as a Turborepo.

## Layout

```
apps/
  api/      Express 5 API (auth, sessions, rate limiting) run with Bun
  web/      Next.js app (login/register/dashboard)
packages/
  shared/   Zod schemas + email/role/password rules shared by both apps
```

## Prerequisites

- [Bun](https://bun.sh) ≥ 1.3 (this repo is Bun-first; `devEngines` enforces it)

## Setup

```sh
bun install

# API — configure the environment
cp apps/api/.env.example apps/api/.env
#   then edit apps/api/.env: DATABASE_URL, ACCESS_TOKEN_SECRET, REFRESH_SECRET

# Create tables
cd apps/api && bun run db:push   # or: bun run db:generate && bun run db:migrate

# Run everything (API on :8000, web on :3000)
cd ../.. && bun run dev
```

The web app calls the API same-origin through its `/api/*` rewrite (see
`apps/web/next.config.js`), so no CORS configuration is needed for local dev.
Set `API_PROXY_URL` if the API lives somewhere other than `http://localhost:8000`,
or `NEXT_PUBLIC_API_URL` to bypass the proxy and call a directly exposed API
(that API must allow your web origin with credentials — see `CLIENT_URL`).

## Scripts

| Where | Command | What |
| --- | --- | --- |
| root | `bun run dev` | run all apps (turbo) |
| root | `bun run check-types` | type-check every package |
| root | `bun run lint` | lint every package |
| `apps/api` | `bun run dev` / `bun run start` | run the API (hot / plain) |
| `apps/api` | `bun test` | unit + behavior tests |
| `apps/api` | `bun run db:generate` / `db:migrate` / `db:push` | migrations |
| `apps/web` | `bun run dev` | run the web app |

## API surface

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/auth/register` | — | create a student account (rate-limited) |
| POST | `/auth/login` | — | sign in (rate-limited) |
| POST | `/auth/refresh` | cookie | rotate the refresh token, get a new access token |
| POST | `/auth/logout` | cookie | end the current session |
| POST | `/auth/logout-all` | bearer | end **every** session for the user |
| GET | `/auth/me` | bearer | current user (fresh from the DB) |
| GET | `/health` | — | liveness |

## Security model (what's implemented)

- **Passwords**: bcrypt (cost 12), min 8 / max 72 chars (bcrypt truncates), small
  common-password blocklist; policy at registration, login stays permissive for
  legacy accounts. Login timing is equalized (dummy compare) — no user enumeration.
- **Tokens**: separate secrets for access (15m default) and refresh (30d default)
  JWTs; the refresh token is stored **hashed** (SHA-256) and rotated on every use.
- **Sessions**: refresh tokens live in an `httpOnly`, `SameSite=Strict`,
  `Secure` + `__Host-` cookie (outside development). Rotation is atomic
  (no double-minting under concurrency), replay of a rotated token revokes
  **all** of the user's sessions (stolen-token detection), sessions die at a
  90-day absolute cap regardless of activity, and stale rows are purged.
- **Roles**: registration always creates a `student`. `teacher`/`admin` are
  privileged and must be granted post-signup (`authorize()` middleware is ready
  in `apps/api/src/middleware/authorize.ts`).
- **Transport/abuse**: helmet, strict CORS (when used), per-IP rate limits on
  credential and session endpoints (set `TRUST_PROXY` behind a reverse proxy).
- **Access tokens** are kept in memory on the client (never localStorage).

### Known gaps (bring your own before production)

- Email verification and password reset flows
- Breach-list password checking (e.g. HaveIBeenPwned k-anonymity API)
- Refresh-token reuse currently revokes all sessions but does not notify the user
- Secrets are plain env vars — use a secret manager in real deployments
