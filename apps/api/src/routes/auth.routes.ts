import { Router } from "express";
import {
  register,
  login,
  me,
  logout,
  logoutAll,
  refresh,
} from "../controllers/auth.controller.ts";
import { auth } from "../middleware/auth.ts";
import { validate } from "../middleware/validate.ts";
import { credentialLimiter, sessionLimiter } from "../middleware/rate-limit.ts";
import { loginSchema, registerSchema } from "@repo/shared";

export const authRoutes = Router();

authRoutes.post(
  "/register",
  credentialLimiter,
  validate(registerSchema),
  register,
);

authRoutes.post("/login", credentialLimiter, validate(loginSchema), login);

authRoutes.post("/logout", sessionLimiter, logout);

authRoutes.post("/logout-all", sessionLimiter, auth, logoutAll);

authRoutes.post("/refresh", sessionLimiter, refresh);

authRoutes.get("/me", auth, me);
