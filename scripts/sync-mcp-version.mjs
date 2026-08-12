#!/usr/bin/env node
// Keep server.json's version in step with package.json (the source of truth), and
// guard the invariant the official registry cares about: package.json `mcpName`
// must equal server.json `name` byte-for-byte (case-sensitive) — the registry uses
// it to verify npm-package ownership, so a mismatch fails the publish. server.js
// reads its own version from package.json at runtime, so there's nothing to sync
// there.
//
//   npm run sync:mcp            # rewrite server.json from package.json
//   npm run sync:mcp -- --check # verify only; exit 1 on drift (used in CI)
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const checkOnly = process.argv.includes('--check');

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const server = JSON.parse(readFileSync(join(root, 'server.json'), 'utf8'));

if (pkg.mcpName !== server.name) {
  console.error(
    `mcpName mismatch: package.json "${pkg.mcpName}" !== server.json "${server.name}".\n` +
      'The MCP registry uses this to verify you own the npm package; they must match exactly (case-sensitive).',
  );
  process.exit(1);
}

const next = { ...server, version: pkg.version };
if (Array.isArray(next.packages) && next.packages[0]) {
  next.packages = next.packages.map((p, i) => (i === 0 ? { ...p, version: pkg.version } : p));
}
const serialized = JSON.stringify(next, null, 2) + '\n';
const current = readFileSync(join(root, 'server.json'), 'utf8');

if (serialized === current) {
  console.log(`server.json already in sync at ${pkg.version}.`);
  process.exit(0);
}

if (checkOnly) {
  console.error(`server.json is out of sync (expected version ${pkg.version}). Run \`npm run sync:mcp\` and commit.`);
  process.exit(1);
}

writeFileSync(join(root, 'server.json'), serialized);
console.log(`Synced server.json to ${pkg.version}.`);
