#!/usr/bin/env node
// managed-by: activ8-ai-context-pack | pack-version: 1.2.0
// source-sha: a0d4785

import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");

const args = process.argv.slice(2);
const strict = args.includes("--strict");

let target = ".";
for (let i = 0; i < args.length; i += 1) {
  if (args[i] === "--target" && args[i + 1]) {
    target = args[i + 1];
    break;
  }
}

const requiredFiles = [
  "AGENTS.md",
  "CLAUDE.md",
  "docs/SOURCES-OF-TRUTH.md",
  "docs/AUDIENCE-SURFACE-CONTRACT.md",
];
const missing = requiredFiles.filter((relativePath) => !existsSync(join(REPO_ROOT, relativePath)));

const payload = {
  action: "context-pack-self-sync",
  target,
  strict,
  status: missing.length === 0 ? "ok" : "missing_required_context",
  missing,
};

process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);

if (strict && missing.length > 0) {
  process.exit(1);
}
