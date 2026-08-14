---
'packkit-mcp': minor
---

Register the Go generator (`create-packkit-go`) alongside JavaScript and Python — the
MCP server now fronts all three languages through the same protocol tools, no tool
changes needed (registering one more generator is the whole diff). An agent can
`list_generators` → pick `go` → `generate_project` a Go library/CLI/worker/HTTP service.
Go is experimental, so its presets are hidden until `includeExperimental: true`.

Also realigns the whole dependency set to the `@packkit/core@0.4.0` line
(`@packkit/core@^0.4.0`, `create-packkit@^4.3.0`, `create-packkit-py@^2.1.1`) so the
multi-generator server never resolves a split core — core 0.4.0 generalized the
`node-service` deployment type to the language-neutral `service`.
