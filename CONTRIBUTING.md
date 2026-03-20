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
│   ├── frontend/    # React + Vite + Excalidraw
│   └── backend/     # Express + TypeScript (Clean Architecture)
├── packages/
│   └── mcp/         # @drawhaus/mcp — MCP server for AI tools
└── e2e/             # Playwright end-to-end tests
```

## Development Workflow

1. Create a branch from `master`:
   ```bash
   git checkout -b feat/your-feature
   ```
2. Make your changes.
3. Run linting and type checks:
   ```bash
   npm run lint
   npm run typecheck
   ```
4. Run backend tests:
   ```bash
   npm test --workspace=backend
   ```
5. (Optional) Run the E2E test suite (requires running backend + frontend + PostgreSQL):
   ```bash
   npm run test:e2e
   ```
6. Commit your changes with a clear, descriptive message.
7. Open a Pull Request against `master`.

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

## Suggesting Features

Open an issue describing:
- The problem your feature would solve.
- Your proposed solution.
- Any alternatives you've considered.

## Pull Request Guidelines

- Keep PRs small and focused.
- Include a description of **what** changed and **why**.
- Make sure all checks pass (lint, typecheck, E2E tests).
- Update documentation if your change affects user-facing behavior.

## License

By contributing to Drawhaus, you agree that your contributions will be licensed under the [MIT License](LICENSE.md).
