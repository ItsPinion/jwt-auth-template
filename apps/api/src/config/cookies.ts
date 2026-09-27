import { getJwtExpiresInMs } from "../../env";

// Hard cap for a whole session lineage: rotation extends the sliding
// expiry, but a session dies at this age no matter how active it is.
export const ABSOLUTE_SESSION_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

export const refreshCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
  maxAge: getJwtExpiresInMs(process.env.REFRESH_EXPIRES_IN, "REFRESH_EXPIRES_IN"),
};

export const REFRESH_COOKIE_NAME = "refreshToken";

export function getRefreshTokenExpiresAt() {
  return new Date(
    Date.now() +
      getJwtExpiresInMs(process.env.REFRESH_EXPIRES_IN, "REFRESH_EXPIRES_IN"),
  );
}

export function getAbsoluteSessionExpiresAt() {
  return new Date(Date.now() + ABSOLUTE_SESSION_TTL_MS);
}

/**
 * Rotation may only extend the sliding expiry up to the absolute cap.
 */
export function getRotatedExpiresAt(absoluteExpiresAt: Date): Date {
  const sliding = getRefreshTokenExpiresAt();
  return sliding < absoluteExpiresAt ? sliding : absoluteExpiresAt;
}
