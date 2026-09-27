import { config } from "@repo/eslint-config/base";

/** @type {import("eslint").Linter.Config[]} */
export default [
  // Local `vercel build` output (function bundles) must not be linted.
  { ignores: [".vercel/**"] },
  ...config,
];
