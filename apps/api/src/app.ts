import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import morgan from "morgan";
import { authRoutes } from "./routes/auth.routes";
import { errorHandler } from "./middleware/error";

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
// Error handling middleware
app.use(errorHandler);

export { app };
export default app;
