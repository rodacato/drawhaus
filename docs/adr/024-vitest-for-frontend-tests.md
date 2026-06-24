# ADR-024: Vitest + jsdom for Frontend Tests

**Status:** accepted
**Date:** 2026-06-24

## Context

Frontend tests were running on `tsx --test` (Node's built-in `node:test`), matching the backend's stack. That choice worked for pure-logic modules — `lib/format-utils.ts`, `lib/save-state.ts`, the `api/` axios wrappers — and the frontend reached ~92% statement coverage on `src/api/` and 100% on `lib/offline-storage.ts` and `lib/diagram-code/*` through PRs #60 and #63.

That run had natural limits:

- **No DOM.** React components, pages, contexts, and hooks (~40+ files, roughly half the frontend codebase) cannot be exercised. Statement coverage on `src/components/`, `src/pages/`, `src/contexts/`, and `src/lib/hooks/` is 0%.
- **`mock.module()` under `tsx` is flaky for CJS.** PR #63 documented `lib/services/socket.ts` as an honest skip: `socket.io-client` resolves as CJS through the `tsx` loader and `mock.module()`'s CJS-replacement path doesn't apply, so the real `io()` runs and crashes. Three configurations — `namedExports`, `exports`, both — all failed.
- **Two experimental flags** kept tests running on Node 22: `--experimental-test-module-mocks` for `mock.module()` and a `dist/index.js`-must-exist constraint that forced a CI workflow change (PR #63 made the excalidraw packages do a full build instead of types-only).

The trigger for revisiting was simple: with the easy non-DOM wins committed, the next mile of coverage requires a DOM.

## Decision

Move the frontend test stack to **Vitest + jsdom**, keep the backend on `tsx --test`.

- `vitest` as the runner, configured via `apps/frontend/vitest.config.ts` that `mergeConfig`s the existing `vite.config.ts` (the React plugin, alias `@`, and env loading are reused — no divergence between dev and test).
- `jsdom` as the test environment, via `test.environment: "jsdom"` in the config.
- `@testing-library/react` + `@testing-library/dom` + `@testing-library/user-event` for component interaction.
- `@vitest/coverage-v8` for coverage; output path stays `apps/frontend/coverage/lcov.info` so the CI artifact step is unchanged.
- `node:assert/strict` stays as the default assertion library for ported tests (vitest is compatible). New React tests use vitest's `expect` for ergonomic matchers.

## Alternatives Considered

- **Stay on `tsx --test` + add jsdom polyfill.** Possible but awkward: jsdom globals live for the lifetime of the process, contaminating tests that don't want them. `@testing-library/react` assumes Jest/Vitest semantics (act warnings, automatic cleanup) that don't map onto `node:test`. The `mock.module()` + tsx + CJS limitation that blocked `socket.ts` testing stays unsolved. Net effect: more friction for less idiomatic code.
- **Migrate both workspaces to Vitest.** Rejected for scope. Backend is pure server-side Node code (Express, Socket.IO, repositories) — `node:test` fits cleanly, and a backend session is in flight with no `mock.module()` pain. No reason to perturb it.
- **Skip frontend coverage of the React layer.** Rejected: roughly half the frontend ships untested. The cost of jsdom + RTL (one tool, ~5 deps, Vite-native config) is low; the coverage gap it unlocks is large.

## Consequences

- `apps/frontend/package.json` adds `vitest`, `@vitest/coverage-v8`, `jsdom`, `@testing-library/react`, `@testing-library/dom`, `@testing-library/user-event` to `devDependencies`. `c8` stays until a follow-up cleanup PR removes it.
- `apps/frontend/package.json` test scripts switch: `test` → `vitest run`, `test:watch` → `vitest`, `test:coverage` → `vitest run --coverage`. The `--experimental-test-module-mocks` flag is gone.
- The 21 pre-existing test files were ported mechanically. Each file's `node:test` import changes to `vitest`, `mock.method` → `vi.spyOn().mockResolvedValue`, `mock.module()` → `vi.mock()` with `vi.hoisted()` for shared closures. The 2 `diagram-code` tests dropped their dynamic-import dance because `vi.mock` is hoisted and works with static imports. Test count is preserved (190 pre-existing → 190 after port + 2 React POC = 192).
- A trivial `react-poc.test.tsx` exercises `render`/`screen`/`userEvent` to prove the DOM stack works end-to-end. It does not test a real component; future PRs cover real components, pages, hooks, contexts.
- The two stacks coexist cleanly in the monorepo (vitest in `apps/frontend`, `tsx --test` in `apps/backend` and `packages/helpers`). CI runs both under separate `npm run test --workspace=...` invocations.
- The CI workflow change in PR #63 (full build of `@drawhaus/mermaid-to-excalidraw` + `@drawhaus/plantuml-to-excalidraw` instead of types-only) is **still required** — vitest also goes through the Vite resolver, which checks `dist/index.js` exists even when `vi.mock` would replace the module.
- `lib/services/socket.ts` is unblocked. Its `import.meta.env.VITE_WS_URL` access still needs a guard (analogous to the one applied to `lib/api/client.ts` in PR #60), to be added when the first test lands.
