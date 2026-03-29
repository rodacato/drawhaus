# Drawhaus — Vision

> Your whiteboard, on your server. A personal project built on top of Excalidraw — the best
> open-source drawing tool out there — to learn full-stack development and scratch itches
> that the official product doesn't cover yet.
>
> This document is the project's compass. Every feature decision, every scope debate,
> every "should we build this?" gets filtered through what's written here.

---

## The Pitch

**Drawhaus: Your whiteboard, on your server.**

A self-hosted diagramming platform built on Excalidraw's incredible editor. Born from the need to own my data, learn by building, and explore ideas like diagram-as-code and AI integration that don't exist elsewhere yet. Deploy with `docker compose up`.

---

## The Problem

Excalidraw is, hands down, the best diagramming tool I've ever used. The editor is brilliant — intuitive, fast, and beautifully designed. The team behind it deserves enormous credit for open-sourcing it and building something that millions of people love.

But I kept hitting the same walls:

- **I want to own my data.** Excalidraw+ is great, but I'd rather run it on my server. Not because their service is bad — self-hosting is how I prefer to work.
- **I don't draw diagrams by hand anymore.** I describe them in code (Mermaid, PlantUML) or in natural language to an AI assistant. Most tools render code diagrams as static images. I want **editable elements**.
- **No programmatic access.** I can't create a diagram from a CI pipeline, a CLI, or an AI agent. The only entry point is a human with a mouse.
- **No infrastructure layer in the OSS version.** User accounts, workspaces, roles, sharing, version history, templates — these exist in Excalidraw+ as a service, but not self-hosted.

| What I wanted | What exists today |
|---|---|
| Diagrams from PlantUML/Mermaid as **editable** elements | Most tools render static images |
| AI agents creating diagrams via MCP | No diagramming tool has this |
| A REST API to manage diagrams programmatically | Not available in Excalidraw OSS |
| Workspaces, roles, and sharing on a self-hosted instance | Excalidraw+ offers this as a service, not self-hosted |

**None of this diminishes what Excalidraw is.** They built the engine. Drawhaus is a personal shell around that engine, exploring what's possible when you add infrastructure, programmatic access, and AI on top.

---

## The Insight

Excalidraw's editor is world-class and open-source — there's no reason to rebuild it. What I found myself wanting was **everything around the editor**: persistence, user management, workspaces, sharing, version history, templates, and API access.

And increasingly, I don't draw diagrams by hand at all. I describe them in code or in natural language to an AI assistant. The tool I wanted isn't just an editor — it's a **platform where code, AI, and humans all produce and collaborate on visual artifacts**.

---

## The Philosophy

Principles that guide every decision. If nobody would disagree, it's not a principle.

**1. Self-host is the product, not a deployment option.**
Every feature must work with `docker compose up`. Optional integrations (Google Drive, Resend, Honeybadger) are additive — the core works without them. If a feature requires a managed service, it doesn't ship.

**2. Excalidraw is the editor. Period.**
The editor is world-class — there's nothing to improve, and no reason to try. Drawhaus builds everything *around* it: persistence, auth, collaboration infrastructure, programmatic access. The editor is theirs. The platform is ours.

**3. Three entry points, one diagram.**
Humans (editor), code (API), and AI (MCP) all produce the same Excalidraw element arrays stored in the same PostgreSQL tables. No format translation, no lossy conversion. A diagram can start in Claude Code and get refined in the editor.

**4. Progressive complexity.**
A solo developer gets a working whiteboard. A team gets workspaces and sharing. An admin gets backups and user management. An AI workflow gets MCP and API. Each layer is opt-in. Solo users never see team features.

**5. Learning is a first-class goal.**
This is a personal project built to learn full-stack development. Every feature is a lesson in architecture, tradeoffs, and shipping. "Is this a good learning opportunity?" is a valid reason to build something.

---

## Who It's For

**First user: me.** I use Drawhaus daily for architecture diagrams, system sketches, and AI-generated visuals. If a feature doesn't improve my workflow, it probably doesn't belong here.

**Inner circle: developers who self-host.** The kind of person who runs Plausible instead of Google Analytics, Gitea instead of GitHub, and prefers `docker compose up` over signing up for another SaaS. They want control over their data and infrastructure. They're comfortable with a terminal.

**Broader audience: small teams (2-10) who diagram together.** Freelancers sharing architecture with clients. Small studios collaborating on system design. Teams that want real-time collaboration without paying per-seat for a tool they use weekly.

**Not for:**
- **Enterprises** needing SSO/SAML, compliance audit trails, or 99.99% SLA. This is a single-VPS tool, not an enterprise platform.
- **Designers** wanting pixel-perfect UI design. Drawhaus is for diagrams and sketches.
- **Non-technical users** who can't run Docker. Self-hosted means you're your own ops team.

---

## What Success Looks Like

**Minimum:** I replace my own $6/month whiteboard subscription and use Drawhaus as my daily driver. The project taught me full-stack development deeply enough to have opinions about real-time sync, auth, and deployment.

