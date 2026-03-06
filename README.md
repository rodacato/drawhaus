# Drawhaus

Self-hosted collaborative whiteboard MVP (Excalidraw-based) built with an AI-first workflow.

## Goal
Build a working MVP mainly for personal use, friends, and coworkers, with minimal manual coding.

## Core Stack (Planned)
- Next.js 14 (frontend)
- Express + Socket.IO (backend)
- PostgreSQL (database)
- Docker Compose + Caddy (deployment)
- GitHub Actions (CI/CD automation)

Reference architecture and implementation details: [BUILD-YOUR-OWN.md](/Users/rodacato/Workspace/rodacato/drawhaus/BUILD-YOUR-OWN.md)

## How AI Should Operate In This Repo
- Primary behavior and decision style: [IDENTITY.md](/Users/rodacato/Workspace/rodacato/drawhaus/IDENTITY.md)
- Multi-perspective advice and debate: [EXPERTS.md](/Users/rodacato/Workspace/rodacato/drawhaus/EXPERTS.md)
- Agent operating rules: [AGENTS.md](/Users/rodacato/Workspace/rodacato/drawhaus/AGENTS.md)

When in doubt, or when requested, use the expert panel to get recommendations, risks, and fallback plans before implementing.

## MVP Scope (Initial)
- Auth (register/login/logout/me)
- Diagram CRUD
- Board editor page with autosave
- Basic real-time collaboration via rooms
- Share link (read-only)
- Dockerized local development

## Delivery Workflow (Low-Touch)
1. Create GitHub Issue for each feature/bug.
2. Define acceptance criteria and test steps in the issue.
3. Use Copilot agents to implement issue-scoped PRs.
4. Run GitHub Actions for validation on every PR.
5. Merge small PRs after CI passes.

## Suggested GitHub Project Setup
- Labels: `mvp`, `backend`, `frontend`, `realtime`, `security`, `infra`, `docs`
- Milestones: `P0-MVP`, `P1-Collab`, `P2-Polish`
- Issue template fields:
  - problem,
  - scope,
  - acceptance criteria,
  - out of scope,
  - test plan.

## Principles
- Keep it simple and shippable.
- Prefer proven patterns over novelty.
- Protect auth and permissions in every API/socket path.
- Document decisions briefly and move forward.

