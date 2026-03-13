# DX & Documentation Audit — Drawhaus

> Dos perspectivas: un experto en DX/OSS y un developer promedio intentando usar el proyecto.

---

## Perspectiva 1: Experto en DX & Open Source

### Lo que está bien

| Área | Evaluación |
|------|-----------|
| README.md | Excelente — tiene quick start, env vars, project structure, tech stack, deployment completo, API overview, y routes. Es de los mejores READMEs para un proyecto de este tamaño. |
| .env.example | Muy bien documentado — secciones claras, comentarios explicativos, links a donde obtener las keys. |
| CHANGELOG.md | Completo y bien estructurado — sigue Keep a Changelog, cubre v0.1 a v0.7. |
| CONTRIBUTING.md | Existe y cubre lo básico: setup, workflow, code style, bug reports, PRs. |
| SECURITY.md | Bien hecho — tiene policy, disclosure timeline, scope, y self-hosting tips. |
| ROADMAP.md | Muy detallado — incluye decision log, sizing, versioning policy. |
| CI/CD | GitHub Actions con lint, typecheck, unit tests, build, y e2e separado con Playwright + PG service. |
| DevContainer | Configurado y funcional. |
| Docker Compose | Funciona out of the box con healthchecks. |

### Problemas encontrados

#### P1 — Críticos (bloquean onboarding o causan errores)

1. **CHANGELOG.md no menciona v0.8.0**
   - Las features de rate limiting, setup wizard, secrets en DB, healthcheck, version endpoint, y backups no están documentadas.
   - Un developer que instale v0.8.0 no sabrá que existen.

2. **README env vars incompleto para v0.8.0**
   - Faltan: `ENCRYPTION_KEY`, `REDIS_URL`, `BACKUP_ENABLED`, `BACKUP_CRON`, `BACKUP_PATH`, `BACKUP_RETENTION_DAYS`.
   - `REDIS_URL` está en .env.example pero no en README.

3. **README Commands table incompleta**
   - Faltan: `npm run test`, `npm run test:e2e`, `npm run db:seed`, `npm run db:reset`, `npm run db:backup`, `npm run db:restore`.
   - Un contributor no sabe cómo correr tests o resetear la DB.

4. **README API overview desactualizado**
   - Faltan endpoints: `/api/setup/*`, `/api/admin/integrations`, `/api/admin/backups/*`, `/api/admin/invite`, `/api/version`, `/health` mejorado.
   - Share endpoints están mal — muestra `/api/share/link` pero el código usa `/api/share/:diagramId`.
   - Faltan secciones: Workspaces, Folders, Comments, Tags, Scenes, Drive.

5. **CONTRIBUTING.md dice copiar .env.example a `backend/`**
   - Incorrecto — el .env va en la raíz del proyecto, no en backend/. Esto bloquea al contributor.

6. **ROADMAP.md tiene items de v1.0 Gate que ya están implementados**
   - Rate limiting, Helmet, Setup lock, Setup wizard, Integration secrets, Healthcheck, Version endpoint, DB backup — todo marcado como "What's Next" pero ya existe.

#### P2 — Importantes (causan confusión)

7. **Docker Compose expone backend en puerto 4300, no 4000**
   - README dice "Backend at http://localhost:4000" en Quick Start.
   - Pero Docker Compose mapea `4300:4000`. El frontend dentro de Docker apunta a 4300 también.
   - Los developers que usen Docker tendrán un mismatch confuso.

8. **No hay issue templates ni PR template en `.github/`**
   - Solo hay workflows. Agregar templates mejora la calidad de issues/PRs de contributors.

9. **SECURITY.md dice version 0.7.x supported**
   - Debería ser 0.8.x ahora.

10. **No existe `.env.production.example`**
    - README lo referencia: "See `.env.production.example` for the production template"
    - Pero el archivo no existe en el repo.

11. **Frontend Dockerfile no existe para dev fuera de Docker Compose**
    - Solo hay `backend/Dockerfile`. El frontend build instructions dependen de que el developer sepa que es Cloudflare Pages.

12. **No hay `CODE_OF_CONDUCT.md`**
    - Estándar de OSS. GitHub lo pide para community health.

#### P3 — Nice-to-have

13. **No hay ADR (Architecture Decision Records) como archivos separados**
    - El ROADMAP tiene un decision log inline, pero sería mejor tenerlos como docs/adr/ individuales.

14. **No hay documentación de la API en formato OpenAPI/Swagger**
    - El README tiene una tabla básica, pero no hay un spec formal.

15. **No hay `Makefile` como wrapper de comandos**
    - Muchos proyectos OSS usan `make dev`, `make test`, `make deploy` como facade.

16. **E2e tests no mencionados en README quick start**
    - No se explica cómo correr los e2e tests localmente.

17. **No hay `docs/architecture.md`**
    - La estructura Clean Architecture del backend no está documentada en ningún lado.

---

## Perspectiva 2: Developer Promedio (Node.js, no expert)

### Paso 1: Llego al README

**Lo bueno:** Entiendo qué es el proyecto inmediatamente. El quick start es claro.

**Dudas:**
- "Node.js 22+" — ¿necesito exactamente 22? Tengo 20, ¿funciona? (Probablemente sí pero no lo dice)
- "The backend auto-creates database tables on first run" — ¿cómo configuro la conexión a PG? ¿Qué DB necesito crear? No hay instrucciones entre `npm install` y `npm run dev`.
- Docker Compose dice backend en puerto 4300, pero Quick Start Option 1 dice 4000. ¿Cuál es cuál?

### Paso 2: Setup local (sin Docker)

