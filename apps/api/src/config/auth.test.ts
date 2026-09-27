/**
 * Timing-equalization helper: unknown emails must still pay a full bcrypt
 * verification so login timing can't enumerate accounts.
 */
import { expect, test } from "bun:test";
import { compareAgainstDummy } from "./auth.js";

test("compareAgainstDummy runs real bcrypt work and never matches", async () => {
  const started = performance.now();
  const matched = await compareAgainstDummy("whatever-the-attacker-tries");
  const elapsed = performance.now() - started;

  expect(matched).toBe(false);
  // Cost-12 bcrypt takes tens to hundreds of ms; a stubbed/skipped compare
  // would finish in under a millisecond.
  expect(elapsed).toBeGreaterThan(10);
});

test("repeat calls stay consistent", async () => {
  expect(await compareAgainstDummy("second")).toBe(false);
  expect(await compareAgainstDummy("third")).toBe(false);
});
