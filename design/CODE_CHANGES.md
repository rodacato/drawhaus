# Code changes — consolidations decided in design, pending in code

> The work order for landing design-side findings in code. A `D<n>` in [DECISIONS.md](DECISIONS.md)
> records the finding; this doc tracks its **execution**. Every item below is now `done` on branch `feat/design-flows-admin`. The kit mirrors the CURRENT code until a change ships, then bumps.

**Measured on `master` at 3d69c7a, 2026-10-14** (tests and `AdminStyleGuide.tsx` excluded):

| Layer / value                                                              | Real consumers          | Verdict                                                  |
| -------------------------------------------------------------------------- | ----------------------- | -------------------------------------------------------- |
| Raw Tailwind palette (`red-`, `violet-`, `amber-`, `emerald-`, `blue-`, …) | 24 files                | Migrate to tokens (needs the badge palette decision, D8) |
| `text-[9px]`/`[10px]`/`[11px]`                                             | 53 uses, 21 files       | Raise to 12 px where it carries meaning (D16)            |
| Hover-only controls                                                        | 7 sites                 | Reveal on `focus-within` / always on touch (D9)          |
| Hand-rolled toggles                                                        | 3 beyond `ToggleSwitch` | Replace with `ToggleSwitch` (D12)                        |
| `role="alert"` / `aria-live`                                               | 0                       | Add to alerts and the toast stack (D3)                   |
| `aria-label` on auth password toggles                                      | 0 of 3                  | Add (D1)                                                 |

## 1. Accessibility floor (D1, D3, D9)

**Status:** done · three bugs with no design dependency

- `aria-label`/`aria-pressed` on the show/hide password buttons in `Login.tsx`, `Register.tsx`, `ResetPassword.tsx`.
- `role="alert"` on `ui.alertError`/`ui.alertSuccess` consumers; `aria-live="polite"` on the toast container in `Toast.tsx`.
- Reveal hover-only controls with `group-focus-within:` and keep them visible on touch: `DiagramCard.tsx`, `DiagramListRow.tsx`, `TemplatePicker.tsx`, `TemplatesView.tsx`, `SnapshotItem.tsx`, `DashboardSidebar.tsx`.

## 2. One toggle, one focus recipe (D12, D14)

**Status:** done

- Replace the three hand-rolled switches (`DriveIntegrationCard.tsx`, two in `SettingsPanel.tsx`) with `ToggleSwitch`; its off track moves from `bg-border` to `bg-border-input`.
- Use the `ui.btn` focus recipe in `ToggleSwitch.tsx` and `ConfirmDialog.tsx` (`ring-primary`, not `/50`).

## 3. Shared components instead of hand-rolled markup (D5, D7, D4, D6)

**Status:** done

- `WorkspaceToolbar.tsx`: use `ui.btn` variants; the pending state gets `disabled:opacity-50`.
- `WorkspaceInvite.tsx`: `ui.card`, `ui.h1`, `ui.btn`; `min-h-screen` instead of `h-screen`.
- Extract an `AuthShell` (blobs + theme toggle + card width) used by Login, Register, Forgot, Reset, Setup and NotFound.

## 4. Tokenise the badge and status palette (D8, D15)

**Status:** done · blocked on the palette decision

- `DiagramCard.tsx` (Delete item, tag pill, star), `lib/save-state.ts`, `ConnectionBadge.tsx`, `DriveSyncBadge.tsx`, `CollaborationBadge.tsx`, `FolderSection.tsx`, `board-sidebar/*`, `CodeImportPanel.tsx`, `ExportPanel.tsx`.
- `lib/save-state.ts` has a test asserting `bg-white` for the idle state; update it with the change.

## 5. Share links: validate, report errors, honour expiry (D19, D20, D22, D21)

**Status:** done · three bugs with no design dependency

- `BoardEditor.tsx:198-202`: drop the `localStorage` link cache or re-validate it against the server; offer role and expiry in the drawer.
- `SharePanel.tsx:38,178`, `ShareModal.tsx:62,105,117`: replace the silent `catch` blocks with `toast(…, "error")`.
- `ShareModal.tsx:96-98`: number input with `min=1 max=30`, reject 0 and negatives client-side (API accepts 1–720 hours, `share.routes.ts:15`).
- `ShareModal.tsx` URL preview: use a text token with 4.5:1 on `surface-dark`.

## 6. One dialog primitive (D25, D24)

**Status:** done · measured: 7 hand-rolled overlays besides `ConfirmDialog`

- `BoardSidebar.tsx` (leave), `OfflineRecoveryDialog.tsx`, `TemplatePicker.tsx`, `ShareModal.tsx`, `SnapshotPreview.tsx`, `SnapshotPanel.tsx`, `AdminUsers.tsx`.
- `pages/Share.tsx:38-45`: render the failed-link state with the auth card pattern.

## 7. Copy and canvas theme (D11, D13, D18)

**Status:** done · product calls

- `BoardEditor.tsx:65,76,84,182`: one language, with accents.
- Pass the app theme to Excalidraw (`ExcalidrawCanvas.tsx`) and decide how exports behave.
- `DiagramCard.tsx:535`: omit the date line when there is no timestamp.

## 8. Setup wizard (D26, D27, D28, D29)

**Status:** done except the password toggle (D28), which waits on the shared password field of item 1

- Done: `Setup.tsx` shows the error when `setupApi.complete()` fails and stays on step 3; `SetupStep3.tsx` shows a failed skip and re-enables the button; the “coming soon” note is gone; checkboxes use `border-border-input`; the progress connectors are `w-3`.
- Open: show/hide password in `SetupStep1.tsx`, with the aria-label from item 1.

## 9. Settings and admin (D30–D40)

**Status:** done · D30, D33 and D34 are bugs with no design dependency

- `ToggleSwitch.tsx`: `role="switch"`, `aria-checked`, and a required label (D30, with item 2).
- Error states and retry for the admin lists, metrics, secrets, webhooks, Drive and Site settings (D33).
- `ApiKeysSettings.tsx`: confirm before revoking; handle clipboard failure; show the empty state with the form open (D34, D39).
- `Settings.tsx`: validate the tab against the role (D31); one `h1` and a subtitle per tab (D32); collapse the nav on narrow screens (D40).
- Delete `AdminDashboard` (D35). Decide on Sentry in Setup step 3 (D36). A kit `Select` and `Checkbox` (D37). Client validation for the numeric and cron fields (D38).