**Blocker:** Si no uso Docker, necesito PG local. El README no explica:
- Cómo crear la database `drawhaus`
- Que necesito copiar `.env.example` a `.env` (Option 1 no lo menciona, solo Option 2)
- Que `npm run dev` necesita un DATABASE_URL válido o va a crashear

**Lo que intento:**
```bash
npm install
npm run dev   # ← crashea porque no hay DATABASE_URL
```

**Fix necesario:** Option 1 necesita un paso de "Copy .env.example to .env" antes de `npm run dev`.

### Paso 3: Setup con Docker Compose

**Funciona bien.** `cp .env.example .env && docker compose up` levanta todo. Healthchecks hacen que el backend espere a la DB.

**Confusión:** `.env.example` tiene `VITE_API_URL=http://localhost:4000` pero Docker Compose mapea backend a 4300. ¿Debo cambiar esto? (Sí, pero no me lo dice)

### Paso 4: Entiendo la arquitectura

**Preguntas sin respuesta:**
- ¿Qué es "Clean Architecture" en el backend? Veo `application/`, `domain/`, `infrastructure/` pero no entiendo las reglas.
- ¿Dónde agrego un nuevo endpoint? ¿Creo un use case, un repo, una ruta? ¿En qué orden?
- ¿Qué es `asyncRoute`? Lo veo en todos los route handlers.
- El `main.ts` tiene 380 líneas con toda la composición inline. Es difícil de navegar.

### Paso 5: Corro tests

**Confusión:** ¿Cómo corro los tests?
- `npm run test` en root corre backend unit tests
- ¿Los e2e? Tengo que ir a `e2e/` y correr `npx playwright test`? ¿Necesito Playwright instalado?
- README Commands no menciona ningún test command
- CONTRIBUTING.md dice `npm run test:e2e` pero ese script no existe en root package.json

**Blocker:** Si corro `npm run test:e2e` como dice CONTRIBUTING, falla.

### Paso 6: Quiero contribuir

**Dudas:**
- ¿Cómo pruebo que mis cambios no rompen nada? ¿Corro unit tests, e2e, o ambos?
- ¿Hay un lint pre-commit hook? No lo parece.
- ¿Cómo resetteo la DB si la dejo en mal estado?
- ¿Puedo ver los emails que manda el sistema en dev? (Sí, van a console, pero no lo dice claramente)

### Paso 7: Deploy

**Lo bueno:** La sección de deployment es muy detallada y paso a paso.

**Confusión:**
- Kamal — nunca lo usé. ¿Qué es? ¿Necesito instalarlo? No hay link al proyecto de Kamal.
- "Cloudflare Tunnel (optional but recommended)" — el diagrama de arquitectura lo muestra como si fuera obligatorio.
- ¿Puedo deployar con un simple `docker compose up` en producción? No queda claro.

---

## Acciones consolidadas (priorizadas)

### Must-do (antes de v0.8.0 release) — ✅ Completado

| # | Acción | Archivo | Estado |
|---|--------|---------|--------|
| 1 | Agregar v0.8.0 al CHANGELOG | CHANGELOG.md | ✅ |
| 2 | Actualizar README env vars con los nuevos (ENCRYPTION_KEY, REDIS_URL, backup vars) | README.md | ✅ |
| 3 | Actualizar README Commands table con test, db:*, backup commands | README.md | ✅ |
| 4 | Actualizar README API overview con endpoints faltantes | README.md | ✅ |
| 5 | Fix CONTRIBUTING.md — .env va en raíz, no en backend/ | CONTRIBUTING.md | ✅ |
| 6 | Fix CONTRIBUTING.md — `npm run test:e2e` → instrucciones correctas para e2e | CONTRIBUTING.md | ✅ |
| 7 | Agregar paso de copiar .env en Quick Start Option 1 | README.md | ✅ |
| 8 | Marcar v1.0 Gate items como completados en ROADMAP.md | ROADMAP.md | ✅ |
| 9 | Actualizar SECURITY.md versión soportada a 0.8.x | SECURITY.md | ✅ |
| 10 | Crear `.env.production.example` (README lo referencia pero no existe) | .env.production.example | ✅ |

### Should-do (mejora significativa de DX) — ✅ Completado

| # | Acción | Archivo | Estado |
|---|--------|---------|--------|
| 11 | Aclarar mismatch de puertos Docker (4300) vs local (4000) en README | README.md | ✅ |
| 12 | Agregar GitHub issue templates (bug report, feature request) | .github/ISSUE_TEMPLATE/ | ✅ |
| 13 | Agregar GitHub PR template | .github/PULL_REQUEST_TEMPLATE.md | ✅ |
| 14 | Agregar CODE_OF_CONDUCT.md (Contributor Covenant) | CODE_OF_CONDUCT.md | ✅ |
| 15 | Documentar cómo correr e2e tests localmente en README | README.md | ✅ |
| 16 | Agregar `npm run test:e2e` script a root package.json | package.json | ✅ (ya existía) |
| 17 | Agregar sección "Architecture" al README o docs/architecture.md | README.md | ✅ |

### Nice-to-have (polish)

| # | Acción | Archivo | Esfuerzo |
|---|--------|---------|----------|
| 18 | Crear docs/adr/ con decision records del ROADMAP | docs/adr/ | M |
| 19 | Agregar OpenAPI spec para la API | docs/openapi.yml | L |
| 20 | Agregar Makefile como command wrapper | Makefile | S |
| 21 | Agregar link a documentación de Kamal en deploy section | README.md | S |
| 22 | Documentar que emails en dev van a console log | README.md o CONTRIBUTING.md | S |
| 23 | Agregar pre-commit hook (husky + lint-staged) | package.json | S |

---

*Generado: 2026-03-13*
