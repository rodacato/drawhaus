# ui-kit.lib.pen — Changelog

Pencil can't reference components across `.pen` files, so each `flows/*.pen` **vendors** the
kit at a pinned version via the install script — it does NOT link live. Bumping here means
flows on an older version may need a re-sync.

**Version markers:** `kit-version` variable lives in `ui-kit.lib.pen`; each flow records the
version it vendored in `kit-version-source`.

**Bump rules:** patch = token value tweak · minor = new/changed token or component ·
major = breaking rename/removal. Additive bumps don't force re-syncs — being behind is fine,
diverging is not. A changed token VALUE forces every consumer.

---

## 0.1.0 — initial

**Tokens (54):** the Ocean Ink brand roles, the operational roles that resolve to them, state and
accent colours, alpha tints (`*-10`/`-15`/`-25`/`-30`), shadows, fonts and two radii, light and dark. Lifted
from `apps/frontend/src/globals.css` and the Tailwind classes in `lib/ui.ts`.

**Components (25):** Button (Primary, Secondary, Danger × Default, Focus, Disabled), Field (Default,
Focus), Card, Alert (Error, Success), Badge, Empty, Toggle (Off, On, Focus), ThemeToggle,
BrandLogo/Mark, Toast (Success, Error, Info), ConfirmDialog/Danger.

**Vendored by:** `flows/auth.pen` and `flows/dashboard.pen` (kit-version-source `0.1.0`).

### Gaps surfaced by the pilots → candidates for 0.2.0

| Need                     | Real value                                                     | Used instead                             | Note                                               |
| ------------------------ | -------------------------------------------------------------- | ---------------------------------------- | -------------------------------------------------- |
| G1 focus ring offset     | `ring-2` + `ring-offset-2`                                     | 2 px outer stroke                        | Pencil has no ring offset                          |
| G2 Stress section        | n/a                                                            | not built                                | The kit contract asks for one; not built in 0.1.0  |
| G3 motion token          | `--duration-brand-feedback: 120ms`                             | none                                     | Mirror once `ui-motion` decides the vocabulary     |
| G4 background blob tints | `bg-primary/10`, `bg-accent-coral/10`                          | flow-local `primary-10`, `coral-10`      | Used by every auth screen; add to the kit in 0.2.0 |
| G5 dashed border         | `border-dashed` (New Diagram card, empty states, no-thumbnail) | solid border                             | Pencil has no dash; a kit fixture note             |
| G6 Google/GitHub marks   | brand SVGs in `Login.tsx`                                      | phosphor `google-logo`, feather `github` | Image fills of SVG break; icons are approximations |
