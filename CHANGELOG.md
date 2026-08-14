# packkit-mcp

## 1.0.2

### Patch Changes

- a931edf: Align on the 0.2.x platform line: `@packkit/core@^0.2.0`, `create-packkit@^4.1.0`, `create-packkit-py@^2.0.0`. `plan_upgrade` now returns the common `UpgradeResult` envelope for **both** generators (Python moved onto it), so an agent consumes a JS and a Python upgrade identically.

## 1.0.1

### Patch Changes

- 7aff87f: Add a `start` script (`node server.js`) so the server runs via the conventional `npm start` / `mcp-proxy -- npm run start` (e.g. Glama's default command). Document the known-good Glama build config in RELEASING.md.

## 1.0.0

### Major Changes

- 4ecbb93: Extracted into its own repository (`PackkitJS/packkit-mcp`) and rewritten as a multi-generator server on the `@packkit/core` protocol. It now fronts **every** Packkit generator — JavaScript/TypeScript (`create-packkit`) and Python (`create-packkit-py`) — through one tool set, and exposes protocol-native tools: `list_generators`, `list_presets`, `get_generator_schema`, `generate_project` (preview or write), and `plan_upgrade` (baseline-aware three-way upgrade). The previous JavaScript-only tools (`packkit_schema`/`packkit_preview`/`packkit_scaffold`) are replaced.
