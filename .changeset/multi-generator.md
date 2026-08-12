---
'packkit-mcp': major
---

Extracted into its own repository (`PackkitJS/packkit-mcp`) and rewritten as a multi-generator server on the `@packkit/core` protocol. It now fronts **every** Packkit generator — JavaScript/TypeScript (`create-packkit`) and Python (`create-packkit-py`) — through one tool set, and exposes protocol-native tools: `list_generators`, `list_presets`, `get_generator_schema`, `generate_project` (preview or write), and `plan_upgrade` (baseline-aware three-way upgrade). The previous JavaScript-only tools (`packkit_schema`/`packkit_preview`/`packkit_scaffold`) are replaced.
