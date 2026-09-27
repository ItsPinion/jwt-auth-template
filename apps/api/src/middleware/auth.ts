import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken, type JwtPayload } from "../lib/jwt";
import { AppError } from "../lib/error";
import { StatusCodes } from "http-status-codes";
import { asyncHandler } from "./async-handler";

// The global `Express` namespace is the augmentation point @types/express
// supports (the "express-serve-static-core" module is not resolvable under
// bun's isolated installs).
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const auth = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      throw new AppError("Unauthorized", StatusCodes.UNAUTHORIZED);
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      throw new AppError("Unauthorized", StatusCodes.UNAUTHORIZED);
    }

    try {
      const decoded = verifyAccessToken(token);

      req.user = decoded;

      next();
    } catch (err) {
      // Configuration problems (e.g. placeholder secrets) are server errors,
      // not bad tokens — surface them as-is.
      if (err instanceof AppError) {
        throw err;
      }
      throw new AppError("Invalid or expired token", StatusCodes.UNAUTHORIZED);
    }
  },
);
