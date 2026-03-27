# Collaboration Revamp: Smart Edit Lock + Redis Shared State

> Mejorar la experiencia de colaboración reemplazando el lock global frustrante por un sistema de ownership inteligente con turnos fluidos, cola de espera, feedback visual claro y cero pérdida de datos. Además, migrar stores in-memory a Redis para soportar multi-instancia correctamente.

---

## Glosario

| Término | Significado |
|---------|-------------|
| **CRDT** | Conflict-free Replicated Data Type — estructura de datos que permite edición simultánea sin conflictos gracias a propiedades matemáticas de convergencia. Usado por Figma, Excalidraw.com (via Yjs) y tldraw. |
| **OT** | Operational Transformation — algoritmo que transforma operaciones concurrentes para converger al mismo estado. Usado por Google Docs. |
| **SETNX** | SET if Not eXists — comando de Redis que establece un valor solo si la clave no existe. Base del distributed locking. |
| **TTL** | Time To Live — tiempo de expiración automática de un recurso (lock, cache, key). |
| **RBAC** | Role-Based Access Control — control de acceso por roles (owner, editor, viewer). |
| **FIFO** | First In, First Out — orden de cola donde el primero en llegar es el primero en ser atendido. |

---

## Problema

El sistema actual de edición colaborativa tiene dos problemas:

### 1. UX del lock es frustrante

Solo un usuario puede editar a la vez (lock global por diagrama). Cuando otro tiene el lock:
- Aparece un overlay bloqueante con `cursor-not-allowed`
- Un bubble temporal dice "{nombre} está editando" y desaparece en 2 segundos
- No hay countdown, no hay cola de espera, no hay estimación de cuándo podrán editar
- No se puede ni navegar (pan/zoom) mientras se espera
- El timeout de inactividad es de 5 segundos — se siente largo
- El grace period de 3 segundos retrasa aún más la liberación

### 2. Stores in-memory no sobreviven multi-instancia

Varios componentes usan `Map` de JavaScript como store. Con una sola instancia funciona, pero si se escala a 2+ instancias (load balancer, alta disponibilidad), estos stores se dessincronizan:

| Store | Archivo | Problema en multi-instancia |
|-------|---------|----------------------------|
| Edit lock | `infrastructure/socket/edit-lock-store.ts` | Dos usuarios en distintas instancias pueden tener el lock al mismo tiempo |
| Rate limiting HTTP | `infrastructure/http/middleware/rate-limit.ts` | Cada instancia tiene su propio contador — un usuario puede hacer N×instancias requests |
| Rate limiting API | `infrastructure/http/public-api/middleware/api-rate-limit.ts` | Mismo problema |
| Snapshot interval | `infrastructure/socket/handlers/scene.handler.ts` (L10) | Snapshots duplicados cada 10 min |

---

## Contexto: cómo lo hacen otros productos

| Producto | Patrón | Tecnología | Notas |
|----------|--------|-----------|-------|
| **Figma** | Edición concurrente | CRDT propio | Años de ingeniería, equipo dedicado de 10+ personas |
| **Miro** | Lock por objeto + concurrent | CRDT híbrido | No es concurrent puro; usa locks implícitos |
| **Google Docs** | Edición concurrente | OT | Décadas de desarrollo, empezó en ~2010 |
| **Notion** | Lock por bloque | Bloqueo implícito | Cada bloque se edita por un usuario a la vez |
| **Canva** | Lock implícito por objeto | Lock con UX fluida | El usuario no percibe el lock |
| **tldraw** | Edición concurrente | CRDT (Yjs) | Usa librería externa madura |
| **Excalidraw.com** | Edición concurrente | CRDT (Yjs) | Migró de merge simple a Yjs |

**Conclusión**: Todos los productos con edición concurrente real en canvas usan CRDTs u OT — tecnologías con garantías matemáticas de convergencia. Ningún producto exitoso usa merge artesanal por versión para concurrent editing en canvas. Los que no usan CRDTs (Notion, Canva) usan alguna forma de lock con buena UX.

### Por qué no concurrent editing ahora

