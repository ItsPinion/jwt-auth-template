import jwt from "jsonwebtoken";
import { StatusCodes } from "http-status-codes";
import { getJwtExpiresIn } from "../../env";
import type { RoleType } from "@repo/shared";
import { AppError } from "./error";

export type JwtPayload = {
  id: string;
  email: string;
  role: RoleType;
};

/**
 * Fails closed on missing secrets — and on the example placeholders from
 * .env.example, which would otherwise let anyone forge tokens. Signing with
 * a placeholder is never a state you want to be in silently.
 */
function requireSecret(name: "ACCESS_TOKEN_SECRET" | "REFRESH_SECRET"): string {
  const value = process.env[name];

  if (!value) {
    throw new AppError(
      `${name} is not set. Generate one with: openssl rand -hex 32`,
      StatusCodes.INTERNAL_SERVER_ERROR,
    );
  }

  if (value.startsWith("replace-with-")) {
    throw new AppError(
      `${name} is still the example placeholder from .env.example — anyone could forge tokens with it. Generate one with: openssl rand -hex 32`,
      StatusCodes.INTERNAL_SERVER_ERROR,
    );
  }

  return value;
}

export function generateAccessToken(payload: JwtPayload) {
  return jwt.sign(payload, requireSecret("ACCESS_TOKEN_SECRET"), {
    expiresIn: getJwtExpiresIn(
      process.env.ACCESS_TOKEN_EXPIRES_IN,
      "ACCESS_TOKEN_EXPIRES_IN",
    ),
  });
}

export function verifyAccessToken(token: string) {
  return jwt.verify(
    token,
    requireSecret("ACCESS_TOKEN_SECRET"),
  ) as JwtPayload;
}

export function generateRefreshToken(userId: string) {
  return jwt.sign({ userId }, requireSecret("REFRESH_SECRET"), {
    expiresIn: getJwtExpiresIn(
      process.env.REFRESH_EXPIRES_IN,
      "REFRESH_EXPIRES_IN",
    ),
  });
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, requireSecret("REFRESH_SECRET")) as {
    userId: string;
  };
}
