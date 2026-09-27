import { getJwtExpiresInMs } from "../../env";

// Hard cap for a whole session lineage: rotation extends the sliding
// expiry, but a session dies at this age no matter how active it is.
export const ABSOLUTE_SESSION_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

// Secure by default: cookies are only sent over plaintext HTTP in explicit
// development. An unset NODE_ENV must not silently disable Secure in prod.
export const isDevelopment = process.env.NODE_ENV === "development";

// __Host- hardens the cookie (Secure, Path=/, no Domain) in production. The
// name is only used server-side (the cookie is httpOnly), so switching it per
// environment has no client impact.
export const REFRESH_COOKIE_NAME = isDevelopment
  ? "refreshToken"
  : "__Host-refreshToken";

export const refreshCookieOptions = {
  httpOnly: true,
  secure: !isDevelopment,
  sameSite: "strict" as const,
  path: "/",
  maxAge: getJwtExpiresInMs(
    process.env.REFRESH_EXPIRES_IN,
    "REFRESH_EXPIRES_IN",
  ),
};

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
