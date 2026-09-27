/**
 * Make workspace packages (e.g. @repo/shared) resolvable from apps/* at runtime.
 *
 * Why: bun links workspace packages as symlinks. Vercel's function bundler
 * (@vercel/node + node-file-trace) copies traced *files* but does not emit the
 * node_modules symlink entries, so a deployed function cannot resolve
 * `@repo/shared` at cold start (500 FUNCTION_INVOCATION_FAILED).
 *
 * - On Vercel (process.env.VERCEL): copy packages/* into
 *   apps/api/node_modules/@repo/* so the tracer sees real files.
 * - Locally: create relative symlinks instead, so edits to packages/* stay
 *   live during development.
 *
 * Runs via `postinstall`, so both `bun install` locally and Vercel's build
 * install end up with a working layout.
 */
import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const packagesDir = join(root, "packages");
const onVercel = !!process.env.VERCEL;

// Workspaces that need the packages at runtime (the API function).
const targets = [join(root, "apps", "api", "node_modules", "@repo")];

if (!existsSync(packagesDir)) process.exit(0);

for (const targetDir of targets) {
  mkdirSync(targetDir, { recursive: true });
  for (const name of readdirSyncSafe(packagesDir)) {
    const source = join(packagesDir, name);
    const dest = join(targetDir, name);
    if (!lstatSync(source).isDirectory()) continue;
    rmSync(dest, { recursive: true, force: true });
    if (onVercel) {
      cpSync(source, dest, { recursive: true });
      // Pre-build a real JS entry: the function bundler compiles traced .ts
      // files to .js but keeps package.json as-is, so an "exports" target of
      // "./src/index.ts" would point at a file that no longer exists in the
      // bundle — and rewriting it to .js before the build would not resolve
      // either. Emitting src/index.js here makes both the trace and the
      // runtime work with "exports": "./src/index.js".
      const entry = join(dest, "src", "index.ts");
      if (existsSync(entry)) {
        execFileSync("bun", ["build", entry, "--outfile", join(dest, "src", "index.js"), "--format", "esm", "--target", "node", "--packages", "external"], { stdio: "inherit" });
        const pkgPath = join(dest, "package.json");
        if (existsSync(pkgPath)) {
          const pkg = readFileSync(pkgPath, "utf8").replace(/(?<!\.d)\.ts"/g, '.js"');
          writeFileSync(pkgPath, pkg);
        }
      }
    } else {
      symlinkSync(relative(targetDir, source), dest, "junction");
    }
  }
}

function readdirSyncSafe(dir) {
  try {
    return readdirSync(dir);
  } catch {
    return [];
  }
}
