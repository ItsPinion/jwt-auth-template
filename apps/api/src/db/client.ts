import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../lib/error";

function buildDb(databaseUrl: string) {
  return drizzle({ client: neon(databaseUrl) });
}

type Db = ReturnType<typeof buildDb>;

let instance: Db | undefined;

function getDb(): Db {
  instance ??= (() => {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new AppError(
        "DATABASE_URL is not set. Add it to the environment (on Vercel: Project → Settings → Environment Variables).",
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
    return buildDb(url);
  })();
  return instance;
}

/**
 * Lazily constructed drizzle client.
 *
 * Constructing it at module load used to throw `neon("undefined")` during
 * every serverless cold start when DATABASE_URL was missing — which failed
 * *all* routes (even /health) with FUNCTION_INVOCATION_FAILED before Express
 * could handle anything. Now an unconfigured environment only fails the DB
 * routes, with an actionable error message.
 */
export const db = new Proxy({} as Db, {
  get(_target, prop) {
    const real = getDb();
    const value = Reflect.get(real, prop) as unknown;
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(real)
      : value;
  },
});