Se evaluó eliminar el lock y hacer edición concurrente con merge por `id` + `version` (similar a excalidraw-room). Razones para no hacerlo:

- **Pérdida silenciosa de datos**: Sin CRDTs, cuando dos usuarios editan el mismo elemento, el último en llegar gana y el otro pierde su cambio sin saber por qué
- **Complejidad**: ~10 días, 14 archivos, merge server-side con transacciones PostgreSQL, validación de deltas, nueva superficie de ataque
- **Deuda técnica**: Todo ese código se descarta cuando se adopten CRDTs
- **Seguridad**: Sin lock, el servidor debe validar cada delta individualmente contra el estado de la escena — requiere cache server-side o queries a DB en cada update (30/s por usuario)

### Roadmap a CRDTs

Cuando Drawhaus necesite 5+ editores simultáneos, la ruta es adoptar **Yjs** como librería — no construir merge artesanal. Yjs ya es usado por Excalidraw.com y tldraw, está probada con millones de usuarios, y resuelve de raíz los problemas de convergencia, offline editing y peer sync.

---

## Solución

### Parte 1: Smart Edit Lock

Mejorar el lock existente para que la experiencia se sienta fluida:

| Aspecto | Antes | Después |
|---------|-------|---------|
| Timeout de inactividad | 5 segundos | 2.5 segundos |
| Grace period | 3 segundos | 1 segundo |
| Cuando otro tiene el lock | Overlay bloqueante, cursor-not-allowed | Badge con countdown, navegación libre |
| Cuando intentas editar | "Denegado" | Te encola y te da el turno automáticamente |
| Bubble de estado | Temporal (2s y desaparece) | Persistente con countdown animado |
| Navegación sin lock | Bloqueada | Libre (pan, zoom, seleccionar) |

### Parte 2: Redis como estado compartido

Migrar stores in-memory a Redis para que funcionen correctamente en multi-instancia. Todos con fallback automático a in-memory si Redis no está disponible.

| Store | Solución Redis |
|-------|---------------|
| Edit lock | `SET roomId:lock userId NX EX 3` + cola con `RPUSH`/`LPOP` |
| Rate limiting HTTP | `rate-limit-redis` como store para `express-rate-limit` |
| Rate limiting API | Mismo — store compartido para API keys |
| Snapshot interval | `SET roomId:lastSnapshot timestamp EX 600` |

---

## Especificación técnica

### Backend: Lock store mejorado

**Archivo**: `apps/backend/src/infrastructure/socket/edit-lock-store.ts`

Cambios:
- `INACTIVITY_TIMEOUT_MS`: 5000 → 2500
- `GRACE_PERIOD_MS`: 3000 → 1000
- Nueva estructura: `queues = new Map<string, string[]>()` — cola FIFO de userIds esperando por roomId
- Nuevo método `enqueue(roomId, userId, socketId)`: agrega usuario a la cola si el lock está tomado
- Nuevo método `dequeue(roomId)`: al liberar lock, asignar al siguiente en la cola automáticamente
- Nuevo método `removeFromQueue(roomId, socketId)`: limpiar al desconectar
- Al liberar (timeout o explícito): si hay cola, ejecutar `dequeue` en vez de dejar libre

**Interfaz a extraer** (para que `RedisLockStore` implemente lo mismo):

```typescript
interface EditLockService {
  tryAcquire(roomId: string, userId: string, userName: string, socketId: string): LockResult;
  release(roomId: string, userId: string): void;
  releaseBySocketId(roomId: string, socketId: string): void;
  touchLock(roomId: string, userId: string): void;
  hasLock(roomId: string, userId: string): boolean;
  getHolder(roomId: string): LockHolder | null;
  getQueuePosition(roomId: string, userId: string): number;  // nuevo
  // callback para notificar cambios de lock al handler
  setOnRelease(cb: (roomId: string, nextHolder: LockHolder | null) => void): void;
  setOnQueueChange(cb: (roomId: string, queue: QueueEntry[]) => void): void;  // nuevo
}

type LockResult =
  | { acquired: true; holder: LockHolder }
  | { acquired: false; queued: true; position: number; holder: LockHolder }
  | { acquired: false; queued: false; holder: LockHolder };
```

