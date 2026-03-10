# Drawhaus — Design-to-Code Stitch Roadmap

This document tracks features visible in the design mockups (`docs/designs/`) that are not yet implemented or need enhancement. Each section maps to a design screen and describes **what** needs to be built and **how** it should work.

---

## 1. Landing Page (Public Marketing)

**Designs:** `landing_page/`, `landing_page_light_mode/`
**Status:** Markup done (`LandingPage.tsx`). Route `/` shows landing for unauthenticated, redirects to dashboard if logged in.

### What to build

- **Sticky nav bar** with blur backdrop: Logo, Features, Docs, GitHub links, Sign In / Get Started buttons
- **Hero section** (2-column):
  - Left: version badge with pulsing dot, headline with gradient text, subtitle, two CTA buttons (Get Started, Self-host now), trust avatars ("2,000+ teams")
  - Right: feature screenshot with glow border
- **Features grid** (4 cards): Real-time collaboration, Contextual comments, Fully self-hosted, Easy export — each with icon, title, description; hover scale effect
- **CTA section**: "Ready to take control?" with Deploy / Docs buttons
- **Footer**: Logo, link columns (Product, Resources, Legal), copyright

### How it works

- Route: `/` when user is NOT authenticated (currently redirects to `/dashboard`)
- Conditional routing: unauthenticated → landing page; authenticated → redirect to dashboard
- Dark/light mode support using existing ThemeContext
- Fully static content, no API calls

---

## 2. Dashboard — Enhanced Sidebar & Card Features

**Designs:** `dashboard/`, `dashboard_light_mode/`
**Status:** Markup complete — all design elements present (starred, recent, tags, grid/list toggle, card menu). Backend logic needed for starred/tags/duplicate.

### Missing features

#### 2a. Starred / Favorite Diagrams
- Star icon on each diagram card (toggle on hover)
- "Starred" nav item in sidebar
- API: `PATCH /api/diagrams/:id/star` toggle
- DB: `starred boolean DEFAULT false` on diagrams table (or a separate `stars` join table for multi-user)

#### 2b. Recent Diagrams
- "Recent" nav item in sidebar
- API: sort by `updated_at DESC`, limit 10
- No DB changes — query only

#### 2c. Category Tags
- Tag badges on diagram cards (UX, Dev, Marketing, etc.)
- Tag management UI (create, assign, remove)
- API: CRUD for tags, assign/unassign to diagrams
- DB: `tags` table + `diagram_tags` join table

#### 2d. Grid / List View Toggle
- Toggle buttons in header area to switch between card grid and compact list
- Persist preference in localStorage

#### 2e. Diagram Card Hover Menu
- Three-dot menu (more_vert) overlay on hover
- Actions: Share, Move, Duplicate, Delete
- "Duplicate" action: `POST /api/diagrams/:id/duplicate`

#### 2f. Search Bar with Focus Icon Color
- Search icon changes color on input focus (design detail)

---

## 3. Board Editor — Enhanced Canvas UI

**Designs:** `board_editor_canvas/`, `board_editor_light_mode/`
**Status:** Core canvas works with Excalidraw. Floating UI partially implemented.

### Missing features

#### 3a. Collapsible Left Sidebar
- Slim icon bar (w-14) that expands to full sidebar (w-64) on hover
- Links: All Projects, Recent Files, Create New, Settings
- Currently: no sidebar on board view

#### 3b. Floating Top Header
- Semi-transparent centered bar with: logo, diagram name (editable inline), save status, collaborator avatars (with +N overflow), Share button, Download button
- Currently: basic toolbar exists but differs from design

#### 3c. Bottom Tool Bar (Drawing Tools)
- Floating horizontal bar with tool icons: Selection, Rectangle, Circle, Pentagon, Timeline, Text, Image, Pan
- Currently: Excalidraw provides its own toolbar — may need custom overlay or Excalidraw API customization

#### 3d. Zoom Controls
- Bottom-right floating: zoom out / percentage / zoom in / fullscreen toggle
- Currently: Excalidraw has built-in zoom — may expose custom UI

#### 3e. Scene Tab Bar Enhancements
- Already implemented but design shows: drag-to-reorder tabs, more visual polish
- Consider adding drag-and-drop reorder

---

## 4. Comments Panel — Enhanced Thread UI

