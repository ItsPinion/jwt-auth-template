/**
 * Deployment-sanity tests for the Express app:
 * 1. it answers /health both at the root and under the /api prefix (Vercel
 *    reaches the single function via both paths),
 * 2. unauthenticated requests get the standard error envelope,
 * 3. importing the app with NO environment variables does not crash — the
 *    regression for 500 FUNCTION_INVOCATION_FAILED on Vercel, which was a
 *    cold-start crash in the DB client before Express could answer anything.
 */
import { afterAll, beforeAll, expect, test } from "bun:test";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";

let server: Server;
let base: string;

beforeAll(async () => {
  const { app } = await import("./app");
  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  base = `http://127.0.0.1:${port}`;
});

afterAll(() => {
  server?.close();
});

test("GET /health works at the root", async () => {
  const res = await fetch(`${base}/health`);
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ status: "ok" });
});

test("GET /health works under the /api prefix (serverless path)", async () => {
  const res = await fetch(`${base}/api/health`);
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ status: "ok" });
});

test("auth routes work under both prefixes and use the standard envelope", async () => {
  for (const path of ["/auth/me", "/api/auth/me"]) {
    const res = await fetch(`${base}${path}`);
    expect(res.status).toBe(401);
    const body = (await res.json()) as { success: boolean; message: string };
    expect(body.success).toBe(false);
    expect(body.message).toBe("Unauthorized");
  }
});

test("importing the app with no env vars must not crash (cold-start regression)", () => {
  const env = { ...process.env } as Record<string, string>;
  delete env.DATABASE_URL;
  delete env.ACCESS_TOKEN_SECRET;
  delete env.REFRESH_SECRET;

  const proc = Bun.spawnSync({
    cmd: [
      process.execPath,
      "-e",
      'await import("./src/app"); console.log("MODULE_LOAD_OK");',
    ],
    cwd: import.meta.dir + "/..",
    env,
  });

  const stdout = proc.stdout.toString();
  expect(proc.exitCode).toBe(0);
  expect(stdout).toContain("MODULE_LOAD_OK");
});
