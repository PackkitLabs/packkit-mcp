---
'packkit-mcp': patch
---

Align on the 0.2.x platform line: `@packkit/core@^0.2.0`, `create-packkit@^4.1.0`, `create-packkit-py@^2.0.0`. `plan_upgrade` now returns the common `UpgradeResult` envelope for **both** generators (Python moved onto it), so an agent consumes a JS and a Python upgrade identically.