**Designs:** `comments_panel/`, `comments_panel_light_mode/`
**Status:** Markup complete — tabs (Open/Resolved/All), threaded replies, like/resolve buttons, rich input toolbar all present. Backend needed for resolve workflow and nested replies.

### Missing features

#### 4a. Comment Tabs (Open / Resolved / All)
- Filter comments by resolution status
- Currently: all comments shown in a flat list

#### 4b. Comment Resolution Workflow
- "Resolve" button on each thread
- Resolved comments move to "Resolved" tab
- API: `PATCH /api/comments/:id/resolve`
- DB: `resolved boolean DEFAULT false` on comments table

#### 4c. Nested Replies / Threads
- Reply to specific comments (indented, bordered left)
- API: `parentId` field on comment creation
- DB: `parent_id` foreign key on comments table (self-reference)

#### 4d. Comment Reactions
- Like/heart button with count on each comment
- API: `POST /api/comments/:id/react`
- DB: `comment_reactions` table

#### 4e. Element-Linked Comments
- Badge showing "ON ELEMENT #42" linking comment to a specific canvas element
- Click to navigate/zoom to element
- Already have `elementId` support — need UI badge and navigation

#### 4f. Comment Input Enhancements
- Emoji picker button
- @mention support (search users)
- File attachment button

---

## 5. Share / Collaboration Modal — Enhanced

**Designs:** `share_collaboration_modal/`, `share_modal_light_mode/`
**Status:** Markup complete (`ShareModal.tsx`) — role selector, expiration picker, link preview with copy, active links list with revoke. Backend needed for link management API.

### Missing features

#### 5a. Role Selector for New Links
- Dropdown: Viewer, Editor, Commenter
- Currently: role is set but UI doesn't offer "Commenter" role
- API: support `commenter` role

#### 5b. Expiration Date Picker
- Date input when creating a share link
- API: `expiresAt` field on share link creation
- DB: `expires_at timestamp` on share_links table (may already exist)

#### 5c. Active Links Management
- List all active share links for a diagram
- Show: link type, status badge (Active/Expired), created date, metadata
- Delete/Revoke button per link
- Currently: basic link display exists — enhance UI to match design

#### 5d. Copy Link Button
- One-click copy to clipboard with confirmation feedback

---

## 6. User Settings — Additional Sections

**Designs:** `user_settings/`, `user_settings_light_mode/`
**Status:** Complete — Profile, Security (with danger zone), Billing (self-hosted placeholder), and Preferences (theme picker) tabs all implemented.

### Missing features

#### 6a. Billing Tab
- Design shows a "Billing" tab in settings navigation
- For self-hosted: may not apply, but could show instance plan / license info
- Decision: implement as placeholder or remove from nav

#### 6b. Account Deletion
- Danger zone "Delete Account" button exists in UI
- Backend: `DELETE /api/auth/account` endpoint
- Must confirm with password, cascade delete user data

---

## 7. Admin Panel — Additional Features

**Designs:** `admin_panel/`, `admin_panel_light_mode/`
**Status:** Markup complete — metric cards with decorative shapes, invite user button, enhanced table with toggle switches. Backend needed for invite flow, analytics, backup.

### Missing features

#### 7a. User Invite Flow
- "Invite User" button in admin header
- Modal: email input, role selector
- API: `POST /api/admin/invite` — sends invitation email
- DB: `invitations` table (email, role, token, expires_at, used)

#### 7b. Admin Search Bar
- Search bar in admin header for quick user/diagram search
- API: unified search endpoint

#### 7c. Notifications Icon
- Bell icon in admin header
- Notification system for admin events (new user registrations, etc.)
- Future feature — low priority

#### 7d. Analytics Section
- Sidebar shows "Analytics" nav item
- Charts: user growth, diagram creation over time, active sessions
- API: `GET /api/admin/analytics`
- Consider: chart library (recharts, chart.js)

#### 7e. Backup & Logs Section
- Sidebar shows "Backup & Logs" nav item
- Manual backup trigger, download database dump
- View recent system logs
- API: `POST /api/admin/backup`, `GET /api/admin/logs`

#### 7f. Export CSV
- "Export CSV" button on user management table
- Client-side CSV generation from user data

---

## 8. Guest Join — Enhanced

**Designs:** `guest_join/`, `guest_join_light_mode/`
**Status:** Complete — full design with session preview, live session badge, workspace label, branding footer, role badge, and terms text.

### Missing features

#### 8a. Session Preview Image
- Show actual diagram thumbnail in the preview card header
- Currently: gradient placeholder
- Requires: thumbnail URL in share link resolution API

