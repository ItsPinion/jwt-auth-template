# Quizz — Web

The Next.js frontend for the Quizz platform. Phase 1 ships the full
authentication experience backed by the Express API in `apps/api`.

## Features

- Register and log in with email, password, and role (student / teacher)
- Access token kept in memory, refresh token in an HTTP-only cookie
- Axios interceptor that silently refreshes expired access tokens and
  retries the original request
- Protected `/dashboard` route and guest-only `/login` & `/register` routes
- React Hook Form + Zod validation (schemas shared with the API via
  `@repo/shared`)
- TanStack Query for server state, shadcn/ui for the component layer

## Getting started

```bash
bun install
cp .env.example .env.local
bun run dev
```

## Environment

| Variable              | Description                                                                 |
| --------------------- | --------------------------------------------------------------------------- |
| `NEXT_PUBLIC_API_URL` | Base URL of the Express API (e.g. `http://localhost:8000`).                 |
| `API_PROXY_URL`       | Optional. Proxies `/api/*` through the dev server to the API. When set, use `NEXT_PUBLIC_API_URL=/api`. |

## Structure

```
app/
  (auth)/          Guest-only routes (login, register)
  dashboard/       Protected dashboard
components/
  auth/            Auth forms, card, header, field primitives
  dashboard/       Profile card, header, logout button
  ui/              shadcn/ui components
hooks/             useLogin, useRegister, useLogout, useCurrentUser
lib/               Axios client (api.ts) and auth API functions (auth.ts)
providers/         TanStack Query provider
types/             API and auth types
```
