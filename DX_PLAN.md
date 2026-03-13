# Plan v0.8.0 — Developer Experience

> Release enfocado en DX: setup wizard, secrets en DB, seguridad básica, y operabilidad.

## Grafo de Dependencias

```
Tarea 2 (Helmet)           ──┐
Tarea 1 (Rate Limiting)    ──┤── Independientes (Sprint 1)
Tarea 4 (Healthcheck)      ──┤
Tarea 5 (Version endpoint) ──┘
                               │
                               ▼
Tarea 3 (Setup Lock)       ── depende de: Tarea 4 (para que /health no se bloquee)
                               │
                               ▼
Tarea 6 (Setup Wizard)     ── depende de: Tarea 3 (usa el flag setup_completed)
                               │
                               ▼
Tarea 7 (Secrets en DB)    ── depende de: Tarea 6 (wizard paso 3 configura integraciones)
```

---

## TIER 1 — Alto impacto, bajo esfuerzo (S)

### Tarea 1: Rate Limiting

**Dependencias:** Ninguna

**Archivos a crear:**
- `backend/src/infrastructure/http/middleware/rate-limit.ts`

**Archivos a modificar:**
- `backend/package.json` — agregar `express-rate-limit`
- `backend/src/main.ts` — aplicar middlewares

**Implementación:**

1. Instalar `express-rate-limit`. No necesita store adicional (single-instance). Si escala, usar `rate-limit-redis` con el Redis ya existente.

2. Exportar dos limiters preconfigurados:
   - `authLimiter`: `windowMs: 60_000`, `max: 5`, mensaje "Too many attempts, please try again later"
   - `generalLimiter`: `windowMs: 60_000`, `max: 20`

3. Aplicar en `main.ts`:
   - `authLimiter` en `POST /api/auth/login`, `/register`, `/forgot-password`, `/reset-password`
   - `generalLimiter` en `app.use("/api", generalLimiter)` después de las rutas auth específicas

4. Excluir `/health` y `/api/site/status` (al estar antes del middleware, quedan excluidos naturalmente).

5. Pasar `standardHeaders: "draft-7"` y `legacyHeaders: false`.

**Frontend:** No requiere cambios. Opcionalmente interceptor para toast en 429.

---

### Tarea 2: Helmet Security Headers

**Dependencias:** Ninguna

**Archivos a modificar:**
- `backend/package.json` — agregar `helmet`
- `backend/src/main.ts` — agregar como primer middleware, ANTES de `cors()`

**Implementación:**

1. Agregar `app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }))` justo después de `const app = express()`.

2. `contentSecurityPolicy: false` porque la API es backend puro (SPA separada).

3. `crossOriginEmbedderPolicy: false` porque `/embed/:token` necesita funcionar en iframes.

**Frontend:** No requiere cambios.

---

### Tarea 3: Setup Lock

**Dependencias:** Tarea 4

**Archivos a crear:**
- `backend/src/infrastructure/http/middleware/setup-lock.ts`

**Archivos a modificar:**
- `backend/src/infrastructure/db.ts` — agregar `setup_completed BOOLEAN NOT NULL DEFAULT false` a `site_settings`
- `backend/src/domain/entities/site-settings.ts` — agregar `setupCompleted: boolean`
- `backend/src/infrastructure/persistence/pg-site-settings-repository.ts` — agregar campo al SELECT, toDomain, y update
- `backend/src/main.ts` — montar middleware
- `backend/src/infrastructure/http/routes/admin.routes.ts` — agregar `POST /api/admin/complete-setup`

**Implementación:**

1. Agregar columna en `initSchema()`: `ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS setup_completed BOOLEAN NOT NULL DEFAULT false;`

2. Middleware `createSetupLock(siteSettingsRepo)`:
   - Cachea `setup_completed` en memoria (invalidar cada 30s o al actualizar)
   - Si `false`: permite `/health`, `/api/auth/setup-status`, `/api/auth/register`, `/api/site/status`, `/api/version`, `/api/setup/*`
   - Todo lo demás: `403 { error: "setup_required", redirect: "/setup" }`

3. Montar después de `express.json()` pero ANTES de las rutas de API.

4. Nuevo endpoint `POST /api/admin/complete-setup` (solo admin, solo si `setup_completed === false`).

