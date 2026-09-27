/**
 * Secrets must fail closed: example placeholders (or missing values) are
 * refused with an actionable error instead of silently minting forgeable
 * tokens.
 */
import { expect, test } from "bun:test";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
} from "./jwt";
import { AppError } from "./error";

const payload = { id: "u1", email: "a@b.co", role: "student" as const };

function withSecrets(
  access: string | undefined,
  refresh: string | undefined,
  fn: () => void,
) {
  const savedAccess = process.env.ACCESS_TOKEN_SECRET;
  const savedRefresh = process.env.REFRESH_SECRET;
  try {
    if (access === undefined) delete process.env.ACCESS_TOKEN_SECRET;
    else process.env.ACCESS_TOKEN_SECRET = access;
    if (refresh === undefined) delete process.env.REFRESH_SECRET;
    else process.env.REFRESH_SECRET = refresh;
    fn();
  } finally {
    if (savedAccess === undefined) delete process.env.ACCESS_TOKEN_SECRET;
    else process.env.ACCESS_TOKEN_SECRET = savedAccess;
    if (savedRefresh === undefined) delete process.env.REFRESH_SECRET;
    else process.env.REFRESH_SECRET = savedRefresh;
  }
}

test("placeholder secrets are refused (no forgeable tokens)", () => {
  withSecrets("replace-with-long-random-value", "replace-with-a-different-long-random-value", () => {
    expect(() => generateAccessToken(payload)).toThrow(AppError);
    expect(() => generateAccessToken(payload)).toThrow(/placeholder/);
    expect(() => generateRefreshToken("u1")).toThrow(/placeholder/);
    expect(() => verifyAccessToken("x.y.z")).toThrow(/placeholder/);
  });
});

test("missing secrets are refused with an actionable message", () => {
  withSecrets(undefined, undefined, () => {
    expect(() => generateAccessToken(payload)).toThrow(/openssl rand -hex 32/);
    expect(() => generateRefreshToken("u1")).toThrow(/is not set/);
  });
});

test("real secrets sign and verify normally", () => {
  withSecrets("test-access-secret-abc", "test-refresh-secret-xyz", () => {
    const token = generateAccessToken(payload);
    const decoded = verifyAccessToken(token);
    expect(decoded.id).toBe("u1");
    expect(decoded.role).toBe("student");

    const refresh = generateRefreshToken("u1");
    expect(refresh.split(".")).toHaveLength(3);
  });
});