#### 8b. Collaborator Count
- Show number of active collaborators in the session ("3 collaborators")
- Already have presence data — surface it in the join screen

---

## 9. Social Authentication (OAuth)

**Designs:** `login_register/`, `login_register_light_mode/`
**Status:** Markup complete — Google and Apple buttons visible on Login/Register pages. Backend OAuth flow not implemented.

### What to build (backend)
- "or" divider between social and email/password forms
- Backend: OAuth2 flow with passport.js or similar
  - `GET /api/auth/google` → redirect to Google
  - `GET /api/auth/google/callback` → handle token, create/link user
- DB: `oauth_providers` table or `google_id` / `apple_id` columns on users

### Priority: Medium — depends on deployment context (self-hosted may not need)

---

## 10. Forgot Password Flow

**Designs:** `login_register/` shows a "Forgot?" link on password field.
**Status:** "Forgot?" link markup present on Login page. Backend flow not implemented.

### What to build

- "Forgot password?" link on login page
- Route: `/forgot-password` — email input form
- Route: `/reset-password/:token` — new password form
- API: `POST /api/auth/forgot-password` → sends reset email
- API: `POST /api/auth/reset-password` → validates token, updates password
- DB: `password_reset_tokens` table (user_id, token, expires_at)
- Email: requires SMTP configuration

---

## Implementation Status

### Legend
- **Markup** = UI/HTML is in place but functionality is not wired (visual-only placeholder)
- **Done** = Fully functional
- **Backend** = Needs backend API/DB work to become functional

## Implementation Priority Order

| Priority | Feature | Status | Remaining Work |
|----------|---------|--------|----------------|
| P0 | ~~Dark/Light theme toggle~~ | **Done** | — |
| P0 | ~~Page redesigns (auth, settings, admin)~~ | **Done** | — |
| P0 | ~~Landing page~~ | **Markup** | Static content only, no conditional deploy features |
| P0 | ~~Social login buttons (Google/Apple)~~ | **Markup** | Backend: OAuth2 flow |
| P0 | ~~Share modal (role selector, expiry, links)~~ | **Markup** | Backend: link management API |
| P0 | ~~Comment tabs (Open/Resolved/All)~~ | **Markup** | Backend: `resolved` field on comments |
| P0 | ~~Comment threaded replies~~ | **Markup** | Backend: `parent_id` on comments |
| P0 | ~~Comment like/resolve buttons~~ | **Markup** | Backend: reactions + resolve API |
| P0 | ~~Starred / Favorite diagrams~~ | **Markup** | Backend: `starred` field + API |
| P0 | ~~Grid / List view toggle~~ | **Markup** | List view rendering (grid works) |
| P0 | ~~Category tags on diagram cards~~ | **Markup** | Backend: tags CRUD + assignment |
| P0 | ~~Admin invite user button~~ | **Markup** | Backend: invite API + email |
| P0 | ~~Billing tab in settings~~ | **Markup** | Placeholder (self-hosted = free) |
| P0 | ~~Guest join enhanced design~~ | **Done** | — |
| P1 | Comment resolution workflow | Backend | `PATCH /api/comments/:id/resolve`, DB migration |
| P1 | Nested comment replies | Backend | `parent_id` FK, API changes |
| P1 | Share link expiration | Backend | `expires_at` on share_links, validation |
| P1 | Share link revocation | Backend | `DELETE /api/share/:id` |
| P2 | Forgot password flow | Backend | Reset token table, SMTP, new routes |
| P2 | Diagram duplicate action | Backend | `POST /api/diagrams/:id/duplicate` |
| P2 | Board collapsible sidebar | Frontend | New component in Board page |
| P2 | Account deletion | Backend | `DELETE /api/auth/account`, cascade |
| P3 | Social OAuth (Google, Apple) | Backend | passport.js integration |
| P3 | Admin analytics dashboard | Full | Charts library + API |
| P3 | Admin backup & logs | Full | DB dump API + log viewer |
| P3 | Comment reactions (likes) | Backend | `comment_reactions` table |
| P3 | @mention in comments | Full | User search + notification |
| P3 | Export CSV from admin | Frontend | Client-side CSV generation |
| P3 | Board zoom controls custom UI | Frontend | Excalidraw API integration |
| P3 | Scene tab drag-to-reorder | Frontend | Drag-and-drop library |
