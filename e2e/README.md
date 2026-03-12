# E2E Tests

End-to-end tests for Drawhaus using [Playwright](https://playwright.dev/).

## Quick start

```bash
# Run all tests (headless)
npm run test:e2e

# Run with HTML report
npm run test:e2e -- --reporter=html

# Debug a specific test
npm run test:e2e -- --debug tests/auth/register.spec.ts
```

## Running in a devcontainer

Some commands require a display server (X11) that isn't available inside a devcontainer. The table below shows what works where:

| Command | Devcontainer | Local |
|---------|:---:|:---:|
| `npm run test:e2e` (headless) | Yes | Yes |
| `npm run test:e2e -- --reporter=html` | Yes | Yes |
| `npm run test:e2e:debug` | No | Yes |
| `npm run test:e2e:ui` | No | Yes |
| `npm run test:e2e:headed` | No | Yes |
| `npm run test:e2e:update-snapshots` | Yes | Yes |

### Viewing the HTML report from a devcontainer

After running tests with `--reporter=html`, serve the report and access it from your host browser:

```bash
npx playwright show-report e2e/playwright-report --host 0.0.0.0
```

VS Code will detect the port (default 9323) and show a notification to open it in your browser. If it doesn't appear, check the **Ports** tab in VS Code and forward the port manually.

## How it works

Tests run against a live backend (port 4000) and frontend (port 5173) that Playwright starts automatically via `webServer` config. A **global setup** step runs first to:

1. Create the admin user (or log in if it already exists)
2. Register domain-specific test users (workspace, API, etc.)
3. Save authenticated sessions to `tests/.auth/` so tests skip login

Each test suite uses pre-authenticated browser contexts loaded from these saved sessions.

## Project structure

```
e2e/
├── playwright.config.ts        # Playwright config (browsers, servers, timeouts)
├── fixtures/                   # Reusable test utilities
│   ├── auth.fixture.ts         # Test user credentials and base fixture
│   ├── data.fixture.ts         # API helpers (createDiagram, createWorkspace, etc.)
│   └── multi-user.fixture.ts   # Domain-specific users and login utilities
├── pages/                      # Page object models
│   ├── login.page.ts
│   ├── dashboard.page.ts
│   └── editor.page.ts
└── tests/
    ├── global-setup.ts         # Creates users and saves auth state
    ├── .auth/                  # Stored session files (gitignored)
    ├── smoke/                  # Critical path happy-path tests
    ├── auth/                   # Registration, forgot password
    ├── diagrams/               # CRUD, folders, search, stars
    ├── workspaces/             # CRUD, member management
    ├── sharing/                # Share links, guest access, embeds
    ├── user-settings/          # Profile, security
    ├── admin/                  # User management, invitations, instance settings
    ├── permissions/            # Auth boundaries, resource access, role checks
    ├── api/                    # Scenes, comments, tags
    ├── visual.spec.ts          # Visual regression screenshots
    ├── dashboard.spec.ts       # Dashboard UI tests
    ├── editor.spec.ts          # Editor/canvas UI tests
    └── share.spec.ts           # Share flow UI tests
```

## Test users

Tests use isolated users per domain to avoid resource conflicts:

| User | Email | Purpose |
|------|-------|---------|
| Admin | `admin@drawhaus.test` | Admin panel, settings, metrics |
| Primary | `e2e@drawhaus.test` | General tests (diagrams, sharing, etc.) |
| WS CRUD | `e2e-ws-crud@drawhaus.test` | Workspace create/update/delete |
| WS Member | `e2e-ws-member@drawhaus.test` | Workspace membership and invites |
| API Tests | `e2e-api@drawhaus.test` | Scenes, comments, tags API |

## What the tests cover

### Smoke tests
Critical end-to-end paths: login, diagram creation, workspace listing, sharing, search, admin access, logout.

### Authentication
Login/logout flows, registration, forgot password, session persistence, form validation.

### Diagrams
Full CRUD, folder management (create, rename, move diagrams), search with URL params, star/unstar favorites.

### Workspaces
Create/update/delete workspaces, personal workspace protection, member invitations, cross-user access control.

### Sharing & collaboration
Share link creation (viewer/editor roles), link revocation, guest join flow, embed route (minimal chrome, no auth required).

### Permissions
- **Auth boundaries:** All protected endpoints return 401 without a session
- **Resource access:** Users cannot read/update/delete other users' diagrams
- **Role boundaries:** Non-admins get 403 on all admin endpoints

### API
Scenes (diagram versions), comment threads (replies, resolve, like), tags (CRUD, assign/unassign to diagrams).

### User settings
Profile name updates, password changes, account deletion with password confirmation.

### Admin
User listing and role management, invitation system, instance settings (name, registration toggle).

### Visual regression
Baseline screenshots of login, dashboard, register, forgot password, settings, and admin pages. Uses animation disabling, element masking, and a 5% pixel diff tolerance.

## Coverage gaps

Tests pending implementation, grouped by priority and target file.

### Tier 1 — Critical flows without coverage

**`tests/workspaces/invite.spec.ts`** (new file)
- [ ] `GET /api/workspaces/invite/:token` validates token
- [ ] `POST /api/workspaces/accept-invite` adds user to workspace
- [ ] Accepted member can access workspace resources
- [ ] Invalid token shows error on `/workspace-invite/:token`
- [ ] UI: `/workspace-invite/:token` renders accept/reject flow

**`tests/workspaces/members.spec.ts`** (extend existing)
- [ ] `PATCH /api/workspaces/:id/members/:userId` changes member role
- [ ] `DELETE /api/workspaces/:id/members/:userId` removes member
- [ ] Removed member loses access to workspace
- [ ] Member limit enforced (max 5)

**`tests/auth/reset-password.spec.ts`** (new file)
- [ ] `/reset-password/:token` page loads the form
- [ ] `POST /api/auth/reset-password` resets password with valid token
- [ ] Expired/invalid token shows error on reset page

**`tests/auth/invite.spec.ts`** (new file)
- [ ] `GET /api/auth/invite/:token` validates user invitation
- [ ] `POST /api/auth/accept-invite` creates account from invitation
- [ ] `/register?invite=:token` pre-fills email from invitation

### Tier 2 — Security and admin gaps

**`tests/permissions/disabled-user.spec.ts`** (new file)
- [ ] Admin disables user via `PATCH /api/admin/users/:id`
- [ ] Disabled user cannot login
- [ ] Disabled user's existing session is rejected

**`tests/permissions/resource-access.spec.ts`** (extend existing)
- [ ] Share link with `viewer` role blocks `PATCH` on diagram

**`tests/admin/settings.spec.ts`** (extend existing)
- [ ] Toggle maintenance mode on → non-admins see maintenance page
- [ ] Admin retains access during maintenance
- [ ] Toggle maintenance mode off → access restored

### Tier 3 — Nice to have

**`tests/visual.spec.ts`** (extend existing)
- [ ] Landing page (`/`) screenshot
- [ ] Dashboard empty state screenshot
- [ ] 404 page screenshot

**`tests/user-settings/preferences.spec.ts`** (new file)
- [ ] Settings tabs load: billing, integrations, preferences
- [ ] Theme toggle (light/dark) persists

**Not planned** (low ROI or requires external mocks):
- Google OAuth login/callback — requires Google mock
- Google Drive endpoints (`/api/drive/*`) — requires Drive API mock
- WebSocket real-time collaboration — requires WebGL in headless
- Diagram thumbnail upload (`PUT /api/diagrams/:id/thumbnail`) — canvas-generated

## Key patterns

- **API-first data setup:** Tests create data via API helpers before asserting on the UI — faster and more stable than filling forms.
- **User isolation:** Each test domain gets its own user and auth state to prevent conflicts in parallel runs.
- **Page objects:** `LoginPage`, `DashboardPage`, and `EditorPage` encapsulate locators and common actions.
- **Visual stability:** Visual tests disable CSS animations, hide decorative elements, blur focused inputs, and mask dynamic content (timestamps, avatars).

## Scripts

| Script | Description | Requires display |
|--------|-------------|:---:|
| `npm run test:e2e` | Run all tests headless | No |
| `npm run test:e2e:ui` | Interactive UI mode | Yes |
| `npm run test:e2e:headed` | Run with visible browser | Yes |
| `npm run test:e2e:debug` | Step-through debugger | Yes |
| `npm run test:e2e:update-snapshots` | Update visual regression baselines | No |