### Backend: Lock handler

**Archivo**: `apps/backend/src/infrastructure/socket/handlers/lock.handler.ts`

Cambios al handler `request-edit-lock`:
- Si el lock está libre → adquirir y emitir `edit-lock-acquired` (sin cambios)
- Si el lock está tomado → encolar y emitir **nuevo evento** `edit-lock-queued`:
  ```typescript
  socket.emit("edit-lock-queued", {
    roomId,
    position: queuePosition,
    holder: { userId, userName }
  });
  ```
- Cuando el lock se auto-asigna desde la cola, emitir `edit-lock-acquired` al nuevo holder y `edit-lock-status` a toda la sala

Cambios al handler `disconnecting` (en `room.handler.ts`):
- Remover el socket de la cola si estaba esperando
- Si el socket era el holder, liberar y asignar al siguiente

### Backend: Redis lock store

**Archivo nuevo**: `apps/backend/src/infrastructure/socket/redis-lock-store.ts`

Implementa la misma interfaz `EditLockService` usando Redis:

| Operación | Comando Redis |
|-----------|---------------|
| Adquirir lock | `SET roomId:lock JSON(holder) NX EX 3` |
| Touch (renovar) | `EXPIRE roomId:lock 3` |
| Liberar | `DEL roomId:lock` |
| Verificar | `GET roomId:lock` |
| Encolar | `RPUSH roomId:queue JSON(entry)` |
| Siguiente en cola | `LPOP roomId:queue` |
| Remover de cola | `LREM roomId:queue 0 JSON(entry)` |
| Limpiar cola vacía | TTL en la key de queue |

Fallback: si la conexión Redis falla, caer a `EditLockStore` in-memory y loguear warning.

### Backend: Rate limiting con Redis

**Archivos**:
- `apps/backend/src/infrastructure/http/middleware/rate-limit.ts`
- `apps/backend/src/infrastructure/http/public-api/middleware/api-rate-limit.ts`

Cambios:
- Instalar dependencia `rate-limit-redis`
- Si `REDIS_URL` existe, crear `RedisStore` de `rate-limit-redis` usando la instancia compartida de `ioredis`
- Si no, usar el store in-memory por defecto (comportamiento actual)
- Aplicar a los 3 limiters: `authLimiter`, `generalLimiter`, `apiKeyRateLimiter`

### Backend: Snapshot dedup con Redis

**Archivo**: `apps/backend/src/infrastructure/socket/handlers/scene.handler.ts`

Cambios al bloque de snapshot interval (L69-86):
- Si Redis disponible: `SET roomId:lastSnapshot 1 NX EX 600` — si la key ya existe, skip snapshot
- Si no: mantener `lastIntervalSnapshot` Map local (comportamiento actual)

### Backend: Instancia Redis compartida

**Archivo**: `apps/backend/src/infrastructure/socket/index.ts`

- Crear una instancia `ioredis` compartida al iniciar si `REDIS_URL` existe
- Pasar a: `RedisLockStore`, rate limit stores, snapshot tracker
- Reusar la misma conexión (no crear múltiples clientes Redis)

### Frontend: Hook useEditLock

**Archivo**: `apps/frontend/src/lib/hooks/collaboration/useEditLock.ts`

Nuevos estados:
```typescript
const [queuePosition, setQueuePosition] = useState<number | null>(null);
const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
```

Nuevos listeners:
- `edit-lock-queued`: actualizar `queuePosition`
- `edit-lock-acquired`: si es para mí, resetear queue; iniciar countdown timer
- `edit-lock-status`: actualizar holder + recalcular countdown

Countdown local:
- Cuando otro tiene el lock, iniciar un interval de 100ms que decrementa `timeRemaining` basado en el timeout conocido (2.5s)
- Es cosmético — la liberación real la decide el servidor

