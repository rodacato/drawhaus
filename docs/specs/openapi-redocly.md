# OpenAPI + Redocly

> Machine-readable API spec and interactive documentation for the `/v1/` public API.

## Why

A public API without docs doesn't exist. OpenAPI spec serves as source of truth for validation, client generation, and interactive docs. Redocly generates a polished developer portal with zero custom UI work.

## Architecture

- `docs/openapi.yaml` — OpenAPI 3.1 spec covering all `/v1/` endpoints
- `@redocly/cli` as devDependency in root workspace
- `redocly lint` runs in CI — invalid spec blocks merge
- `redocly build-docs` generates static HTML
- Docs served at `/v1/docs` via backend static file middleware or separate hosting

## Spec Structure

```yaml
openapi: 3.1.0
info:
  title: Drawhaus Public API
  version: 1.0.0
  description: Programmatic access to Drawhaus diagrams.

servers:
  - url: "{baseUrl}/v1"
    variables:
      baseUrl:
        default: http://localhost:3001

security:
  - apiKey: []

paths:
  /health: ...
  /diagrams: ...
  /diagrams/{id}: ...

components:
  securitySchemes:
    apiKey:
      type: http
      scheme: bearer
      description: "API key with `dhk_` prefix"
  headers:
    X-Drawhaus-Client:
      required: true
      schema:
        type: string
      description: "Required client identifier header"
  schemas:
    Diagram: ...
    CreateDiagramRequest: ...
    Error: ...
```

## Documentation Content

Each endpoint includes:
- Description and use case
- Full request/response examples
- Error codes and meanings
- Auth requirements (API key + header)

Additional pages:
- **Authentication guide**: How to create API key, required headers, example curl
- **MCP setup**: Copy-paste config for Claude Code, Cursor, VS Code
- **Rate limits**: 60 req/min per key, response headers (`X-RateLimit-*`)
- **Quickstart**: Create first diagram in 3 commands

## Scripts

```json
{
  "docs:lint": "redocly lint docs/openapi.yaml",
  "docs:build": "redocly build-docs docs/openapi.yaml -o docs/api/index.html",
  "docs:preview": "redocly preview docs/openapi.yaml"
}
```

## CI

Add `npm run docs:lint` to the lint step in CI pipeline. Spec validation runs alongside ESLint and TypeScript checks.

## Files

- **Create**: `docs/openapi.yaml`, `docs/redocly.yaml` (Redocly config), `docs/api/.gitkeep` (build output dir)
- **Modify**: root `package.json` (add scripts + devDependency), CI config (add docs:lint step)

## Pre-requisite

Public API /v1/ endpoints must be implemented first (spec documents existing endpoints).

## Panel Notes

- Ethan: docs ARE the developer landing page. Quickstart section is mandatory — 3 commands to first diagram
- Leo: copy-paste examples for auth headers, curl, and MCP config. Developer should never guess
- Iris: `redocly lint` in CI catches drift between spec and reality. Treat spec as code
- Rafa: don't generate Zod from OpenAPI or vice versa — maintain separately, validate both in CI
