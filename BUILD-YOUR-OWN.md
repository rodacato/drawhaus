# Drawhaus 🎨

> **Tu propio Excalidraw+, self-hosted, sin vendor lock-in.**
> Whiteboard colaborativo con dashboard, auth, y AI — corriendo en tu Hetzner por €4/mes.

**Repo:** `drawhaus`
**Subdominio sugerido:** `draw.tudominio.com` (collab en `collab.tudominio.com`)
**Descripción GitHub:** *Self-hosted collaborative whiteboard built on @excalidraw/excalidraw. Your drawings, your server, your rules.*

---

## Decisión de Dirección (Actualizado 2026-03-06)

**Drawhaus se construye desde cero.**  
El repo oficial [`excalidraw/excalidraw`](https://github.com/excalidraw/excalidraw) se usa **solo como referencia** de producto, UX y contratos técnicos.

### Qué significa en práctica
- No fork del repo oficial como base de app.
- No copiar bloques grandes de código de `excalidraw-app`.
- Sí usar el paquete `@excalidraw/excalidraw` como motor del editor.
- Sí comparar decisiones puntuales con la implementación oficial cuando haya dudas.

### Reglas para mantener este enfoque
- Primero una vertical funcional mínima (auth + dashboard + board + save).
- Complejidad de colaboración solo después de validar el MVP single-user.
- Cada feature debe tener criterio de aceptación y rollback simple.

---

## Stack

```
Next.js 14        →  Frontend (editor + dashboard + auth UI)
Express.js        →  API REST + WebSocket (Socket.IO)
PostgreSQL        →  Base de datos principal
filesystem/disco  →  Archivos binarios (imágenes en diagramas)
Caddy             →  Reverse proxy + SSL automático
Docker Compose    →  Todo junto en Hetzner
```

### ¿Por qué este stack?

| Decisión | Por qué |
|---|---|
| **Next.js** en vez de Vite SPA | Practicas App Router + React Server Components. El editor usa `"use client"` igual que una SPA. |
| **Express** en vez de Hono | Lo pediste explícitamente para practicar. Hono es más rápido pero Express tiene más ejemplos y comunidad. |
| **PostgreSQL** en vez de SQLite | Con 4 GB RAM tienes margen de sobra (~80 MB extra). Te da SQL completo, `JSONB`, y es lo que usarás en proyectos reales. |
| **Filesystem** para archivos | Sin MinIO extra. Los uploads van a `/data/files/` en el servidor. Simple para empezar. |
| **Sin Firebase** | Reemplazado por Express + PostgreSQL. Cero vendor lock-in. |
| **Sin cifrado E2E** | Tus datos, tu servidor, equipo de confianza. Simplifica todo — puedes hacer thumbnails, búsqueda, AI server-side. |

### ¿SQLite o PostgreSQL? Ambos son viables

| | SQLite | PostgreSQL |
|---|---|---|
| RAM extra | 0 MB (embebido en Express) | ~80 MB |
| Complejidad | Mínima, un archivo | Un servicio más en Docker |
| Practicar SQL | Básico | Completo (JSONB, joins, índices) |
| Producción | Suficiente para 2-10 usuarios | Mejor si crece |
| **Recomendación** | Si quieres lo más simple | **Si quieres practicar y tener margen** |

Con tu Hetzner de 4 GB, PostgreSQL cabe sin problema. Úsalo.

---

## Recursos en Hetzner CX22 (2 vCPU, 4 GB RAM)

| Servicio | RAM runtime |
|---|---|
| OS (Ubuntu) | ~200 MB |
| Docker daemon | ~150 MB |
| Next.js (Node.js) | ~150-200 MB |
| Express + Socket.IO | ~80-100 MB |
| PostgreSQL | ~80-120 MB |
| Caddy | ~20 MB |
| **Total** | **~680-790 MB** |
| **Disponible** | **~3.2 GB libres** |

> El build (`next build`) consume ~1.5 GB de RAM durante ~2 min. **Buildea en GitHub Actions o en tu máquina local**, no en el servidor.

---

## Estructura del Proyecto

```
drawhaus/
├── frontend/                    # Next.js 14 (App Router)
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── (app)/
│   │   │   ├── layout.tsx       # verifica sesión
│   │   │   ├── page.tsx         # dashboard: lista de diagramas
│   │   │   ├── board/
│   │   │   │   └── [id]/page.tsx  # editor
│   │   │   └── settings/page.tsx
│   │   └── share/
│   │       └── [linkId]/page.tsx  # vista pública (read-only)
│   ├── components/
│   │   ├── Editor.tsx           # wrapper de <Excalidraw> — "use client"
│   │   ├── DiagramCard.tsx      # tarjeta en el dashboard
│   │   └── CollabIndicator.tsx  # avatares de usuarios en el board
│   ├── lib/
│   │   ├── api.ts               # fetch helpers hacia Express
│   │   └── auth.ts              # session helpers (cookies)
│   └── middleware.ts            # proteger rutas (auth check)
│
├── backend/                     # Express.js
│   ├── src/
│   │   ├── index.ts             # entry: http server + socket.io
│   │   ├── routes/
│   │   │   ├── auth.ts          # POST /login, /register, /logout
│   │   │   ├── diagrams.ts      # CRUD /api/diagrams
│   │   │   ├── files.ts         # POST/GET /api/files
│   │   │   └── share.ts         # POST/GET /api/share
│   │   ├── collab/
│   │   │   └── socket.ts        # Socket.IO server
│   │   ├── db/
│   │   │   ├── index.ts         # pg pool connection
│   │   │   ├── schema.sql       # definición de tablas
│   │   │   └── migrations/      # scripts de migración
│   │   └── middleware/
│   │       ├── auth.ts          # verificar sesión en cada request
│   │       └── upload.ts        # multer para archivos
│   └── Dockerfile
│
├── docker-compose.yml           # dev
├── docker-compose.prod.yml      # producción
└── Caddyfile                    # reverse proxy + SSL
```

---

## Base de Datos (PostgreSQL)

```sql
-- schema.sql

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Usuarios
CREATE TABLE users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT UNIQUE NOT NULL,
  name       TEXT NOT NULL,
  password   TEXT NOT NULL,        -- bcrypt hash
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Diagramas
CREATE TABLE diagrams (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  title        TEXT NOT NULL DEFAULT 'Sin título',
  elements     JSONB NOT NULL DEFAULT '[]',
  app_state    JSONB NOT NULL DEFAULT '{}',
  thumbnail    TEXT,               -- path en filesystem: /data/thumbs/{id}.png
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

-- Invitados con acceso al diagrama
CREATE TABLE diagram_members (
  diagram_id UUID REFERENCES diagrams(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'editor',  -- 'editor' | 'viewer'
  added_at   TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (diagram_id, user_id)
);

-- Archivos binarios (imágenes embebidas)
CREATE TABLE diagram_files (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diagram_id  UUID REFERENCES diagrams(id) ON DELETE CASCADE,
  file_id     TEXT NOT NULL,       -- el FileId que usa Excalidraw internamente
  mime_type   TEXT NOT NULL,
  path        TEXT NOT NULL,       -- /data/files/{uuid}.{ext}
  size_bytes  INTEGER,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(diagram_id, file_id)
);

-- Links para compartir (snapshot read-only)
CREATE TABLE share_links (
  id          TEXT PRIMARY KEY,    -- nanoid corto, ej: "xK9mP2"
  diagram_id  UUID REFERENCES diagrams(id) ON DELETE CASCADE,
  created_by  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ DEFAULT now(),
  expires_at  TIMESTAMPTZ          -- NULL = no expira
);

-- Sesiones de usuario
CREATE TABLE sessions (
  id         TEXT PRIMARY KEY,     -- token random
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- Índices útiles
CREATE INDEX ON diagrams(owner_id);
CREATE INDEX ON diagrams(updated_at DESC);
CREATE INDEX ON diagram_members(user_id);
```

---

## API Endpoints (Express)

```
Auth:
  POST  /api/auth/register        { email, name, password }
  POST  /api/auth/login           { email, password } → set cookie session
  POST  /api/auth/logout          → clear cookie
  GET   /api/auth/me              → { id, email, name }

Diagramas:
  GET   /api/diagrams             → lista de mis diagramas + compartidos conmigo
  POST  /api/diagrams             { title? } → crea diagrama vacío
  GET   /api/diagrams/:id         → { id, title, elements, appState, files[] }
  PATCH /api/diagrams/:id         { title?, elements?, appState? }
  DELETE /api/diagrams/:id
  POST  /api/diagrams/:id/invite  { email, role } → invitar usuario
  DELETE /api/diagrams/:id/members/:userId

Archivos:
  POST  /api/files/:diagramId     multipart/form-data → { fileId, url }
  GET   /api/files/:diagramId/:fileId → binary stream

Share:
  POST  /api/share/:diagramId     { expiresIn? } → { linkId, url }
  GET   /api/share/:linkId        → { elements, appState, files[] }

Collab:
  WS    /                         Socket.IO — ver protocolo abajo
```

---

## Protocolo WebSocket (Socket.IO)

El cliente (Excalidraw) habla este protocolo. Tu Express lo implementa:

```typescript
// backend/src/collab/socket.ts
import { Server } from "socket.io";
import type { Server as HttpServer } from "http";
import { pool } from "../db";

export function setupCollab(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: { origin: process.env.FRONTEND_URL, credentials: true },
    transports: ["websocket", "polling"],
  });

  io.on("connection", (socket) => {

    socket.on("join-room", async (roomId: string) => {
      socket.join(roomId);
      const clients = io.sockets.adapter.rooms.get(roomId);
      const isFirst = clients?.size === 1;

      if (isFirst) {
        socket.emit("first-in-room");
        // Cargar escena guardada y enviarla
        const { rows } = await pool.query(
          "SELECT elements, app_state FROM diagrams WHERE id = $1",
          [roomId]
        );
        if (rows[0]) {
          socket.emit("scene-from-db", {
            elements: rows[0].elements,
            appState: rows[0].app_state,
          });
        }
      } else {
        socket.broadcast.to(roomId).emit("new-user", socket.id);
      }

      io.in(roomId).emit("room-user-change", Array.from(clients || []));
    });

    // Relay confiable (scene updates, element changes)
    socket.on("server-broadcast", (roomId: string, data: ArrayBuffer, iv: Uint8Array) => {
      socket.broadcast.to(roomId).emit("client-broadcast", data, iv);
    });

    // Relay volátil (cursores, idle — se pueden perder)
    socket.on("server-volatile-broadcast", (roomId: string, data: ArrayBuffer, iv: Uint8Array) => {
      socket.volatile.broadcast.to(roomId).emit("client-broadcast", data, iv);
    });

    // Seguir a otro usuario en el canvas
    socket.on("user-follow", ({ socketId, action }: { socketId: string; action: "FOLLOW" | "UNFOLLOW" }) => {
      const followRoom = `follow@${socketId}`;
      action === "FOLLOW" ? socket.join(followRoom) : socket.leave(followRoom);
      const followers = Array.from(io.sockets.adapter.rooms.get(followRoom) || []);
      io.to(socketId).emit("user-follow-room-change", followers);
    });

    // Auto-save al desconectar
    socket.on("disconnecting", async () => {
      for (const roomId of socket.rooms) {
        if (roomId === socket.id) continue;
        const remaining = Array.from(
          io.sockets.adapter.rooms.get(roomId) || []
        ).filter((id) => id !== socket.id);
        io.in(roomId).emit("room-user-change", remaining);
      }
    });

    // Guardar escena explícitamente (llamado periódicamente desde el cliente)
    socket.on("save-scene", async ({ roomId, elements, appState }: {
      roomId: string;
      elements: unknown[];
      appState: Record<string, unknown>;
    }) => {
      await pool.query(
        "UPDATE diagrams SET elements=$1, app_state=$2, updated_at=now() WHERE id=$3",
        [JSON.stringify(elements), JSON.stringify(appState), roomId]
      );
    });
  });

  return io;
}
```

---

## Editor Component (Next.js)

```tsx
// frontend/components/Editor.tsx
"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { io, type Socket } from "socket.io-client";

// Excalidraw no puede ejecutarse en el servidor — siempre "use client" + dynamic
const Excalidraw = dynamic(
  () => import("@excalidraw/excalidraw").then((m) => m.Excalidraw),
  { ssr: false }
);

interface EditorProps {
  diagramId: string;
  initialData: { elements: unknown[]; appState: Record<string, unknown> };
  readOnly?: boolean;
}

export default function Editor({ diagramId, initialData, readOnly = false }: EditorProps) {
  const [api, setApi] = useState<ExcalidrawImperativeAPI | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // Auto-save con debounce — no bombardea el backend en cada trazo
  const save = useDebouncedCallback(async () => {
    if (!api || readOnly) return;
    await fetch(`/api/diagrams/${diagramId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        elements: api.getSceneElements(),
        appState: {
          viewBackgroundColor: api.getAppState().viewBackgroundColor,
          gridSize: api.getAppState().gridSize,
        },
      }),
    });
  }, 2000);

  // Conectar Socket.IO para colaboración
  useEffect(() => {
    if (readOnly) return;
    const socket = io(process.env.NEXT_PUBLIC_WS_URL!, { withCredentials: true });
    socketRef.current = socket;

    socket.emit("join-room", diagramId);

    // Cuando el servidor envía la escena guardada (primer usuario en la sala)
    socket.on("scene-from-db", ({ elements, appState }) => {
      api?.updateScene({ elements, appState });
    });

    return () => { socket.disconnect(); };
  }, [diagramId, api, readOnly]);

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <Excalidraw
        excalidrawAPI={setApi}
        initialData={initialData}
        viewModeEnabled={readOnly}
        onChange={() => save()}
      />
    </div>
  );
}
```

---

## Docker Compose

### Desarrollo

```yaml
# docker-compose.yml
services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    ports: ["3000:3000"]
    volumes:
      - ./frontend:/app
      - /app/node_modules
      - /app/.next
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:4000
      NEXT_PUBLIC_WS_URL: http://localhost:4000
    depends_on: [backend]

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
    ports: ["4000:4000"]
    volumes:
      - ./backend:/app
      - /app/node_modules
      - ./data:/data        # archivos subidos
    environment:
      DATABASE_URL: postgres://drawhaus:drawhaus@db:5432/drawhaus
      FILES_PATH: /data/files
      FRONTEND_URL: http://localhost:3000
      SESSION_SECRET: dev-secret-change-in-prod
    depends_on: [db]

  db:
    image: postgres:16-alpine
    ports: ["5432:5432"]
    environment:
      POSTGRES_DB: drawhaus
      POSTGRES_USER: drawhaus
      POSTGRES_PASSWORD: drawhaus
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./backend/src/db/schema.sql:/docker-entrypoint-initdb.d/schema.sql