**Frontend:**
- `frontend/src/api/client.ts` — interceptor que detecte `error: "setup_required"` y redirija a `/setup`
- `frontend/src/pages/Setup.tsx` — se expandirá en Tarea 6
- `frontend/src/layouts/ProtectedLayout.tsx` — verificar setup status

---

### Tarea 4: Healthcheck Mejorado

**Dependencias:** Ninguna

**Archivos a modificar:**
- `backend/src/main.ts` — reescribir handler de `GET /health` (línea ~284)
- `backend/src/infrastructure/config.ts` — agregar `appVersion`

**Implementación:**

1. Reemplazar handler simple por uno que:
   - Ejecute `SELECT 1` contra PostgreSQL
   - Lea versión de `process.env.npm_package_version`
   - Devuelva: `{ status: "ok"|"degraded", version: "0.8.0", uptime: process.uptime(), database: "ok"|"error" }`
   - Si DB falla: HTTP 503 con `status: "degraded"`

2. Agregar `appVersion: process.env.npm_package_version ?? "0.0.0"` a `config.ts`.

3. Kamal healthcheck apunta a `/health` y espera HTTP 200. Si DB cae, 503 marca el container como unhealthy — comportamiento deseado.

**Frontend:** No requiere cambios.

---

### Tarea 5: Version Endpoint

**Dependencias:** Ninguna (comparte constante de versión con Tarea 4)

**Archivos a modificar:**
- `backend/src/infrastructure/config.ts` — agregar `appVersion`, `gitCommit`, `deployedAt`
- `backend/src/main.ts` — agregar `GET /api/version`
- `config/deploy.backend.yml` — pasar `GIT_COMMIT` como env var
- `.github/workflows/build-push.yml` — pasar build arg `GIT_COMMIT=${{ github.sha }}`
- `backend/Dockerfile` — aceptar build arg

**Implementación:**

1. En `config.ts`:
   - `appVersion`: `process.env.npm_package_version ?? "unknown"`
   - `gitCommit`: `process.env.GIT_COMMIT ?? "unknown"`
   - `deployedAt`: `process.env.DEPLOYED_AT ?? new Date().toISOString()`

2. En `main.ts`:
   ```
   app.get("/api/version", (_req, res) => {
     res.json({ version: config.appVersion, commit: config.gitCommit, deployedAt: config.deployedAt });
   });
   ```

3. En CI, pasar `--build-arg GIT_COMMIT=${{ github.sha }}` al Docker build.

**Frontend (opcional):** Mostrar versión en footer del admin panel.

---

## TIER 2 — Alto impacto, esfuerzo medio (M)

### Tarea 6: Setup Wizard (3 pasos)

**Dependencias:** Tarea 3

**Estructura:**
- **Paso 1:** Crear cuenta admin (ya existe en `Setup.tsx`)
- **Paso 2:** Configuración de instancia (nombre, registro abierto/cerrado)
- **Paso 3:** Integraciones (Google OAuth, Resend) — skippable
- **Finalización:** `POST /api/setup/complete`, banner "Finish setup" si paso 3 saltado

**Archivos a crear (backend):**
- `backend/src/infrastructure/http/routes/setup.routes.ts`

**Archivos a modificar (backend):**
- `backend/src/main.ts` — montar setup routes antes del setup lock
- `backend/src/infrastructure/http/routes/admin.routes.ts` — agregar `POST /complete-setup`
- `backend/src/domain/entities/site-settings.ts` — agregar `setupSkippedIntegrations: boolean`
- `backend/src/infrastructure/db.ts` — agregar columna `setup_skipped_integrations`
- `backend/src/infrastructure/persistence/pg-site-settings-repository.ts` — agregar campos

**Rutas del wizard:**
- `GET /api/setup/status` → `{ step: 1|2|3|"complete", setupCompleted: boolean }`
- `POST /api/setup/step-2` → recibe `{ instanceName, registrationOpen }`, requiere admin auth
- `POST /api/setup/step-3` → recibe datos de integraciones
- `POST /api/setup/skip-step-3` → marca `setupSkippedIntegrations = true`
- `POST /api/setup/complete` → marca `setupCompleted = true`

**Lógica de paso actual:**
- No hay usuarios → Paso 1
- Hay admin pero no configurada instancia → Paso 2
- Paso 2 completo, integraciones no configuradas ni saltadas → Paso 3
- Todo completo → `setup_completed = true`