**Good:** A few hundred developers self-host it. The MCP server becomes part of AI-assisted development workflows. People contribute bug reports, feature ideas, or PRs. The GitHub repo has enough stars that it shows up when someone searches "self-hosted excalidraw."

**Great:** Drawhaus becomes the default answer to "how do I self-host a collaborative whiteboard?" The diagram-as-code and MCP integration become the features people talk about — the things no other tool does. Small teams adopt it as their internal diagramming platform.

**What success is NOT:** Enterprise sales, VC funding, competing with Excalidraw+, or becoming a managed service. If it grows beyond what I can maintain as a solo builder, the answer is better documentation and community — not a company.

---

## The Vision

Drawhaus is a **self-hosted diagramming platform** built on Excalidraw's editor, adding the infrastructure layer needed to use it as a full team tool — and the programmatic layer needed to let AI agents participate.

```
Drawhaus
├── Editor             Excalidraw with real-time collaboration, cursors, and presence
├── Workspaces         Multi-tenant organization with roles and permissions
├── Sharing            Links with roles, expiration, guest access, embeds
├── Snapshots          Persistent versioning with preview, restore, and offline recovery
├── Templates          Built-in + custom workspace-scoped templates
├── Diagram as Code    Mermaid and PlantUML → editable Excalidraw elements
├── Public API         REST endpoints for CRUD, workspace-scoped, rate-limited
├── MCP Server         AI agents create and manage diagrams via Model Context Protocol
└── Admin Panel        User management, metrics, backups, integrations, maintenance mode
```

### The Three Surfaces

Every diagram in Drawhaus is accessible through three surfaces:

| Surface | Who uses it | How |
|---|---|---|
| **Editor** | Humans | Draw, sketch, arrange — the Excalidraw experience |
| **API** | Code & CI/CD | REST endpoints for CRUD, templates, export |
| **MCP** | AI agents | Claude Code, Cursor, VS Code create diagrams from natural language |

This means a diagram can start as a text prompt in Claude Code, get refined by a developer in the editor, and be updated by a CI pipeline when the architecture changes. **Same diagram, three entry points.**

### What stays constant across all features

- Belongs to a **Workspace** with role-based access (owner > admin > editor > viewer)
- Persisted in **PostgreSQL** with automated backups
- Real-time updates via **Socket.IO** with live cursors and presence
- Self-hosted, single `docker compose up`
- Accessible via **Dashboard**, **REST API**, and **MCP**

### The Diagram-as-Code Pipeline

One of Drawhaus's key differentiators is treating text-based diagram formats as **input**, not output:

```
PlantUML / Mermaid source
        │
        ▼
   Parse to AST
        │
        ▼
   Convert to Excalidraw elements
        │
        ▼
   Editable diagram in the editor
```

Most tools go the other direction (diagram → static image). Drawhaus goes **code → editable elements**, which means:

- Diagrams defined in code reviews become editable artifacts
- AI-generated diagrams are first-class editable objects, not screenshots
- Teams can start from code and refine visually, or vice versa

### The MCP Advantage

AI coding assistants (Claude Code, Cursor, Windsurf) can interact with Drawhaus directly:

| MCP Tool | What it does |
|---|---|
| `create_diagram` | Generate a diagram from a description or element array |
| `list_diagrams` | Browse existing diagrams in a workspace |
| `get_diagram` | Read a diagram's elements and metadata |
| `update_diagram` | Modify an existing diagram programmatically |
| `validate_elements` | Check elements against the Excalidraw spec before creating |

The `@drawhaus/helpers` package provides element builders, layout engines (dagre), arrow routing, and a curated Excalidraw spec — so AI models produce valid, well-laid-out diagrams without hallucinating element properties.

**The workflow this enables:**

```
Developer: "Draw the architecture for this service"
    → AI reads the codebase
    → AI calls create_diagram via MCP
    → Diagram appears in Drawhaus dashboard
    → Developer opens it, drags a few boxes, adds notes
    → Shares with team via link
```

No copy-paste. No screenshots. No manual conversion.

---

## What This Is NOT

- **Not a competitor to Excalidraw.** Excalidraw is the foundation. Drawhaus explores a different surface — infrastructure, APIs, AI — not a different editor. If Excalidraw+ covers your needs, use it.
- **Not a production design tool.** Drawhaus is for diagrams, whiteboards, and sketches — not pixel-perfect UI design.
- **Not a project management tool.** No Kanban boards, no sprint tracking.
- **Not an enterprise collaboration suite.** No SSO/SAML, no compliance audit trails. This is a personal and small-team tool.
- **Not a presentation tool.** Export your diagrams and put them in slides.
- **Not a managed service.** Self-hosted is the entire point.

---

## Architecture Principles

### 1. Self-Host First

Every feature must work with `docker compose up`. No external services required. Optional integrations (Google Drive, Resend, Honeybadger) are additive — the core product works without them.

### 2. Excalidraw Is The Editor

Excalidraw is world-class — there's nothing to improve there, and no reason to try. Drawhaus builds everything *around* it: persistence, auth, collaboration infrastructure, programmatic access. The editor is theirs. The platform is ours.

