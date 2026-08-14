# Releasing `packkit-mcp`

How the server gets published, and to every place it's listed. Several of these
steps fail in non-obvious ways — see [Gotchas](#gotchas).

## Where it's listed

| Surface | Identifier | Updated by |
| --- | --- | --- |
| **npm** | `packkit-mcp` | `release.yml` — automatic (Changesets + OIDC) |
| **Official MCP registry** | `io.github.PackkitLabs/packkit-mcp` | `release.yml` — automatic |
| **Glama** | [`PackkitLabs/packkit-mcp`](https://glama.ai/mcp/servers/PackkitLabs/packkit-mcp) | Admin → **Build & Release** — **manual** |
| **awesome-mcp-servers** | README entry + Glama score badge | manual |

Clients (Cursor, VS Code, Glama…) resolve the install command from the **official
registry**, so that one matters most.

## Two files must agree

| File | Field | Must equal |
| --- | --- | --- |
| `package.json` | `version` | the npm version being published (source of truth) |
| `package.json` | `mcpName` | `server.json` → `name` **exactly** (case-sensitive) |
| `server.json` | `version`, `packages[0].version` | `package.json` → `version` |

`npm run sync:mcp` rewrites `server.json` from `package.json` and fails if `mcpName`
and `server.json`'s `name` disagree. `server.js` reads its version from
`package.json` at runtime, so there's nothing to sync there. CI runs
`npm run sync:mcp -- --check` (via `npm run check`) so drift can't merge.

## The release flow

Releases are automated with [Changesets](https://github.com/changesets/changesets)
(mirroring the other PackkitLabs repos):

1. A change lands with a changeset (`npx changeset`).
2. On push to `main`, `release.yml` opens/updates a **Version Packages** PR
   (`changeset version` bumps `package.json` + `CHANGELOG.md`, then `sync:mcp`
   updates `server.json`).
3. Merging that PR runs `changeset publish` → **npm**, tokenless via **OIDC
   Trusted Publishing** (no `NPM_TOKEN`; provenance automatic). The publish step
   stays in this repo.
4. Once npm has the new version, the workflow pushes the entry to the **official
   MCP registry** via GitHub OIDC (`mcp-publisher login github-oidc` — no secrets),
   gated on step 3 actually publishing (the registry verifies npm ownership).

**Only Glama stays manual** — its build/release is an admin-panel action with no
public write API. After a release: Glama Admin → **Build & Release**.

## Releasing by hand

Only for an out-of-band change (the workflow covers the normal path):

```sh
# 1. bump package.json version, then sync server.json
npm run sync:mcp
# 2. publish to npm FIRST (the registry verifies against it)
npm publish
# 3. push the official-registry entry (reads ./server.json)
mcp-publisher login github     # once per machine; browser device-code flow
mcp-publisher publish
```

## Gotchas

1. **The registry namespace is case-sensitive** — `io.github.PackkitLabs`, matching
   the GitHub org's capitalisation. Lowercase → `403 … permission to publish: io.github.PackkitLabs/*`.
2. **`mcpName` proves npm ownership**, so it must equal `server.json`'s `name`
   byte-for-byte. A published npm version can't be overwritten — a wrong `mcpName`
   means publishing a *new* version with it corrected.
3. **`server.json` `description` must be ≤ 100 characters**, or the publish fails
   with `422 … expected length <= 100`.
4. **Publish to npm *before* `mcp-publisher publish`** — the registry fetches the
   npm package to verify `mcpName`.
5. **`npm publish` `E404` usually means auth, not a missing package** — check
   `npm whoami`.
6. **awesome-mcp-servers requires a *passing* Glama listing** plus the score badge:
   `[![PackkitLabs/packkit-mcp MCP server](https://glama.ai/mcp/servers/PackkitLabs/packkit-mcp/badges/score.svg)](https://glama.ai/mcp/servers/PackkitLabs/packkit-mcp)`
7. **`glama.json` only carries `maintainers`** — the ownership/claim hook. Name,
   description, and build config live in Glama's admin panel after claiming.

### Glama build config (known-good, standalone repo)

Glama generates its own Dockerfile from the Admin form (the repo `Dockerfile` is
for other hosts). Since the server now lives at the repo root (not an `mcp/`
subfolder), build steps run from `/app`:

| Field | Value |
| --- | --- |
| Base image | `debian:trixie-slim` |
| Node.js version | `26` |
| Build steps | `["npm ci --omit=dev"]` |
| CMD arguments | `["node", "server.js"]` |
| Env vars schema | `{"properties":{},"required":[],"type":"object"}` |
| Pinned commit SHA | *(empty — tracks latest)* |

Do **not** accept Glama's auto-filled defaults verbatim — they assume `pnpm install`
and `mcp-proxy -- pnpm run start`. This repo uses **npm**, so use `npm ci --omit=dev`.
A `start` script (`node server.js`) exists, so `mcp-proxy -- npm run start` also works
if you prefer the conventional form. If a build fails at *"load metadata for
debian:trixie-slim … context deadline exceeded"*, that's a transient Docker Hub
timeout on Glama's side — just retry.