**Archivos a crear (frontend):**
- `frontend/src/components/setup/SetupStep1.tsx` — formulario admin (mover lógica de Setup.tsx)
- `frontend/src/components/setup/SetupStep2.tsx` — configuración de instancia
- `frontend/src/components/setup/SetupStep3.tsx` — integraciones (skippable)
- `frontend/src/components/setup/SetupProgress.tsx` — barra de progreso
- `frontend/src/api/setup.ts` — funciones API

**Archivos a modificar (frontend):**
- `frontend/src/pages/Setup.tsx` — reescribir como wizard multi-paso
- `frontend/src/layouts/AppShell.tsx` — banner "Finish setup" si admin + `setupSkippedIntegrations`

---

### Tarea 7: Integration Secrets en DB

**Dependencias:** Tarea 6

**Concepto:** Migrar claves de Google OAuth, Resend y Honeybadger de env vars a almacenamiento cifrado en DB. Las env vars siguen funcionando como fallback.

**Se mueven a DB (cifrados):**
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
- `RESEND_API_KEY`, `FROM_EMAIL`
- `HONEYBADGER_API_KEY`

**Se quedan en env vars (infra):**
- `DATABASE_URL`, `SESSION_SECRET`, `ENCRYPTION_KEY`
- `PORT`, `FRONTEND_URL`, `COOKIE_DOMAIN`, `NODE_ENV`
- `REDIS_URL`

**Archivos a crear (backend):**
- `backend/src/infrastructure/services/encryption.ts` — AES-256-GCM con Node `crypto`
- `backend/src/infrastructure/persistence/pg-integration-secrets-repository.ts`
- `backend/src/domain/ports/integration-secrets-repository.ts`
- `backend/src/domain/entities/integration-secret.ts`
- `backend/src/application/use-cases/admin/get-integration-secrets.ts`
- `backend/src/application/use-cases/admin/update-integration-secrets.ts`

**Archivos a modificar (backend):**
- `backend/src/infrastructure/db.ts` — crear tabla:
  ```sql
  CREATE TABLE IF NOT EXISTS integration_secrets (
    key TEXT PRIMARY KEY,
    encrypted_value TEXT NOT NULL,
    iv TEXT NOT NULL,
    auth_tag TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  ```
- `backend/src/infrastructure/config.ts` — agregar `encryptionKey`, helper `getSecret(key)` con fallback a env var
- `backend/src/main.ts` — instanciar repositorio, crear `ConfigProvider`
- `backend/src/infrastructure/services/email-service.ts` — usar `ConfigProvider` en vez de `config.resendApiKey`
- `backend/src/application/use-cases/auth/google-auth.ts` — usar `ConfigProvider`
- `backend/src/infrastructure/http/routes/admin.routes.ts` — agregar `GET/PATCH /api/admin/integrations`
- `config/deploy.backend.yml` — agregar `ENCRYPTION_KEY` a secrets
- `.env.example` — agregar `ENCRYPTION_KEY=`
- `.kamal/secrets` — agregar `ENCRYPTION_KEY=$ENCRYPTION_KEY`

**Cifrado:**
- `encrypt(plaintext, key)`: IV aleatorio 12 bytes, AES-256-GCM, retorna `{ encrypted, iv, authTag }` en base64
- `decrypt(encrypted, iv, authTag, key)`: descifra y retorna plaintext
- `ENCRYPTION_KEY` debe ser 32 bytes (64 chars hex). Generar con `openssl rand -hex 32`

**ConfigProvider:**
- Primero lee de `integration_secrets`
- Si no existe o no hay `ENCRYPTION_KEY`, fallback a `process.env[key]`
- Caché en memoria con TTL de 60 segundos

**API de admin:**
- `GET /api/admin/integrations` — devuelve secrets mascarados + `source: "db"|"env"|"none"` por cada uno
- `PATCH /api/admin/integrations` — recibe `{ key, value }`, cifra y guarda en DB

**Archivos a crear (frontend):**
- `frontend/src/components/IntegrationSecretsPanel.tsx` — inputs password + reveal

