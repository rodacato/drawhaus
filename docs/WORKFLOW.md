# Drawhaus — AI-Assisted Project Workflow

> How we go from idea to shipped feature using AI agents as development partners.

---

## Philosophy

Documentation is the foundation, not an afterthought. The better the docs, the better any AI agent performs in every future conversation. Files like `IDENTITY.md`, `EXPERTS.md`, and specs become persistent context that shapes every interaction.

This workflow is tool-agnostic — it works with Claude Code, Cursor, Windsurf, Copilot, or any agent that reads project files for context.

---

## Documentation Map

| Document | Location | Purpose | When to read |
|----------|----------|---------|-------------|
| **CLAUDE.md** | `/CLAUDE.md` | Agent instructions, commands, conventions | Auto-loaded by Claude Code on every conversation |
| **AGENTS.md** | `/AGENTS.md` | AI agent behavior rules, identity, expert panel | Auto-loaded or referenced by any AI tool |
| **VISION.md** | `docs/VISION.md` | Product vision, architecture principles, competitive positioning | When making scope or direction decisions |
| **IDENTITY.md** | `docs/IDENTITY.md` | Build persona, decision style, quality bar | When calibrating agent responses to project standards |
| **EXPERTS.md** | `docs/EXPERTS.md` | Virtual advisory board — 6 expert personas | When facing tradeoffs or cross-cutting decisions |
| **ROADMAP.md** | `docs/ROADMAP.md` | What's built, what's next, backlog, decision log | Before starting any new feature work |
| **BRANDING.md** | `docs/BRANDING.md` | Colors, typography, logo, UI patterns | When building or modifying UI components |
| **CHANGELOG.md** | `/CHANGELOG.md` | Full version history | When writing release notes or checking what shipped |
| **ADRs** | `docs/adr/` | Architecture Decision Records with context and consequences | When revisiting past decisions or making new architectural choices |
| **Specs** | `docs/specs/` | Feature implementation blueprints | Before building a roadmap feature |
| **Guides** | `docs/guides/` | Operational guides (deploy, release) | When deploying or cutting a release |
| **API docs** | `docs/api/` | OpenAPI 3.1 spec + Redocly config | When modifying `/v1/` public API endpoints |

---

## The Build Cycle

Every feature follows this path:

```
Idea → Roadmap → Spec → Implement → Test → Release
         ↑                   ↓
         └── ADR (if architectural decision needed)
```

### 1. Capture the idea

Add it to the **Backlog** section of `docs/ROADMAP.md` with a one-line summary and effort estimate.

### 2. Write a spec (when ready to build)

Create `docs/specs/<feature-name>.md` with:

- **Scope** — what's in, what's out.
- **Technical approach** — how it works, which layers it touches.
- **File-by-file plan** — specific files to create or modify.
- **Verification steps** — concrete steps to confirm it works.

Move the item to "What's Next" in the roadmap with status `backlog`.

### 3. Consult the expert panel (when uncertain)

For cross-cutting decisions, consult `docs/EXPERTS.md`:

```
"Panel, evaluate these 3 options for [feature]."
"Security + Architect: review this flow for auth gaps."
"Product + Growth: which approach serves the ICP better?"
```

### 4. Record architectural decisions

If a decision was non-trivial (debated >5 min, involved tradeoffs), write an ADR in `docs/adr/`:

```
docs/adr/NNN-short-title.md
```

Format:

```markdown
# ADR-NNN: Title

**Status:** accepted | superseded | deprecated
**Date:** YYYY-MM-DD

## Context
## Decision
## Alternatives Considered
## Consequences
```

The Decision Log in `docs/ROADMAP.md` serves as an executive summary. ADRs hold the full reasoning.

### 5. Implement

- Follow the spec. Reference `CLAUDE.md` for conventions.
- Keep changes small, reviewable, and reversible.
- Update status to `in-progress` in the roadmap.

### 6. Test & ship

- Backend unit tests: `npm test --workspace=backend`
- E2E tests: `cd e2e && npm test`
- Lint + typecheck: `npm run lint && npm run typecheck`
- Follow `docs/guides/releasing.md` for version bump, changelog, tag, and deploy.

---

## Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

| Prefix | When |
|--------|------|
| `feat:` | New feature or capability |
| `fix:` | Bug fix |
| `docs:` | Documentation only |
| `chore:` | Tooling, config, infrastructure |
| `refactor:` | Code change that doesn't add features or fix bugs |
| `test:` | Adding or updating tests |
| `release:` | Version bump commit |

---

## Documentation Sync Rules

When making changes, update corresponding docs **in the same commit**:

- New/changed API endpoints → `README.md` API Overview table + `docs/api/`
- New/changed env vars → `README.md` env vars table + `.env.example`
- New features shipped → `CHANGELOG.md` + mark done in `docs/ROADMAP.md`
- New frontend routes → `README.md` Routes table
- Architectural decisions → `docs/adr/` + Decision Log in `docs/ROADMAP.md`

---

## Quick Reference: Prompts That Work

### For specs
```
"Write a spec for [feature]. Include scope, technical approach,
file-by-file plan, and verification steps.
Reference the architecture from CLAUDE.md."
```

### For implementation
```
"Implement the spec at docs/specs/[feature].md.
Follow the spec exactly. Start with [component]."
```

### For architecture decisions
```
"I need to decide between [A] and [B] for [purpose].
Act as the [relevant expert] and give me tradeoffs.
Then write an ADR documenting the decision."
```

### For expert panel consultation
```
"Convene [Expert 1] and [Expert 2] to review [design/decision].
I want both perspectives before deciding."
```

### For releases
```
"Prepare a release for v[X.Y.Z]. Follow docs/guides/releasing.md.
Update CHANGELOG, ROADMAP, and package.json versions."
```
