import jwt from "jsonwebtoken";
import { getJwtExpiresIn } from "../../env";
import type { RoleType } from "@repo/shared";

export type JwtPayload = {
  id: string;
  email: string;
  role: RoleType;
};
export function generateAccessToken(payload: JwtPayload) {
  return jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET!, {
    expiresIn: getJwtExpiresIn(
      process.env.ACCESS_TOKEN_EXPIRES_IN,
      "ACCESS_TOKEN_EXPIRES_IN",
    ),
  });
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, process.env.ACCESS_TOKEN_SECRET!) as JwtPayload;
}

export function generateRefreshToken(userId: string) {
  return jwt.sign({ userId }, process.env.REFRESH_SECRET!, {
    expiresIn: getJwtExpiresIn(process.env.REFRESH_EXPIRES_IN, "REFRESH_EXPIRES_IN"),
  });
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, process.env.REFRESH_SECRET!) as { userId: string };
}
