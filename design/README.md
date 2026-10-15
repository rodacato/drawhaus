# Design — Pencil workflow

Everything about the app's design lives here. Read this before touching a `.pen`. It doubles
as context for AI agents (`AGENTS.md` points them here).

**Two rules that matter most:**

1. The **code is the source of truth** for design and layout — not old designs, not stale
   screenshots.
2. **Don't dedupe or promote things into the kit unless you were asked.** Spotting a
   resemblance is a note, not a task — there's no live propagation, so every kit change is
   manual work across every consumer.

## What's here

| Path                  | What it is                                                                 |
| --------------------- | -------------------------------------------------------------------------- |
| `ui-kit.lib.pen`      | **The design library** — tokens + components, mirrored 1:1 from the code   |
| `ui-kit.CHANGELOG.md` | Kit versions and what each bump changed                                    |
| `flows/*.pen`         | **One file per domain** (a user journey with enough weight to justify one) |
| `_playground.pen`     | Experiments — **inside the system** (vendors the kit like any flow)        |
| `DECISIONS.md`        | The numbered findings registry the `.pen` briefs cite                      |
| `CODE_CHANGES.md`     | Work order for design-decided consolidations pending in code               |
| `exports/`            | Canvas PNGs for PM/PO/PR review — **committed** (they must travel)         |
| `references/`         | Local-only device captures — **never commit: real user data** (gitignored) |

### The flows

| File                  | Screens | Kit   | Domain entry point                                                           |
| --------------------- | ------- | ----- | ---------------------------------------------------------------------------- |
| `flows/auth.pen`      | 8       | 0.1.0 | `/login`, `/register`, `/forgot-password`, `/reset-password`, unknown routes |
| `flows/dashboard.pen` | 4       | 0.1.0 | `/dashboard` after sign-in                                                   |
| `flows/setup.pen`     | 4       | 0.1.0 | `/setup` first-run wizard                                                    |
| `flows/settings.pen`  | 21      | 0.1.0 | `/settings` user tabs, admin tabs, load errors, validation, narrow layout    |

Not drawn yet: embed, marketing pages. Comments and the editor's drawer panels are drawn inside `flows/editor.pen`. Derive the next domain from
`apps/frontend/src/router.tsx` routes, not from this list.

**This table is present tense — it never carries history.** "Migrated on <date>, six
components consolidated" belongs in that flow's `Log` frame, not here.

Every flow opens each row band with a **brief** frame (at the left of the band): purpose,
entry points, screens, business rules, copy source, states not drawn, open findings (`D<n>`
numbers only), history pointer — the same eight sections in every flow. **Read the brief
before editing a flow.** Each file also carries one **`Log`** frame below its bands: one
dated line per change, newest first.

| Where                    | Owns                                                |
| ------------------------ | --------------------------------------------------- |
| **Brief frame** (`.pen`) | the flow's **present state**                        |
| **Log frame** (`.pen`)   | **what changed and when** — one line each           |
| `DECISIONS.md`           | the **why** — findings, open questions, who decides |
| `CODE_CHANGES.md`        | landing decided changes in code                     |
| `ui-kit.CHANGELOG.md`    | kit versions and open kit gaps                      |
| this `README.md`         | the method + the inventory — **no history**         |

A fact written in two of them belongs in one; the others cite it.

## Source of truth

**code > production capture > legacy.** In that order, every time.

- Derive the **domain list** from the tab bar + navigator code, never from an old design.
- **Never invent copy** — every string must exist in the code.
- Build states by finding their owner in the code; hunt the states a normal session never
  reaches (no data, no permission, failed request) — that's where design gaps AND code bugs
  live.

## Canvas conventions

- Base frame: 1280×800 (desktop web app; the app is not mobile-first). `clip: true` on every screen frame. A scrolling page is drawn as its first viewport. Add a 390×844 variant only where the layout really changes.
- Naming: `[Flow] / [Screen] / [State]` — **no numeric prefix; order is position, not name.**
- **Tokens only** — zero hex in a flow. A value the kit lacks is a kit gap: log it.
- AA contrast through tokens; the kit's Foundations sheet carries the measured pairs. The app is pointer-first: no 44pt rule, but controls that only appear on hover are a finding (D9).
- Overlays (menus, dialogs) are drawn as absolutely positioned children of the screen they open from, anchored by computed coordinates.

### Layout — a docs column plus row bands

One **row band per journey variant** (happy path · error/alternate paths · desktop), read
left → right, each opening with its brief. One `Log` frame per file below every band.
Positions are **computed, never picked**, from five variables declared in the `.pen`:

| Variable       | This project | What it is                                  |
| -------------- | ------------ | ------------------------------------------- |
| `grid-x0`      | `0`          | Left edge of the docs column (briefs + Log) |
| `grid-brief-w` | `640`        | Width of every brief and of the Log         |
| `grid-gutter`  | `120`        | Horizontal gap between artboards            |
| `grid-y0`      | `0`          | Top of the first band                       |
| `grid-row-gap` | `260`        | Vertical gap between bands                  |

Inserting a screen mid-journey: drop it at the `x` it belongs to (overlap is fine), then
**reflow the band** — one call sorts by current `x` and re-snaps to the grid. It never
reorders, so drift is always cheap to fix.

## The kit + vendoring

Core/shared components → the kit. Feature-local components → the flow. Flows **vendor** the
kit at a pinned `kit-version-source` (Pencil can't cross-reference files); bumps follow the
CHANGELOG rules. Being behind is fine; **diverging is not** — install every token in every
flow even when nothing renders differently.

## Team workflow

1. Design changes go through PRs, like code — atomic with the implementing code when possible.
2. One person per `.pen` at a time. Kit changes get review.
3. Pencil saves when VS Code changes focus or tab, not on a timer: after editing, run `code -r <file>` on another file and confirm the `.pen` mtime moved (`ls -l --time-style=full-iso design/flows`) before committing.
4. Nothing moves from `_playground.pen` to `flows/` without cleanup + approval.
5. Export PNGs of changed flows for PM/PO review.

## Fidelity loop (design ↔ code)

1. Open the flow, read its brief. 2. Design with the vendored components. 3. Implement:
   "the `.pen` components map 1:1 to `apps/frontend/src/lib/ui.ts` and `apps/frontend/src/components/`". 4. Screenshot the rendered app,
   overlay at 50% opacity on the design, fix drift in the design first, then the code.

## Project specifics

- **Tokens** come from `apps/frontend/src/globals.css` (Ocean Ink). Dark mode is a `mode` theme axis
  (`light`/`dark`); wrap a frame with `theme: { mode: "dark" }` to see it. Values that carry an alpha
  (`error-10`, `primary-15`, …) are alpha-hex variables mirroring Tailwind's `/10`, `/25` suffixes.
- **Sample data** comes from `npm run db:seed` (Admin User; Architecture Overview, Sprint Planning
  Board, User Flow Diagram). Any other user data in a screen is marked in its brief.
- **Brand assets** (`apps/frontend/public/brand/`) are generated; the logo mark is drawn from the exact
  path in `docs/branding/logo.svg` (stroke scaled by the viewBox ratio).
- **Vendoring** has no tooling: each flow re-creates the tokens and the kit components it uses. Diff a
  flow against `ui-kit.lib.pen` before relying on it.
- **Findings** are `D<n>` in [DECISIONS.md](DECISIONS.md); the app has no shared component for most of
  them, so a fix lands in code first and the kit follows.
