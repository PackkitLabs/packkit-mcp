# packkit-mcp

## 1.2.0

### Minor Changes

- 9d9a94c: Add a `compose_fullstack` tool — an agent can now stitch a static frontend project and
  an HTTP service backend project, **from any generators**, into one fullstack repo
  (`apps/web` + `apps/server`) with a `fullstack` deployment contract and a docker-compose.
  E.g. a `javascript` react-app frontend + a `python` py-service (or `go` go-service)
  backend, composed by id alone. Built on `@packkit/core@0.5.0`'s language-neutral
  `composeFullstack` primitive (the server never learns the languages — it reads the static
  - service contracts). Realigns to `@packkit/core@^0.5.0` + `create-packkit-py@^2.2.0`.

## 1.1.1

### Patch Changes

- 3d9d75c: Republish under the **PackkitLabs** org. Following the `PackkitJS` → `PackkitLabs`
  rename, the MCP registry entry moves from `io.github.PackkitJS/packkit-mcp` to
  `io.github.PackkitLabs/packkit-mcp` (the `mcp-publisher` OIDC login derives the owner
  from the renamed repo, so `server.json`'s `io.github.PackkitLabs/…` name is claimed
  cleanly; the old entry orphans). No functional change — the server, its five protocol
  tools, and the JavaScript/Python/Go generators it fronts are unchanged.

## 1.1.0

### Minor Changes

- 8a8c79f: Register the Go generator (`create-packkit-go`) alongside JavaScript and Python — the
  MCP server now fronts all three languages through the same protocol tools, no tool
  changes needed (registering one more generator is the whole diff). An agent can
  `list_generators` → pick `go` → `generate_project` a Go library/CLI/worker/HTTP service.
  Go is experimental, so its presets are hidden until `includeExperimental: true`.

  Also realigns the whole dependency set to the `@packkit/core@0.4.0` line
  (`@packkit/core@^0.4.0`, `create-packkit@^4.3.0`, `create-packkit-py@^2.1.1`) so the
  multi-generator server never resolves a split core — core 0.4.0 generalized the
  `node-service` deployment type to the language-neutral `service`.

## 1.0.2

### Patch Changes

- a931edf: Align on the 0.2.x platform line: `@packkit/core@^0.2.0`, `create-packkit@^4.1.0`, `create-packkit-py@^2.0.0`. `plan_upgrade` now returns the common `UpgradeResult` envelope for **both** generators (Python moved onto it), so an agent consumes a JS and a Python upgrade identically.

## 1.0.1

### Patch Changes

- 7aff87f: Add a `start` script (`node server.js`) so the server runs via the conventional `npm start` / `mcp-proxy -- npm run start` (e.g. Glama's default command). Document the known-good Glama build config in RELEASING.md.

## 1.0.0

### Major Changes

- 4ecbb93: Extracted into its own repository (`PackkitLabs/packkit-mcp`) and rewritten as a multi-generator server on the `@packkit/core` protocol. It now fronts **every** Packkit generator — JavaScript/TypeScript (`create-packkit`) and Python (`create-packkit-py`) — through one tool set, and exposes protocol-native tools: `list_generators`, `list_presets`, `get_generator_schema`, `generate_project` (preview or write), and `plan_upgrade` (baseline-aware three-way upgrade). The previous JavaScript-only tools (`packkit_schema`/`packkit_preview`/`packkit_scaffold`) are replaced.