Retorno actualizado:
```typescript
return {
  editLockHolder: lockHolder,
  hasEditLock,
  queuePosition,       // null si no está en cola
  timeRemaining,       // segundos restantes estimados (cosmético)
  tryAcquireEditLock,
};
```

### Frontend: CollaborationBadge (reemplaza EditLockOverlay)

**Archivo**: `apps/frontend/src/components/CollaborationBadge.tsx` (nuevo, reemplaza `EditLockOverlay.tsx`)

Estados visuales:

| Estado | Badge | Color | Texto |
|--------|-------|-------|-------|
| Lock mío | Dot + texto | Verde | "Editando" |
| Lock de otro | Dot + texto + countdown | Ámbar | "{nombre} editando — {N}s" |
| Encolado | Dot + texto | Ámbar | "Siguiente en editar #{N}" |
| Nadie editando | Dot + texto | Gris | "Click para editar" |

NO mostrar:
- Overlay fullscreen con `cursor-not-allowed`
- Bubble que desaparece en 2 segundos

### Frontend: BoardEditor

**Archivo**: `apps/frontend/src/components/BoardEditor.tsx`

Cambios:
- Cuando no tengo el lock: pasar `viewModeEnabled={true}` a Excalidraw (permite pan, zoom, seleccionar, pero no mutar)
- `handleCanvasPointerDown`: si no tengo lock y no estoy encolado, emitir `request-edit-lock` automáticamente (el servidor decide si adquirir o encolar)
- Eliminar el overlay de `cursor-not-allowed`
- Reemplazar `<EditLockOverlay>` por `<CollaborationBadge>`

---

## Socket events

### Existentes (modificados)

| Evento | Dirección | Cambio |
|--------|-----------|--------|
| `request-edit-lock` | client → server | Si lock tomado: encolar en vez de denegar |
| `edit-lock-acquired` | server → client | Sin cambios en payload |
| `edit-lock-status` | server → clients | Sin cambios en payload |
| `edit-lock-denied` | server → client | **Deprecated** — reemplazado por `edit-lock-queued` |

### Nuevos

| Evento | Dirección | Payload |
|--------|-----------|---------|
| `edit-lock-queued` | server → client | `{ roomId, position: number, holder: { userId, userName } }` |

---

## Dependencias nuevas

| Paquete | Workspace | Propósito |
|---------|-----------|-----------|
| `rate-limit-redis` | backend | Store de Redis para `express-rate-limit` |

Dependencias ya instaladas que se reutilizan:
- `ioredis` (ya en backend)
- `@socket.io/redis-adapter` (ya en backend)

---

## Escenarios

### Flujo normal
1. **A abre diagrama solo** → auto-acquire, edita libremente
2. **B llega mientras A edita** → B ve badge "A editando — 2s...", puede navegar (pan/zoom/seleccionar)
3. **A deja de editar 2.5s** → lock se libera, B recibe auto-assign desde cola
4. **A y B alternan** → turnos fluidos de 2-3s, feedback claro en todo momento

### Cola de espera
5. **A edita, B y C intentan editar** → B posición #1, C posición #2. A libera → B edita → B libera → C edita
6. **B se desconecta mientras espera** → se remueve de la cola, C sube a #1

### Edge cases
7. **A cierra browser sin liberar** → timeout de 2.5s libera, siguiente en cola recibe
8. **Multi-tab del mismo usuario** → cada tab es un socket independiente; Tab1 tiene lock, Tab2 espera en cola
9. **Multi-instancia con Redis** → lock compartido en Redis, cola es consistente entre instancias
10. **Redis no disponible** → fallback a lock in-memory (comportamiento actual)
11. **Redis se cae mid-operación** → fallback automático a in-memory, sin downtime
12. **Snapshot restore mientras B edita** → `scene-from-db` reemplaza elementos de todos (destructivo por diseño)
13. **Viewer intenta editar** → `canEdit()` bloquea antes de llegar al lock

### Redis como estado compartido
14. **Rate limit multi-instancia** → usuario hace 3 requests a instancia A + 3 a instancia B = 6 total → Redis lo cuenta como 6, no como 3+3
15. **Snapshot dedup multi-instancia** → instancia A crea snapshot → instancia B lo sabe via Redis → no duplica

