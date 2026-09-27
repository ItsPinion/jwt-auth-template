import "dotenv/config";
import express from "express";
import cors from "cors";
import { authRoutes } from "./routes/auth.routes";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import morgan from "morgan";
import { errorHandler } from "./middleware/error";
const PORT = process.env.PORT || 8000;

const app = express();

// Behind a reverse proxy (nginx, a PaaS router, a tunnel), set TRUST_PROXY so
// req.clientIp reflects the client and not the proxy. Accepts the values
// express understands: a hop count ("1"), "true", or a custom value
// (e.g. "loopback"). Leave unset when clients connect directly.
const trustProxy = process.env.TRUST_PROXY;
if (trustProxy) {
  app.set("trust proxy", /^\d+$/.test(trustProxy) ? Number(trustProxy) : trustProxy);
}

// Middleware
app.use(helmet());
app.use(morgan("dev"));
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

// Start the server
app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
