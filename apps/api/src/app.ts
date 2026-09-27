import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import morgan from "morgan";
import { authRoutes } from "./routes/auth.routes.js";
import { errorHandler } from "./middleware/error.js";
import { renderHomePage, HOME_SCRIPT_CSP_HASH } from "./views/home-page.js";

// Log configuration problems once at startup so a broken deployment is
// diagnosable from the function logs in seconds (e.g. `vercel logs`). Never
// throw here — a boot crash fails even /health (the classic
// 500 FUNCTION_INVOCATION_FAILED).
const REQUIRED_ENV = [
  "DATABASE_URL",
  "ACCESS_TOKEN_SECRET",
  "REFRESH_SECRET",
] as const;
const problems = REQUIRED_ENV.flatMap((name) => {
  const value = process.env[name];
  if (!value) {
    return [`${name} is missing`];
  }
  if (value.startsWith("replace-with-")) {
    return [`${name} is still the example placeholder`];
  }
  return [];
});
if (problems.length > 0) {
  console.error(
    `[auth] Environment problems: ${problems.join("; ")}. ` +
      `Routes that depend on them will fail until fixed — generate secrets ` +
      `with: openssl rand -hex 32 (on Vercel: Project → Settings → ` +
      `Environment Variables).`,
  );
}

const app = express();

// Trust proxy: Vercel always terminates TLS at its edge (one hop), and on
// other hosts TRUST_PROXY opts in explicitly — this is what makes req.ip (and
// therefore the rate limiters) see real client IPs instead of the proxy's.
const trustProxy =
  process.env.TRUST_PROXY ?? (process.env.VERCEL ? "1" : undefined);
if (trustProxy) {
  app.set(
    "trust proxy",
    /^\d+$/.test(trustProxy) ? Number(trustProxy) : trustProxy,
  );
}

// On Vercel the Express app is a single serverless function and requests may
// reach it under an /api/* prefix (the function's own path or a rewrite).
// Normalize to the root so routes are defined once. (Stripping repeatedly also
// covers a doubled prefix, e.g. /api/api/health.)
app.use((req, _res, next) => {
  while (req.url === "/api" || req.url.startsWith("/api/")) {
    req.url = req.url.slice("/api".length) || "/";
  }
  next();
});

// Middleware
app.use(helmet());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());

// Routes
app.use("/auth", authRoutes);

// Health check
app.get("/health", (_, res) => {
  res.json({ status: "ok" });
});

// Human-friendly landing page (this project is API-only, so the root URL is
// the natural place for discoverable docs). The page is fully self-contained
// (inline CSS + JS) and gets its own CSP: helmet's default policy already
// permits inline styles, and the inline script is allow-listed by an exact
// sha256 hash instead of 'unsafe-inline'. `no-store` keeps browsers from
// heuristic-caching function responses (which once left a stale unstyled page).
app.get("/", (_, res) => {
  res
    .status(200)
    .type("html")
    .set(
      "Content-Security-Policy",
      `default-src 'self'; base-uri 'self'; font-src 'self' data:; ` +
        `form-action 'self'; frame-ancestors 'self'; img-src 'self' data:; ` +
        `object-src 'none'; script-src 'self' '${HOME_SCRIPT_CSP_HASH}'; ` +
        `script-src-attr 'none'; style-src 'self' 'unsafe-inline'; ` +
        `upgrade-insecure-requests`,
    )
    .set("Cache-Control", "no-store")
    .send(
      renderHomePage({
        environment:
          process.env.NODE_ENV ??
          (process.env.VERCEL ? "production" : "development"),
      }),
    );
});

// Error handling middleware
app.use(errorHandler);

export { app };
export default app;
