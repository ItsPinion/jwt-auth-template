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

export function getJwtExpiresIn(
  value: string | undefined,
): SignOptions["expiresIn"] {
  if (value && ALLOWED_EXPIRES.includes(value as any)) {
    return value as SignOptions["expiresIn"];
  }

  console.warn(
    `[auth] Invalid JWT_EXPIRES_IN="${value}". Falling back to "15m". Allowed: ${ALLOWED_EXPIRES.join(", ")}`,
  );

  return "15m";
}

export function getJwtExpiresInMs(value: string | undefined): number {

  

  const duration = ms((value ?? "15m") as StringValue);

  if (typeof duration === "number") {
    return duration;
  }

  console.warn(
    `[auth] Invalid JWT_EXPIRES_IN="${value}". Falling back to 15 minutes.`,
  );

  return ms("15m") as number;
}