volumes:
  pgdata:
```

### Producción (Hetzner)

```yaml
# docker-compose.prod.yml
services:
  frontend:
    image: ghcr.io/tu-usuario/drawhaus-frontend:latest
    restart: unless-stopped
    environment:
      NEXT_PUBLIC_API_URL: https://draw.tudominio.com
      NEXT_PUBLIC_WS_URL: https://collab.tudominio.com

  backend:
    image: ghcr.io/tu-usuario/drawhaus-backend:latest
    restart: unless-stopped
    volumes:
      - ./data:/data
    environment:
      DATABASE_URL: postgres://drawhaus:CAMBIA_ESTO@db:5432/drawhaus
      FILES_PATH: /data/files
      FRONTEND_URL: https://draw.tudominio.com
      SESSION_SECRET: CAMBIA_ESTO_POR_ALGO_SEGURO
    depends_on: [db]

  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: drawhaus
      POSTGRES_USER: drawhaus
      POSTGRES_PASSWORD: CAMBIA_ESTO
    volumes:
      - pgdata:/var/lib/postgresql/data

  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports: ["80:80", "443:443"]
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data

volumes:
  pgdata:
  caddy_data:
```

```
# Caddyfile
draw.tudominio.com {
    reverse_proxy frontend:3000
}

