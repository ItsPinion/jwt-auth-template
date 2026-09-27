import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../lib/jwt";
import { db, usersTable, refreshTokensTable } from "../db";
import { hashToken } from "../lib/hash";
import {
  claimRefreshToken,
  revokeAllUserTokens,
} from "../lib/refresh-tokens";
import { getJwtExpiresInMs } from "../../env";
import type { LoginInput, RegisterInput } from "@repo/shared";
import { normalizeEmail } from "@repo/shared";
import { asyncHandler } from "../middleware/async-handler";
import { AppError, isUniqueViolation } from "../lib/error";
import { StatusCodes } from "http-status-codes";
import {
  getRefreshTokenExpiresAt,
  REFRESH_COOKIE_NAME,
  refreshCookieOptions,
} from "../config/cookies";
import { SALT_ROUNDS } from "../config/auth";
import { created, success } from "../lib/response";

export const register = asyncHandler(
  async (req: Request<{}, {}, RegisterInput>, res: Response) => {
    // Schema already normalizes; normalize again so this handler is safe
    // regardless of the middleware chain it runs behind.
    const email = normalizeEmail(req.body.email);
    const { password, role } = req.body;

    const [existingUser] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    if (existingUser) {
      throw new AppError("Email already in use.", StatusCodes.CONFLICT);
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    let user;
    try {
      [user] = await db
        .insert(usersTable)
        .values({
          email,
          password: hashedPassword,
          role,
        })
        .returning();
    } catch (err) {
      // Concurrent registration can slip past the check above; the UNIQUE
      // index is the source of truth.
      if (isUniqueViolation(err)) {
        throw new AppError("Email already in use.", StatusCodes.CONFLICT);
      }
      throw err;
    }

    if (!user) {
      throw new AppError(
        "Failed to create user.",
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }

    const accessToken = generateAccessToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    const refreshToken = generateRefreshToken(user.id);

    await db.insert(refreshTokensTable).values({
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: getRefreshTokenExpiresAt(),
      revokedAt: null,
    });

    res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions);

    created(res, "User registered successfully", { accessToken });
  },
);

export const login = asyncHandler(
  async (req: Request<{}, {}, LoginInput>, res: Response) => {
    const email = normalizeEmail(req.body.email);
    const { password } = req.body;

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    if (!user) {
      throw new AppError(
        "Invalid email or password.",
        StatusCodes.UNAUTHORIZED,
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new AppError(
        "Invalid email or password.",
        StatusCodes.UNAUTHORIZED,
      );
    }

    const accessToken = generateAccessToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    const refreshToken = generateRefreshToken(user.id);

    await db.insert(refreshTokensTable).values({
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: getRefreshTokenExpiresAt(),
      revokedAt: null,
    });

    res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions);

    success(res, StatusCodes.OK, "Login successful", { accessToken });
  },
);

export const me = asyncHandler(async (req: Request, res: Response) => {
  success(res, StatusCodes.OK, "User fetched successfully", { user: req.user });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  let { refreshToken } = req.cookies;

  if (!refreshToken) {
    throw new AppError("already logged out.", StatusCodes.UNAUTHORIZED);
  }

  await db
    .update(refreshTokensTable)
    .set({
      revokedAt: new Date(),
    })
    .where(eq(refreshTokensTable.tokenHash, hashToken(refreshToken)));

  res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions);

  success(res, StatusCodes.OK, "Logout successful");
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  let { refreshToken } = req.cookies;

  if (!refreshToken) {
    throw new AppError("Unauthorized", StatusCodes.UNAUTHORIZED);
  }

  let userId: string;
  try {
    userId = verifyRefreshToken(refreshToken).userId;
  } catch {
    res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions);

    throw new AppError("Unauthorized", StatusCodes.UNAUTHORIZED);
  }

  const [storedToken] = await db
    .select()
    .from(refreshTokensTable)
    .where(eq(refreshTokensTable.tokenHash, hashToken(refreshToken)))
    .limit(1);

  if (!storedToken || storedToken.userId !== userId) {
    res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions);

    throw new AppError("Unauthorized", StatusCodes.UNAUTHORIZED);
  }

  if (storedToken.revokedAt) {
    // Reuse of a rotated-out token: it was likely stolen. End every session
    // for this user so the thief's rotation (if any) is revoked too.
    await revokeAllUserTokens(storedToken.userId);
    res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions);

    throw new AppError("Unauthorized", StatusCodes.UNAUTHORIZED);
  }

  if (storedToken.expiresAt < new Date()) {
    await db
      .delete(refreshTokensTable)
      .where(eq(refreshTokensTable.id, storedToken.id));
    res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions);

    throw new AppError("Unauthorized", StatusCodes.UNAUTHORIZED);
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (!user) {
    res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions);

    throw new AppError("Unauthorized", StatusCodes.UNAUTHORIZED);
  }

  // Claim the token for rotation atomically. If another request got here
  // first (concurrent refresh), the claim fails and we refuse instead of
  // minting a second session from one token.
  const claimed = await claimRefreshToken(storedToken.id);

  if (!claimed) {
    res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions);

    throw new AppError("Unauthorized", StatusCodes.UNAUTHORIZED);
  }

  const accessToken = generateAccessToken({
    id: user.id,
    email: user.email,
    role: user.role,
  });

  refreshToken = generateRefreshToken(user.id);

  await db.insert(refreshTokensTable).values({
    userId: user.id,
    tokenHash: hashToken(refreshToken),
    expiresAt: getRefreshTokenExpiresAt(),
    revokedAt: null,
  });

  res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions);

  success(res, StatusCodes.OK, "Refresh successful", { accessToken });
});
