# Drawhaus — Design-to-Code Stitch Roadmap

This document tracks features visible in the design mockups (`docs/designs/`) that are not yet implemented or need enhancement. Each section maps to a design screen and describes **what** needs to be built and **how** it should work.

---

## 1. Landing Page (Public Marketing)

**Designs:** `landing_page/`, `landing_page_light_mode/`
**Status:** Not implemented — no public landing page exists.

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
**Status:** Partially implemented — sidebar nav and diagram grid exist but lack several design features.

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
**Status:** Basic comments panel exists. Missing several features.

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
**Status:** Share links work. Modal UI needs enhancement.

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
**Status:** Redesigned with tabs. Some sections placeholder-only.

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
**Status:** Redesigned with metric cards and table. Some features missing.

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
**Status:** Redesigned with session preview card. Minor enhancements possible.

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
**Status:** Not implemented.

### What to build

- Google OAuth button ("Continue with Google")
- Apple OAuth button ("Continue with Apple")
- "or" divider between social and email/password forms
- Backend: OAuth2 flow with passport.js or similar
  - `GET /api/auth/google` → redirect to Google
  - `GET /api/auth/google/callback` → handle token, create/link user
- DB: `oauth_providers` table or `google_id` / `apple_id` columns on users

### Priority: Medium — depends on deployment context (self-hosted may not need)

---

## 10. Forgot Password Flow

**Designs:** `login_register/` shows a "Forgot?" link on password field.
**Status:** Not implemented.

### What to build

- "Forgot password?" link on login page
- Route: `/forgot-password` — email input form
- Route: `/reset-password/:token` — new password form
- API: `POST /api/auth/forgot-password` → sends reset email
- API: `POST /api/auth/reset-password` → validates token, updates password
- DB: `password_reset_tokens` table (user_id, token, expires_at)
- Email: requires SMTP configuration

---

## Implementation Priority Order

| Priority | Feature | Effort | Impact |
|----------|---------|--------|--------|
| P0 | ~~Dark/Light theme toggle~~ | Done | High |
| P0 | ~~Page redesigns (auth, settings, admin)~~ | Done | High |
| P1 | Comment resolution + tabs (Open/Resolved) | Medium | High |
| P1 | Nested comment replies / threads | Medium | High |
| P1 | Share modal enhanced UI (role selector, expiry, link management) | Medium | High |
| P1 | Starred / Favorite diagrams | Small | Medium |
| P1 | Grid / List view toggle | Small | Medium |
| P2 | Landing page (public marketing) | Large | High |
| P2 | Forgot password flow | Medium | Medium |
| P2 | Diagram duplicate action | Small | Medium |
| P2 | Category tags on diagrams | Medium | Medium |
| P2 | Board collapsible sidebar | Medium | Medium |
| P2 | Account deletion (backend + UI) | Small | Medium |
| P3 | Social OAuth (Google, Apple) | Large | Medium |
| P3 | Admin invite user flow | Medium | Medium |
| P3 | Admin analytics dashboard | Large | Low |
| P3 | Admin backup & logs | Large | Low |
| P3 | Comment reactions (likes) | Small | Low |
| P3 | @mention in comments | Medium | Low |
| P3 | Export CSV from admin | Small | Low |
| P3 | Board zoom controls custom UI | Small | Low |
| P3 | Scene tab drag-to-reorder | Medium | Low |
