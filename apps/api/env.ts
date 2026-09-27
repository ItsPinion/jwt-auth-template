import type { SignOptions } from "jsonwebtoken";
import ms, { type StringValue } from "ms";

const ALLOWED_EXPIRES = [
  "15m",
  "30m",
  "1h",
  "6h",
  "12h",
  "1d",
  "7d",
  "30d",
] as const;

type ExpiresValue = (typeof ALLOWED_EXPIRES)[number];

/**
 * Single source of truth for expiry configuration. The JWT `expiresIn`, the
 * refresh-cookie `maxAge`, and the DB `expiresAt` must all go through this —
 * if they ever disagree, cookies outlive tokens (or vice versa) and users see
 * confusing 401s or keep stale cookies around.
 */
function parseExpiry(value: string | undefined, name: string): ExpiresValue {
  if (value && ALLOWED_EXPIRES.includes(value as ExpiresValue)) {
    return value as ExpiresValue;
  }

  console.warn(
    `[auth] Invalid ${name}="${value}". Falling back to "15m". Allowed: ${ALLOWED_EXPIRES.join(", ")}`,
  );

  return "15m";
}

export function getJwtExpiresIn(
  value: string | undefined,
  name = "JWT_EXPIRES_IN",
): SignOptions["expiresIn"] {
  return parseExpiry(value, name);
}

export function getJwtExpiresInMs(
  value: string | undefined,
  name = "JWT_EXPIRES_IN",
): number {
  return ms(parseExpiry(value, name) as StringValue);
}
