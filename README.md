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
| `apps/api` | `bun run db:check` | read-only diagnostics: env, DB connectivity, tables |
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
| GET | `/` | — | interactive HTML docs for this API (also at `/api`) |

`GET /` serves a human-friendly landing page — endpoint reference, copy-pasteable
curl flows, and a live health check. The page is fully self-contained (inline
CSS/JS; the script is allow-listed by a CSP sha256 hash, and the response is
`Cache-Control: no-store`) so browsers have no subresources to block or cache.

## Deploying the API to Vercel

The API deploys as a single Vercel Function (Node runtime). The function entry is
`apps/api/api/index.ts`, which re-exports the Express app from `src/app.ts`.
`vercel.json` keeps the deployment deterministic:

- `framework: null` — disables Vercel's Express entry-file auto-detection (it can
  otherwise build extra entry functions that crash at invocation).
- `functions` pin — gives `api/index.ts` `maxDuration: 30` (it is also the one
  property Vercel's schema requires on a function config).
- `routes` — after the filesystem (static files in `public/`, e.g. `robots.txt`,
  which also satisfies Vercel's required output directory for API-only projects),
  every other path is routed to the function while a `request.path` transform
  preserves the original URL, so both `/health` and `/api/health` reach the app.

Two install-time settings keep the function bundle resolvable at runtime
(without them every request fails with `500 FUNCTION_INVOCATION_FAILED` at cold
start, because Vercel's function bundler copies traced files but not bun's
node_modules symlinks):

- `bunfig.toml` sets `linker = "hoisted"` — a flat npm-style `node_modules`
  without symlinks, so packages like `bcrypt` are real folders the bundler can
  copy.
- `scripts/link-workspace-packages.mjs` (runs via `postinstall`) materializes
  workspace packages such as `@repo/shared` into `apps/api/node_modules/@repo/`
  — as a copy with a pre-built JS entry on Vercel, and as a live symlink
  locally so source edits stay live.

The API tsconfig whitelists `["node", "bun"]` types plus `@types/node` so Vercel's
function compile step sees Node globals (`process`, `Buffer`, …).

Source style note: relative imports inside `apps/api` carry explicit `.js`
extensions (`import app from './app.js'` even though the file is `app.ts` — the
standard NodeNext convention). The deployed function runs as native ESM on
Node.js, which does not guess extensions; bun/tsx do, so it's easy to forget.

Project settings (this repo is a workspace monorepo):

| Setting | Value |
| --- | --- |
| Root Directory | `apps/api` |
| Include files outside the Root Directory | **on** (the workspace + `bun.lock` live at the repo root) |
| Build Command | `bun run start` (replaces the default `turbo run build`, which runs no tasks here — the entry's `listen()` is skipped when `VERCEL` is set, so this just loads the app and exits) |
| Framework Preset | Other (also pinned via `vercel.json` `framework: null`) |
| Install Command | leave default (auto-detects Bun from `bun.lock`) |

Environment variables (set for Production **and** Preview — a cold start with a
missing one used to fail every route with `500 FUNCTION_INVOCATION_FAILED`):

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | ✅ | Postgres/Neon connection string |
| `ACCESS_TOKEN_SECRET` | ✅ | long random value |
| `REFRESH_SECRET` | ✅ | long random value, different from the above |
| `ACCESS_TOKEN_EXPIRES_IN` | optional | default `15m` |
| `REFRESH_EXPIRES_IN` | optional | default `30d` |
| `CLIENT_URL` | optional | web origin, only needed if the web app calls the API cross-origin instead of through its `/api` proxy |

The API answers at the deployment root (`https://<project>.vercel.app/health`,
`/auth/...`) and equivalently under `/api/*`. `TRUST_PROXY` is not needed on
Vercel (it is set automatically there). If a request fails, `vercel logs` shows
a one-line message naming any missing environment variable. To verify a fresh
deployment: `curl -i https://<project>.vercel.app/health` — expect `200`.

Before deploying, run `bun run db:check` locally: it verifies the environment
(no example placeholders!), that the driver can reach the database, and that
migrations have been run. Two rules for Vercel env vars specifically:

- **Do not set `NODE_ENV=development` there** — leave it unset (or
  `production`). Development mode relaxes cookie security (no `Secure`, no
  `__Host-` prefix).
- **Never use the example placeholder secrets** — auth routes refuse to run
  with them by design. Generate with `openssl rand -hex 32` and store the
  values only in Vercel's environment settings (or a secret manager), never
  in a committed file. If a secret leaks anywhere (chat, logs, a screenshot),
  rotate it immediately.

If the web app is deployed too, point its `API_PROXY_URL` at
`https://<project>.vercel.app` so `/api/*` proxies to the API same-origin.

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
- **Access tokens** are kept in memory on the client (never localStorage);
  `/dashboard` is gated twice: a middleware cookie-presence check (fast bounce
  to `/login`) and a real session check in the page.

### Known gaps (bring your own before production)

- Email verification and password reset flows
- Breach-list password checking (e.g. HaveIBeenPwned k-anonymity API)
- Refresh-token reuse currently revokes all sessions but does not notify the user
- Secrets are plain env vars — use a secret manager in real deployments
