---
'packkit-mcp': patch
---

Republish under the **PackkitLabs** org. Following the `PackkitJS` → `PackkitLabs`
rename, the MCP registry entry moves from `io.github.PackkitJS/packkit-mcp` to
`io.github.PackkitLabs/packkit-mcp` (the `mcp-publisher` OIDC login derives the owner
from the renamed repo, so `server.json`'s `io.github.PackkitLabs/…` name is claimed
cleanly; the old entry orphans). No functional change — the server, its five protocol
tools, and the JavaScript/Python/Go generators it fronts are unchanged.