**Archivos a modificar (frontend):**
- `frontend/src/api/admin.ts` — agregar `getIntegrations()`, `updateIntegration(key, value)`
- `frontend/src/pages/AdminSettings.tsx` — sección "Integraciones"
- `frontend/src/components/setup/SetupStep3.tsx` — usa mismos endpoints

**Seguridad:**
- Solo admins pueden leer/escribir integrations
- Valores nunca se devuelven en texto plano desde la API
- Sin `ENCRYPTION_KEY`, el sistema funciona con env vars y la UI muestra aviso

---

## TIER 3 — Nice to have

### Tarea 8: DB Backup Cron

**Archivos a crear:**
- `backend/src/scripts/db-backup.ts` — script con `pg_dump` via `child_process`
- `backend/src/infrastructure/cron/backup-scheduler.ts` — `node-cron` o `setInterval`

**Archivos a modificar:**
- `backend/package.json` — script `db:backup`, dependencia `node-cron`
- `backend/src/main.ts` — iniciar scheduler si `config.backupEnabled`
- `backend/src/infrastructure/config.ts` — `backupEnabled`, `backupCron`, `backupRetentionDays`
- `config/deploy.backend.yml` — volumen para backups
- `backend/Dockerfile` — instalar `postgresql-client`

**Enfoque:** `pg_dump` diario a las 3AM UTC. Rotación por edad (eliminar > N días).

### Tarea 9: Smoke Test E2E

**Archivos a modificar:**
- `e2e/tests/smoke/critical-paths.spec.ts` — expandir con:
  - `/health` retorna 200 con campo `version`
  - `/api/version` retorna datos válidos
  - Login → dashboard → crear diagrama → abrir board end-to-end
  - Setup wizard funciona en instancia limpia

### Tarea 10: Fix Rough Edges

- Zod validation en todos los endpoints nuevos
- Mensajes de error consistentes
- Rate limiting desactivado en test environment
- Setup lock no bloquea `/share/:token` ni `/embed/:token`

---

## Resumen de Archivos por Tarea

| Tarea | Backend Crear | Backend Modificar | Frontend Crear | Frontend Modificar |
|-------|--------------|-------------------|----------------|-------------------|
| 1 Rate Limit | `middleware/rate-limit.ts` | `package.json`, `main.ts` | — | (opcional: `client.ts`) |
| 2 Helmet | — | `package.json`, `main.ts` | — | — |
| 3 Setup Lock | `middleware/setup-lock.ts` | `db.ts`, `site-settings.ts`, `pg-site-settings-repo.ts`, `main.ts`, `admin.routes.ts` | — | `client.ts`, `Setup.tsx`, `ProtectedLayout.tsx` |
| 4 Healthcheck | — | `main.ts`, `config.ts` | — | — |
| 5 Version | — | `config.ts`, `main.ts`, `deploy.backend.yml`, `build-push.yml`, `Dockerfile` | — | (opcional: admin panel) |
| 6 Wizard | `routes/setup.routes.ts` | `main.ts`, `admin.routes.ts`, `db.ts`, `pg-site-settings-repo.ts`, `site-settings.ts` | `SetupStep1-3.tsx`, `SetupProgress.tsx`, `api/setup.ts` | `Setup.tsx`, `AppShell.tsx` |
| 7 Secrets DB | `encryption.ts`, `pg-integration-secrets-repo.ts`, interfaz, entidad, 2 use-cases | `db.ts`, `config.ts`, `main.ts`, `email-service.ts`, `google-auth.ts`, `admin.routes.ts`, `.env.example`, `deploy.backend.yml` | `IntegrationSecretsPanel.tsx` | `admin.ts`, `AdminSettings.tsx`, `SetupStep3.tsx` |

## Plan de Ejecución

| Sprint | Tareas | Duración estimada |
|--------|--------|-------------------|
| 1 | Tareas 1, 2, 4, 5 (paralelo) | 1-2 días |
| 2 | Tarea 3 (Setup Lock) | 1 día |
| 3 | Tarea 6 (Setup Wizard) | 2-3 días |
| 4 | Tarea 7 (Secrets en DB) | 2-3 días |
| 5 | Tareas 8, 9, 10 (pulido) | 1 día |
| — | Bump versión a 0.8.0 | Último paso |

---

*Narrativa del release: "Instala Drawhaus, corre el wizard, configura todo desde el admin panel, sin tocar env vars nunca más."*
