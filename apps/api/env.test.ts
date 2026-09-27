/**
 * Expiry-config invariant tests: the JWT expiresIn, cookie maxAge, and DB
 * expiresAt must always describe the same duration, whatever the operator
 * puts in the env vars.
 */
import { expect, test } from "bun:test";
import { getJwtExpiresIn, getJwtExpiresInMs } from "./env";
import ms from "ms";

const cases: Array<[string, string | undefined]> = [
  ["non-allowlisted 20m", "20m"],
  ["allowlisted 30d", "30d"],
  ["absurd duration", "5y"],
  ["zero", "0"],
  ["garbage", "abc"],
  ["undefined", undefined],
  ["empty", ""],
];

test("JWT expiresIn and ms duration always agree", () => {
  for (const [, value] of cases) {
    const expiresIn = getJwtExpiresIn(value, "TEST_VAR");
    const durationMs = getJwtExpiresInMs(value, "TEST_VAR");
    // Both must resolve to the same underlying duration.
    expect(durationMs).toBe(ms(expiresIn as ms.StringValue));
  }
});

test("allowlisted values pass through unchanged", () => {
  expect(getJwtExpiresIn("7d", "X")).toBe("7d");
  expect(getJwtExpiresInMs("7d", "X")).toBe(ms("7d"));
});

test("non-allowlisted values fall back to 15m for BOTH consumers", () => {
  // This is the regression: "20m" used to give a 15m JWT but a 20m cookie.
  expect(getJwtExpiresIn("20m", "X")).toBe("15m");
  expect(getJwtExpiresInMs("20m", "X")).toBe(ms("15m"));
  expect(getJwtExpiresInMs("5y", "X")).toBe(ms("15m"));
});
