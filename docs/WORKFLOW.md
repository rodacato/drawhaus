# Drawhaus — AI-Assisted Project Workflow

> How we go from idea to shipped feature using AI agents as development partners.

---

## Philosophy

Documentation is the foundation, not an afterthought. The better the docs, the better any AI agent performs in every future conversation. Files like `IDENTITY.md`, `EXPERTS.md`, and specs become persistent context that shapes every interaction.

This workflow is tool-agnostic — it works with Claude Code, Cursor, Windsurf, Copilot, or any agent that reads project files for context.

---

## Documentation Map

| Document         | Location                                                                 | Purpose                                                                  | When to read                                                       |
| ---------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| **CLAUDE.md**    | `/CLAUDE.md`                                                             | Agent instructions, commands, conventions                                | Auto-loaded by Claude Code on every conversation                   |
| **AGENTS.md**    | `/AGENTS.md`                                                             | AI agent behavior rules, identity, expert panel                          | Auto-loaded or referenced by any AI tool                           |
| **VISION.md**    | `docs/VISION.md`                                                         | Product vision, architecture principles, competitive positioning         | When making scope or direction decisions                           |
| **IDENTITY.md**  | `docs/IDENTITY.md`                                                       | Build persona, decision style, quality bar                               | When calibrating agent responses to project standards              |
| **EXPERTS.md**   | `docs/EXPERTS.md`                                                        | Virtual advisory board — 7 expert personas                               | When facing tradeoffs or cross-cutting decisions                   |
| **ROADMAP.md**   | `docs/ROADMAP.md`                                                        | Strategy: intent, principles, what's built, not doing, decision log      | Before scope or direction decisions                                |
| **Backlog**      | [GitHub Project](https://github.com/users/rodacato/projects/8) (private) | Single source of truth for planned work: features, bugs, debt, decisions | Before starting any work                                           |
| **BRANDING.md**  | `docs/BRANDING.md`                                                       | Colors, typography, logo, UI patterns                                    | When building or modifying UI components                           |
| **CHANGELOG.md** | `/CHANGELOG.md`                                                          | Full version history                                                     | When writing release notes or checking what shipped                |
| **ADRs**         | `docs/adr/`                                                              | Architecture Decision Records with context and consequences              | When revisiting past decisions or making new architectural choices |
| **Specs**        | `docs/specs/`                                                            | Feature implementation blueprints                                        | Before building a roadmap feature                                  |
| **Guides**       | `docs/guides/`                                                           | Operational guides (deploy, release)                                     | When deploying or cutting a release                                |
| **API docs**     | `docs/api/`                                                              | OpenAPI 3.1 spec + Redocly config                                        | When modifying `/v1/` public API endpoints                         |

---

## The Build Cycle

Every feature follows this path:

```
Idea → Project item → Spec → Implement → Test → Release
         ↑                   ↓
         └── ADR (if architectural decision needed)
```

### 1. Capture the idea

Add a draft item to the GitHub Project with Status `Todo`, Priority, Area and Kind, a one-line summary, an effort estimate (Sizing Key in `docs/ROADMAP.md`) and acceptance criteria that include a negative case. Items are private drafts; security findings never go to public issues ([SECURITY.md](../SECURITY.md)).

### 2. Write a spec (when ready to build)

Create `docs/specs/<feature-name>.md` with:

- **Scope** — what's in, what's out.
- **Technical approach** — how it works, which layers it touches.
- **File-by-file plan** — specific files to create or modify.
- **Verification steps** — concrete steps to confirm it works.

Link the spec from the Project item.

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
- Move the Project item to `In Progress`, and to `Done` once merged.

### 6. Test & ship

- Backend tests: `npm test --workspace=backend`
- Frontend tests: `npm test --workspace=frontend`
- Lint, typecheck, format: `npm run lint && npm run typecheck && npm run format:check`
- E2E tests: `cd e2e && npm test` (also runs in CI; local setup in `e2e/README.md`)
- Follow `docs/guides/releasing.md` for version bump, changelog, tag, and deploy.

---

## Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

| Prefix      | When                                              |
| ----------- | ------------------------------------------------- |
| `feat:`     | New feature or capability                         |
| `fix:`      | Bug fix                                           |
| `docs:`     | Documentation only                                |
| `chore:`    | Tooling, config, infrastructure                   |
| `refactor:` | Code change that doesn't add features or fix bugs |
| `test:`     | Adding or updating tests                          |
| `release:`  | Version bump commit                               |

---

## Documentation Sync Rules

When making changes, update corresponding docs **in the same commit**:

- New/changed API endpoints → `README.md` API Overview table + `docs/api/`
- New/changed env vars → `README.md` env vars table + `.env.example`
- New features shipped → `CHANGELOG.md` + "What's Been Built" in `docs/ROADMAP.md` + Project item to `Done`
- New frontend routes → `README.md` Routes table
- Architectural decisions → `docs/adr/` + Decision Log in `docs/ROADMAP.md`
- New work or findings → draft item in the GitHub Project

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
