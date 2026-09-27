import { rateLimit } from "express-rate-limit";
import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

function tooManyRequests(_req: Request, res: Response) {
  res.status(StatusCodes.TOO_MANY_REQUESTS).json({
    success: false,
    message: "Too many requests. Please try again later.",
    data: null,
  });
}

/**
 * Strict limit for credential endpoints. Each request here costs a full
 * bcrypt verification (~250ms of CPU), so this doubles as brute-force
 * protection and a DoS backstop.
 */
export const credentialLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: tooManyRequests,
});

/**
 * Lighter limit for session endpoints (refresh happens on page loads and
 * 401 retries; logout is harmless but still rate-limited).
 */
export const sessionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  handler: tooManyRequests,
});
