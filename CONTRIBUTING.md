# Contributing to Drawhaus

Thanks for your interest in contributing to Drawhaus! This guide will help you get started.

## Getting Started

1. **Fork** the repository and clone it locally.
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Set up the environment**: Copy `.env.example` to `.env` in the project root and fill in the required values (the defaults work for Docker Compose).
4. **Start the dev servers**:
   ```bash
   npm run dev
   ```
   This starts both the frontend (React/Vite) and backend (Express) concurrently.

## Project Structure

```
drawhaus/
├── apps/
│   ├── frontend/                # React + Vite + Excalidraw
│   └── backend/                 # Express + TypeScript (Clean Architecture)
├── packages/
│   ├── helpers/                 # @drawhaus/helpers — element builders, layout, validator
│   ├── mcp/                     # @drawhaus/mcp — MCP server for AI tools
│   └── plantuml-to-excalidraw/  # PlantUML parser and converter
├── e2e/                         # Playwright end-to-end tests
└── docs/                        # Vision, roadmap, specs, ADRs, branding, guides
```

## Development Workflow

1. Create a branch from `master`:
   ```bash
   git checkout -b feat/your-feature
   ```
2. Make your changes.
3. Run the checks CI runs:
   ```bash
   npm run lint
   npm run typecheck
   npm run format:check
   ```
4. Run the tests:
   ```bash
   npm test --workspace=backend
   npm test --workspace=frontend
   npm run test:pg --workspace=backend
   ```
   `test:pg` needs PostgreSQL. The devcontainer has it; elsewhere, point `DATABASE_URL` at a database whose name ends in `_test`.
5. (Optional) Run the E2E test suite (requires running backend + frontend + PostgreSQL; currently disabled in CI):
   ```bash
   cd e2e && npm test
   ```
6. Commit your changes following [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`).
7. Open a Pull Request against `master`.

See [docs/WORKFLOW.md](docs/WORKFLOW.md) for the full build cycle and documentation conventions.

## Code Style

- **TypeScript** is used across the entire codebase.
- Follow existing patterns and conventions in the code.
- Run `npm run lint` before submitting a PR.
- Keep changes focused: one feature or fix per PR.

## Reporting Bugs

Open an issue with:

- A clear title and description.
- Steps to reproduce the problem.
- Expected vs. actual behavior.
- Environment details (OS, browser, Node version).

**Security vulnerabilities:** do not open a public issue — follow [SECURITY.md](SECURITY.md).

## Suggesting Features

Open an issue describing:

- The problem your feature would solve.
- Your proposed solution.
- Any alternatives you've considered.

Planned work is tracked in the maintainer's private GitHub Project; issues you open are triaged into it.

## Pull Request Guidelines

- Keep PRs small and focused.
- Include a description of **what** changed and **why**.
- Make sure all checks pass (lint, typecheck, format, tests).
- Update documentation if your change affects user-facing behavior.

## License

By contributing to Drawhaus, you agree that your contributions will be licensed under the [MIT License](LICENSE.md).