---

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `apps/backend/src/infrastructure/socket/edit-lock-store.ts` | Extraer interfaz, reducir timeouts, agregar cola |
| `apps/backend/src/infrastructure/socket/handlers/lock.handler.ts` | Encolar en vez de denegar, nuevo evento `edit-lock-queued` |
| `apps/backend/src/infrastructure/socket/handlers/room.handler.ts` | Limpiar cola al desconectar |
| `apps/backend/src/infrastructure/socket/helpers.ts` | Helper para broadcast de cola |
| `apps/backend/src/infrastructure/socket/redis-lock-store.ts` | **Nuevo**: lock + cola distribuido con Redis |
| `apps/backend/src/infrastructure/socket/index.ts` | Instancia Redis compartida, selección de lock store |
| `apps/backend/src/infrastructure/http/middleware/rate-limit.ts` | Store de Redis para rate limiting |
| `apps/backend/src/infrastructure/http/public-api/middleware/api-rate-limit.ts` | Store de Redis para API rate limiting |
| `apps/backend/src/infrastructure/socket/handlers/scene.handler.ts` | Snapshot interval via Redis |
| `apps/frontend/src/lib/hooks/collaboration/useEditLock.ts` | Queue state, countdown |
| `apps/frontend/src/components/CollaborationBadge.tsx` | **Nuevo**: reemplaza `EditLockOverlay.tsx` |
| `apps/frontend/src/components/BoardEditor.tsx` | viewModeEnabled, auto-request, eliminar cursor-not-allowed |
| `apps/frontend/src/components/EditLockOverlay.tsx` | **Eliminar** |

---

## Riesgos y mitigación

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|-----------|
| Lock thrashing con timeout de 2.5s | Media | Medio | Monitorear, ajustar a 3s si ocurre. El grace period de 1s da buffer |
| Cola larga (5+ usuarios esperando) | Baja | Medio | Señal de migrar a CRDTs. Con equipos de 2-4, no debería ocurrir |
| Redis lock se desincroniza | Baja | Bajo | TTL auto-expira keys huérfanas |
| Redis se cae | Baja | Bajo | Todos los stores caen a fallback in-memory automáticamente |
| UX de "esperar" percibida como limitación | Media | Bajo | Feedback claro + turnos cortos (2.5s) minimiza percepción |

---

## Verificación

### Lock mejorado
1. `npm test --workspace=backend` — tests de EditLockStore con cola (enqueue, dequeue, cleanup)
2. `npm run typecheck` — sin errores en ambos workspaces
3. **Test cola**: A edita, B intenta → B ve countdown → A para → B edita automáticamente
4. **Test multi-cola**: A edita, B y C intentan → orden FIFO respetado
5. **Test desconexión**: A tiene lock y se desconecta → timeout libera, B (en cola) recibe
6. **Test navegación**: Sin lock, usuario puede hacer pan/zoom/seleccionar pero no mover elementos
7. **Test viewer**: Viewer no puede solicitar lock

### Redis
8. **Test Redis lock**: Con `REDIS_URL`, lock funciona entre 2 instancias de backend
9. **Test Redis rate limit**: Con 2 instancias, rate limit cuenta requests globalmente
10. **Test Redis snapshot**: Con 2 instancias, snapshot interval no genera duplicados
11. **Test fallback**: Sin `REDIS_URL`, todo funciona in-memory (como antes)
12. **Test Redis down**: Si Redis se cae, fallback automático sin errores visibles

---

## Diferido a futuro

| Feature | Cuándo | Razón |
|---------|--------|-------|
| Edición concurrente real | Cuando se necesiten 5+ editores simultáneos | Adoptar Yjs (CRDT) como librería probada |
| Indicador per-element "editando por X" | Junto con CRDTs | Requiere API no nativa de Excalidraw |
| Delta updates (solo enviar cambios) | Como optimización de bandwidth | No necesario con 1 escritor a la vez |
| Multi-tab detection (BroadcastChannel) | Nice-to-have | Multi-tab funciona como peers en cola |

