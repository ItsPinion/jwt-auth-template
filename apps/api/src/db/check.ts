/**
 * Read-only deployment diagnostics. Run it wherever the database is
 * reachable (your machine, a CI job) to answer the three questions every
 * "the API 500s" report comes down to:
 *
 *   1. Is the environment configured (and free of example placeholders)?
 *   2. Can the driver reach the database with this connection string?
 *   3. Have migrations been run (do the tables exist)?
 *
 * Usage: bun run db:check   (reads apps/api/.env or the process environment)
 */
import "dotenv/config";
import { neon } from "@neondatabase/serverless";

let failed = false;

// 1. Environment report — names and states only, values are never printed.
console.log("== Environment ==");
for (const name of [
  "NODE_ENV",
  "DATABASE_URL",
  "ACCESS_TOKEN_SECRET",
  "REFRESH_SECRET",
  "ACCESS_TOKEN_EXPIRES_IN",
  "REFRESH_EXPIRES_IN",
  "CLIENT_URL",
] as const) {
  const value = process.env[name];
  let state: string;
  if (!value) {
    state = name === "NODE_ENV" || name.endsWith("_EXPIRES_IN") ? "unset (optional)" : "MISSING";
  } else if (value.startsWith("replace-with-")) {
    state = "STILL THE EXAMPLE PLACEHOLDER — generate with: openssl rand -hex 32";
    failed = true;
  } else {
    state = "set";
  }
  if (!value && !name.endsWith("_EXPIRES_IN") && name !== "NODE_ENV" && name !== "CLIENT_URL") {
    failed = true;
  }
  console.log(`  ${name}: ${state}`);
}

// 2 + 3. Connectivity and schema, through the same driver the API uses.
console.log("\n== Database ==");
const url = process.env.DATABASE_URL;
if (!url) {
  console.log("  skipped — DATABASE_URL is not set");
  failed = true;
} else {
  try {
    const sql = neon(url);
    await sql`select 1`;
    console.log("  connectivity: OK");

    const tables = await sql`
      select table_name from information_schema.tables
      where table_schema = 'public' order by 1
    `;
    if (tables.length === 0) {
      console.log(
        "  schema: NO TABLES — run migrations first: bun run db:push (or db:generate && db:migrate)",
      );
      failed = true;
    } else {
      console.log(`  schema: ${tables.map((t) => t.table_name).join(", ")}`);
    }
  } catch (err) {
    console.log(`  connectivity: FAILED — ${(err as Error).message}`);
    console.log(
      "  (If the error mentions certificates, check your network/proxy. " +
        "If it mentions channel_binding or sslmode, try removing those query parameters.)",
    );
    failed = true;
  }
}

console.log(
  failed
    ? "\nRESULT: problems found (see above)"
    : "\nRESULT: all good — the API is ready to run",
);
process.exit(failed ? 1 : 0);
