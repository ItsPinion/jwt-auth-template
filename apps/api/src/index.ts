import express from "express";
import cors from "cors";
import { authRoutes } from "./routes/auth.routes";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import morgan from "morgan";
import { errorHandler } from "./middleware/error";
const PORT = process.env.PORT || 8000;

const app = express();

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

// Testing routes
app.get("/health", (_, res) => {
  res.json({ status: "ok" });
});
app.get("/test-error", () => {
  throw new Error("Boom");
});
// Error handling middleware
app.use(errorHandler);

// Start the server
app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