---

## ADRs

### ADR-020: Smart Lock con cola sobre edición concurrente artesanal

**Status:** proposed
**Date:** 2026-03-27
**Supersedes:** ADR-006 (Single-Editor Lock over CRDT)

#### Context

ADR-006 estableció el modelo single-editor lock. La experiencia resultante es funcional pero frustrante: overlay bloqueante, sin countdown, sin cola, timeout de 5 segundos que se siente largo.

Se evaluó migrar a edición concurrente eliminando el lock (delta updates + merge server-side con `SELECT ... FOR UPDATE`). Un panel de 6 expertos evaluó ambas opciones con consenso unánime: mejorar el lock, no eliminarlo.

#### Decision

Mejorar el lock existente con:
- Timeout reducido (5s → 2.5s) y grace period reducido (3s → 1s)
- Cola de espera FIFO server-side con auto-assign
- Badge persistente con countdown en vez de overlay bloqueante
- Navegación libre (pan/zoom/seleccionar) sin lock via `viewModeEnabled`

No implementar edición concurrente artesanal. Cuando se necesite (5+ editores), adoptar Yjs (CRDT) como librería.

#### Alternatives Considered

- **Edición concurrente con merge artesanal** — rechazada: ~10 días, 14 archivos, riesgo de pérdida silenciosa de datos. Todos los productos con concurrent editing real en canvas usan CRDTs u OT con garantías matemáticas. Un merge por `id` + `version` no tiene esas garantías. El código se descarta al adoptar CRDTs.
- **Per-element locking** — rechazada: Excalidraw no tiene evento "element-selected" nativo. Operaciones como agrupar o alinear afectan múltiples elementos. La complejidad de miles de locks con heartbeats no se justifica.
- **Mantener lock actual sin cambios** — rechazada: el feedback pobre es la queja principal.

#### Consequences

- La espera máxima pasa de 5s a 2.5s
- Usuarios encolados reciben turno automático (cero frustración de "no puedo editar")
- Navegación libre mientras se espera
- El modelo sigue siendo 1 escritor a la vez — sin riesgo de conflictos o pérdida de datos
- Se preserva la ruta limpia a CRDTs sin deuda técnica de merge artesanal

---

### ADR-021: Redis como estado compartido para multi-instancia

**Status:** proposed
**Date:** 2026-03-27

#### Context

El backend tiene varios stores in-memory (`Map` de JavaScript) que funcionan en single-instance pero se dessincronizan en multi-instancia:
- Edit lock: dos usuarios pueden tener el lock simultáneamente
- Rate limiting: contadores per-proceso permiten bypass multiplicando instancias
- Snapshot interval: snapshots duplicados

Redis ya está configurado en Docker y `ioredis` ya está instalado (usado para Socket.IO adapter), pero no se usa para estos stores.

#### Decision

Migrar edit lock, rate limiting HTTP/API, y snapshot interval tracking a Redis cuando `REDIS_URL` está disponible. Mantener fallback automático a in-memory si Redis no está disponible.

- Lock: `SET NX EX` + `RPUSH`/`LPOP` para cola
- Rate limiting: `rate-limit-redis` como store para `express-rate-limit`
- Snapshot interval: simple key con TTL de 10 minutos
- Instancia `ioredis` compartida para minimizar conexiones

#### Alternatives Considered

- **PostgreSQL para locks** — rechazada: agrega latencia de query al path de lock (que debe ser <1ms). Redis es in-memory y sub-millisecond.
- **Redis obligatorio** — rechazada: muchos deployments son single-instance. El fallback a in-memory preserva la simplicidad de setup.
- **Stores distribuidos custom** — rechazada: reinventar lo que Redis ya resuelve.

#### Consequences

- Multi-instancia funciona correctamente out-of-the-box con `REDIS_URL`
- Single-instance sigue funcionando sin Redis (zero config change)
- Una sola dependencia adicional: `rate-limit-redis`
- La instancia `ioredis` compartida mantiene el connection count bajo