### 3. Three Entry Points, One Data Model

Humans (editor), code (API), and AI (MCP) all produce the same Excalidraw element arrays stored in the same PostgreSQL tables. No format translation, no lossy conversion.

### 4. Clean Architecture

Backend follows strict layering: `domain/` (entities) → `application/` (use cases) → `infrastructure/` (routes, repos, sockets). This keeps the codebase navigable as features grow.

### 5. Progressive Complexity

A solo developer gets a working whiteboard. A team gets workspaces and sharing. An admin gets backups and user management. An AI-powered workflow gets MCP and API. Each layer is opt-in.

---

## The Litmus Test

Before adding any new feature, ask:

1. **Does it help create, share, or manage diagrams?** If no, it's out of scope.
2. **Does it work self-hosted with `docker compose up`?** If it needs managed services or complex infrastructure, simplify or skip.
3. **Can it be accessed via editor, API, and MCP?** If a feature only works in one surface, consider how it extends to the others.
4. **Does it respect progressive complexity?** Solo users shouldn't see team features. Teams shouldn't need admin features. Everything is opt-in.
5. **Would I use this myself?** Drawhaus is a personal project first. If the feature feels enterprise or I wouldn't use it in my own workflow, it probably doesn't belong here.

---

## Where Drawhaus Sits

Drawhaus isn't trying to replace anything. It occupies a specific niche: **self-hosted, with programmatic and AI access**. If you're happy with Excalidraw+ — you should use it. If you want to self-host, tinker, and integrate with AI workflows — that's what this project is for.

| Capability | What Drawhaus adds beyond Excalidraw OSS |
|---|---|
| **Persistence & auth** | User accounts, sessions, PostgreSQL storage |
| **Workspaces & sharing** | Roles, share links, guest access, embeds |
| **Snapshots & backups** | Version history, automated backups, restore |
| **REST API** | Programmatic CRUD for diagrams |
| **MCP server** | AI agents can create and manage diagrams |
| **Diagram-as-code** | PlantUML/Mermaid → editable Excalidraw elements |
| **Admin panel** | User management, metrics, integrations |

---

## Execution Strategy

### Phase 1: Solid Core (done)

Editor, real-time collaboration, workspaces, sharing, snapshots, templates, admin panel, API. This is shipped and working.

### Phase 2: Programmatic Access (current)

MCP server, helpers package, PlantUML/Mermaid import, public API. Making Drawhaus a platform that code and AI can interact with, not just a GUI.

### Phase 3: AI-Native Workflows (next)

AI Assist (text → diagram via Claude API), webhook notifications on diagram events, richer diagram-as-code support. Making the AI → Drawhaus → human loop seamless.

### Phase 4: Distribution & Ecosystem

Embed SDK, CLI tool, OpenGraph previews, GitHub integration. Making diagrams from Drawhaus show up everywhere developers already work.

### Phase 5: Let Users Decide

The modular architecture supports extension. But we don't build features until there's demand. No speculative roadmap beyond Phase 4.

---

## Naming

"Drawhaus" works across the full vision. "Draw" is the action. "Haus" evokes structure, craft, and the Bauhaus design tradition — geometric, functional, no ornament. The brand identity (Bauhaus-inspired, indie builder, self-host proud) applies to every feature surface.

The ecosystem uses a consistent naming pattern:

- **Drawhaus** — the platform
- **@drawhaus/helpers** — element builders and layout engine for programmatic use
- **@drawhaus/mcp** — MCP server for AI agent integration
- **@drawhaus/plantuml-to-excalidraw** — PlantUML parser and converter
- **@drawhaus/mermaid-to-excalidraw** — Mermaid parser and converter

---

## Future Ideas

### Ideas that belong here (someday)

| Idea | What it is | Builds on |
|---|---|---|
| **AI Assist** | Natural language → Excalidraw elements via Claude API | MCP + helpers |
| **Webhooks** | Notify external systems on diagram create/update/delete events | API |
| **Embed SDK** | `@drawhaus/embed` — drop a live diagram into any webpage | Sharing + API |
| **CLI Tool** | Create/list/export diagrams from the terminal | API |
| **GitHub Gist Export** | One-click export diagram as Gist | API |
| **@mentions in Comments** | Tag team members in diagram threads | Comments system |
| **Admin Analytics** | Charts for user growth, diagram activity, collaboration patterns | Admin panel |

### Ideas that belong somewhere else

| Idea | Why not Drawhaus |
|---|---|
| **E2E encryption** | Breaks real-time collaboration merge logic; redundant when self-hosted |
| **Voice/screenshare** | Users have Meet/Discord; adds massive complexity |
| **Offline mode** | Requires CRDT rewrite of the sync layer |
| **SSO/SAML** | Enterprise complexity for a tool targeting indie teams |
| **PDF/PPTX export** | PNG/SVG are sufficient; users paste into their own tools |
| **Presentation mode** | Use actual presentation tools; Drawhaus is where diagrams live |
