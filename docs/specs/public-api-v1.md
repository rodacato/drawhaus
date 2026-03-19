# Public API /v1/

> RESTful CRUD endpoints for diagrams at `/v1/`, authenticated with API keys.

## Why

Enables programmatic diagram management for MCP servers, CLI tools, CI/CD pipelines, and custom integrations. Separate namespace from `/api/` with independent auth, rate limiting, and versioning.

## Architecture

- All routes under `/v1/` prefix — completely independent from `/api/`
- Auth: API Key via `Authorization: Bearer dhk_...` + `X-Drawhaus-Client` header
- Middleware chain applied to all `/v1/` routes: `requireSdkHeader` → `requireApiKey` → `logApiRequest`
- Rate limit: 60 req/min per API key (from api-keys spec)
- All operations scoped to the workspace of the API key
- Reuses existing use cases — no new business logic, just a transport layer
- Responses follow consistent envelope: `{ data: ... }` on success, `{ error: "message" }` on failure

## Endpoints

| Method | Path | Description | Use Case |
|--------|------|-------------|----------|
| `GET` | `/v1/health` | Health check (no auth) | MCP connectivity check |
| `POST` | `/v1/diagrams` | Create diagram | CreateDiagramUseCase |
| `GET` | `/v1/diagrams` | List diagrams in workspace | ListDiagramsUseCase |
| `GET` | `/v1/diagrams/:id` | Get diagram with elements | GetDiagramUseCase |
| `PATCH` | `/v1/diagrams/:id` | Update title, elements, appState | UpdateDiagramUseCase |
| `DELETE` | `/v1/diagrams/:id` | Delete diagram | DeleteDiagramUseCase |

## Request/Response Examples

### `GET /v1/health`
No auth required.
```json
{ "status": "ok", "version": "0.9.x" }
```

### `POST /v1/diagrams`
```json
// Request
{
  "title": "DB Schema",
  "folderId": "uuid-optional",
  "elements": [{ "id": "el-1", "type": "rectangle", "x": 0, "y": 0, "width": 200, "height": 100, ... }],
  "appState": { "viewBackgroundColor": "#ffffff" }
}

// Response 201
{
  "data": {
    "id": "uuid",
    "title": "DB Schema",
    "url": "https://drawhaus.example/board/uuid",
    "createdAt": "2026-03-19T..."
  }
}
```

### `GET /v1/diagrams`
Query params: `folderId`, `limit` (default 50, max 100), `offset`.
```json
{
  "data": [
    { "id": "uuid", "title": "DB Schema", "url": "...", "updatedAt": "...", "createdAt": "..." }
  ],
  "total": 42
}
```

### `GET /v1/diagrams/:id`
```json
{
  "data": {
    "id": "uuid",
    "title": "DB Schema",
    "elements": [...],
    "appState": {...},
    "url": "...",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

### `PATCH /v1/diagrams/:id`
All fields optional. At least one required.
```json
// Request
{ "title": "Updated Title", "elements": [...] }

// Response 200
{ "data": { "id": "uuid", "title": "Updated Title", "url": "...", "updatedAt": "..." } }
```

### `DELETE /v1/diagrams/:id`
```json
// Response 200
{ "data": { "id": "uuid", "deleted": true } }
```

## Validation

Zod schemas for all inputs:

- `title`: string, max 200 chars, trimmed
- `elements`: array, max 5000 items, max 5MB total payload
- `appState`: object, optional
- `folderId`: UUID, optional, must belong to same workspace
- Sanitization: strip HTML tags from text fields in elements (prevent stored XSS)

## Error Responses

Consistent error format with HTTP status codes:

```json
{ "error": "Diagram not found" }
```

| Status | When |
|--------|------|
| 400 | Missing `X-Drawhaus-Client`, invalid body, validation failure |
| 401 | Missing/invalid/expired/revoked API key |
| 403 | Diagram belongs to different workspace than API key scope |
| 404 | Diagram not found |
| 429 | Rate limit exceeded |
| 500 | Internal error |

## Ownership

Diagrams created via `/v1/` are owned by the API key's user, in the API key's workspace. The `createdVia` field is set to `"api"` to distinguish from UI-created diagrams.

## Files

- **Create**: `v1-diagram.routes.ts` (routes), `v1-health.routes.ts` (health), Zod schemas for v1 input validation, `excalidraw-sanitizer.ts` (strip HTML from element text fields)
- **Modify**: `main.ts` (mount `/v1/` routes with middleware chain), `diagram.ts` entity (add optional `createdVia` field), `create-diagram.ts` use case (accept `createdVia`), migration (add `created_via` column to diagrams)

## Pre-requisite

API Keys spec must be implemented first (middleware + auth infrastructure).

## Panel Notes

- Rafa: response includes `url` field so MCP/CLI can give user a clickable link. No new use cases — pure transport
- Nadia: folder ownership check — folderId must belong to same workspace as API key. Sanitize element text fields
- Leo: `url` in every response is the most important UX detail — developer clicks and sees their diagram
- Iris: `/v1/health` without auth for MCP pre-flight. Version in health response for debugging
- Maya: keep endpoint count minimal — CRUD only, no search/star/share in v1.0
