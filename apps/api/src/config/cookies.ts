import { getJwtExpiresInMs } from "../../env";

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
