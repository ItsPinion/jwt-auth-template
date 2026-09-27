/**
 * Policy tests for the shared auth schemas and small API helpers: email
 * normalization, role non-declaration, password rules, and the utilities the
 * auth flow depends on.
 */
import { expect, test } from "bun:test";
import { registerSchema, loginSchema, normalizeEmail } from "@repo/shared";
import { isUniqueViolation } from "./error";
import { hashToken } from "./hash";

test("emails are normalized before storage/lookup", () => {
  const parsed = registerSchema.parse({
    email: "Test.User@Example.COM",
    password: "correct-horse-battery",
  });
  expect(parsed.email).toBe("test.user@example.com");
  expect(normalizeEmail(parsed.email)).toBe(parsed.email); // idempotent
});

test("roles are never taken from the request", () => {
  const sneaky = registerSchema.safeParse({
    email: "a@b.co",
    password: "correct-horse-battery",
    role: "admin",
  });
  expect(sneaky.success).toBe(true);
  if (sneaky.success) {
    expect(sneaky.data).not.toHaveProperty("role");
  }
});

test("registration password policy", () => {
  const r = (password: string) =>
    registerSchema.safeParse({ email: "a@b.co", password }).success;

  expect(r("short1")).toBe(false); // < 8
  expect(r("a".repeat(73))).toBe(false); // bcrypt truncates at 72
  expect(r("password123")).toBe(false); // blocklisted
  expect(r("correct-horse-battery")).toBe(true);
});

test("login keeps working for legacy short passwords", () => {
  expect(
    loginSchema.safeParse({ email: "a@b.co", password: "old1" }).success,
  ).toBe(true);
  expect(loginSchema.safeParse({ email: "a@b.co", password: "" }).success).toBe(
    false,
  );
});

test("isUniqueViolation recognizes Postgres 23505 only", () => {
  expect(isUniqueViolation({ code: "23505" })).toBe(true);
  expect(isUniqueViolation({ code: "23503" })).toBe(false);
  expect(isUniqueViolation(new Error("boom"))).toBe(false);
  expect(isUniqueViolation(null)).toBe(false);
});

test("hashToken is deterministic sha256 hex", () => {
  const hash = hashToken("some-refresh-token");
  expect(hash).toMatch(/^[0-9a-f]{64}$/);
  expect(hashToken("some-refresh-token")).toBe(hash);
  expect(hashToken("other")).not.toBe(hash);
});
