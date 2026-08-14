# packkit-mcp

[![npm](https://img.shields.io/npm/v/packkit-mcp)](https://www.npmjs.com/package/packkit-mcp)

The **Packkit** [Model Context Protocol](https://modelcontextprotocol.io) server —
let AI agents (Claude Desktop, Cursor, VS Code, …) scaffold and upgrade modern
projects as a native tool. It fronts **every** Packkit generator through the
[`@packkit/core`](https://github.com/PackkitLabs/packkit-core) protocol, so the same
tools work across languages:

- **JavaScript / TypeScript** — [`create-packkit`](https://github.com/PackkitLabs/create-packkit-js) (libraries, CLIs, services, SPAs, monorepos)
- **Python** — [`create-packkit-py`](https://github.com/PackkitLabs/create-packkit-py) (libraries, CLIs)

Adding a language later is one `registry.register(...)` line here — the tools don't change.

## Install

Point your MCP client at the published package (no install needed — `npx` fetches it):

```json
{
  "mcpServers": {
    "packkit": {
      "command": "npx",
      "args": ["-y", "packkit-mcp"]
    }
  }
}
```

## Tools

| Tool | What it does |
| --- | --- |
| `list_generators` | List every generator (language target) with maturity + capabilities. **Start here.** |
| `list_presets` | List a generator's presets (experimental hidden unless asked). |
| `get_generator_schema` | A generator's full option schema (options, choices, defaults). |
| `generate_project` | Preview a project (file tree + stack + deployment contract), or `write: true` to scaffold to disk. |
| `plan_upgrade` | Baseline-aware three-way upgrade plan for an existing project — template changes vs your edits, writes nothing. |

The typical flow: `list_generators` → `list_presets` / `get_generator_schema` →
`generate_project`. All generation is protocol-driven; the server holds no
language-specific logic.

## Develop

```sh
npm install
npm run smoke     # boot the server over MCP stdio and exercise all three generators
npm run check     # server.json sync check + smoke (what CI runs)
```

Releases are automated with [Changesets](https://github.com/changesets/changesets) —
see [RELEASING.md](./RELEASING.md).

## License

MIT © DanMat