collab.tudominio.com {
    reverse_proxy backend:4000
}
```

---

## Deploy en Hetzner (paso a paso)

```bash
# 1. En tu servidor Hetzner (Ubuntu 24.04)
curl -fsSL https://get.docker.com | sh
apt install docker-compose-plugin -y

# 2. Agregar swap para builds (por si buildeas en el servidor)
fallocate -l 2G /swapfile
chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# 3. Clonar y levantar
git clone https://github.com/tu-usuario/drawhaus.git
cd drawhaus
mkdir -p data/files data/thumbs

# 4. Configurar variables de entorno
cp .env.example .env.prod
nano .env.prod  # editar passwords, secrets, dominio

# 5. Levantar
docker compose -f docker-compose.prod.yml up -d

# 6. Verificar
docker compose -f docker-compose.prod.yml ps
curl https://draw.tudominio.com
```

> **Recomendado**: buildear las imágenes Docker en GitHub Actions y hacer `docker pull` en el servidor. Evita el pico de RAM del build en producción.

---

## Variables de Entorno

### Backend (Express)
```bash
DATABASE_URL=postgres://drawhaus:password@db:5432/drawhaus
SESSION_SECRET=string-random-de-64-chars
FILES_PATH=/data/files
FRONTEND_URL=https://draw.tudominio.com
PORT=4000
```

### Frontend (Next.js)
```bash
NEXT_PUBLIC_API_URL=https://draw.tudominio.com
NEXT_PUBLIC_WS_URL=https://collab.tudominio.com
```

---

## Plan de Implementación

### Fase 1 — MVP funcional (P0)
| Tarea | Aprenderás |
|---|---|
| Setup monorepo + Docker Compose | Docker, Node workspaces |
| Auth con Express + bcrypt + cookies | Sessions, middleware, seguridad |
| CRUD diagramas (Express + PostgreSQL) | Express routes, `pg`, JSONB |
| Editor page en Next.js + auto-save | `"use client"`, dynamic import, debounce |
| Dashboard: lista de diagramas | Server Components, fetch server-side |

**Meta P0:** uso personal estable (tú + 1 usuario de prueba), sin foco en escala.

### Fase 2 — Colaboración (P1)
| Tarea | Aprenderás |
|---|---|
| Socket.IO en Express | WebSockets, rooms, events |
| Conectar Excalidraw al WS | Imperative API, useEffect, socket client |
| Invitar usuarios a un diagrama | Permisos, middleware de autorización |
| Share links (read-only) | Snapshots, rutas públicas |

**Regla P1:** no abrir features extra hasta tener permisos y guardado consistentes.

### Fase 3 — Features extra (P2)
| Tarea | Aprenderás |
|---|---|
| Upload de imágenes (multer) | multipart, filesystem, streaming |
| Deploy a Hetzner con Caddy | Docker en producción, SSL, DNS |
| GitHub Actions CI/CD | Build automático, push a registry |

---

## Guardrails de Diseño (Panel de Expertos)

### 1) Política única de guardado
- **P0:** solo REST con debounce (`PATCH /api/diagrams/:id`) como fuente de verdad.
- **P1:** colaboración por socket, pero persistencia sigue siendo explícita (`save-scene`) con una estrategia consistente.
- Evitar mezclar dos caminos de escritura sin regla clara.

### 2) Matriz de permisos obligatoria
- `owner`: CRUD completo + invitaciones + borrar miembros + generar links.
- `editor`: leer + editar contenido, sin administrar miembros.
- `viewer`: solo lectura.
- Aplicar la misma matriz en REST **y** eventos Socket.IO.

### 3) Operación mínima desde MVP
- Backup diario de PostgreSQL.
- Healthcheck de frontend/backend/db.
- Logs estructurados mínimos para depuración.

### 4) Alcance controlado
- Si una tarea no mejora el flujo core (login → crear board → editar → guardar → reabrir), se mueve a P2.

---

## Notas Técnicas Importantes

### Excalidraw + Next.js: siempre dynamic import
```tsx
// ❌ Rompe en build — Excalidraw usa window, canvas, IndexedDB
import { Excalidraw } from "@excalidraw/excalidraw";

// ✅ Correcto
const Excalidraw = dynamic(
  () => import("@excalidraw/excalidraw").then(m => m.Excalidraw),
  { ssr: false }
);
```

### El diagramId ES el roomId de colaboración
Usa el mismo UUID del diagrama como roomId en Socket.IO. Simple y sin mapeo extra.

### Auto-save vs collab-save
- **Solo**: debounce de 2s → `PATCH /api/diagrams/:id`
- **Collab**: el evento `save-scene` del socket guarda periódicamente. El cliente también puede llamar `save-scene` al salir.

### JSONB en PostgreSQL
Los `elements` de Excalidraw se guardan como `JSONB`. PostgreSQL puede indexar y hacer queries dentro del array si lo necesitas en el futuro (búsqueda de texto, etc.).

---

*Drawhaus — generado el 2026-03-02. Stack: Next.js 14 + Express.js + Socket.IO + PostgreSQL.*

**Última actualización:** 2026-03-06 (dirección confirmada: build from scratch, Excalidraw como referencia).
