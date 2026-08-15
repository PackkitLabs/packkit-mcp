---
'packkit-mcp': minor
---

Add a `compose_fullstack` tool — an agent can now stitch a static frontend project and
an HTTP service backend project, **from any generators**, into one fullstack repo
(`apps/web` + `apps/server`) with a `fullstack` deployment contract and a docker-compose.
E.g. a `javascript` react-app frontend + a `python` py-service (or `go` go-service)
backend, composed by id alone. Built on `@packkit/core@0.5.0`'s language-neutral
`composeFullstack` primitive (the server never learns the languages — it reads the static
+ service contracts). Realigns to `@packkit/core@^0.5.0` + `create-packkit-py@^2.2.0`.
