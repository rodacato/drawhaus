# Releasing a New Version

How to cut a new release of Drawhaus.

---

## Versioning

Drawhaus follows [Semantic Versioning](https://semver.org/):

- **MAJOR** (`X.0.0`) — breaking API or config changes
- **MINOR** (`0.X.0`) — new features, backward-compatible
- **PATCH** (`0.0.X`) — bug fixes only

---

## Files Involved

| File | What to update |
|------|----------------|
| `package.json` (root) | `"version": "X.Y.Z"` |
| `apps/backend/package.json` | `"version": "X.Y.Z"` |
| `apps/frontend/package.json` | `"version": "X.Y.Z"` |
| `CHANGELOG.md` | New version section with Added/Improved/Fixed/Removed |
| `ROADMAP.md` | Mark completed items as done (if applicable) |

---

## Release Checklist

### 1. Update version numbers

Bump the version in all three package files:

```bash
# Root
# package.json → "version": "X.Y.Z"

# Backend
# apps/backend/package.json → "version": "X.Y.Z"

# Frontend
# apps/frontend/package.json → "version": "X.Y.Z"
```

### 2. Update CHANGELOG.md

Add a new version section at the top (below the header):

```markdown
## vX.Y.Z — Short Description (YYYY-MM)

### Added
- **Feature name** — description

### Improved
- **Area** — what changed

### Removed
- **Feature name** — why it was removed

### Fixed
- **Bug description** — what was wrong and how it was fixed
```

**Naming convention for the version title:**
- Pick 2–3 headline features separated by `&` or `,`
- Example: `v0.10.0 — Snapshots, Editor Lock & Single-Scene (2026-03)`

### 3. Update ROADMAP.md

If any roadmap items were completed in this release, mark them as done.

### 4. Commit the release

Use the `release:` prefix for the commit message:

```bash
git add package.json apps/backend/package.json apps/frontend/package.json CHANGELOG.md ROADMAP.md
git commit -m "release: vX.Y.Z"
```

### 5. Create and push the tag

Tag the release commit (or a specific commit):

```bash
# Tag the current commit
git tag -a vX.Y.Z -m "vX.Y.Z — Short Description"

# Or tag a specific commit
git tag -a vX.Y.Z <commit-sha> -m "vX.Y.Z — Short Description"

# Push to remote
git push origin master --tags
```

### 6. Create GitHub Release

```bash
gh release create vX.Y.Z \
  --title "vX.Y.Z — Short Description" \
  --notes-from-tag
```

Or auto-generate notes from commits:

```bash
gh release create vX.Y.Z \
  --title "vX.Y.Z — Short Description" \
  --generate-notes
```

### 7. Deploy to production

Merge or push to the `production` branch to trigger the deploy workflow:

```bash
git checkout production
git merge master
git push origin production
```

The GitHub Actions workflow (`.github/workflows/build-push.yml`) will:
1. Build backend and frontend Docker images
2. Push to `ghcr.io/rodacato/drawhaus-backend` and `ghcr.io/rodacato/drawhaus-frontend`
3. Deploy both services via Kamal to the VPS

---

## Hotfix Releases

For urgent fixes on production:

```bash
# Branch from the release tag
git checkout -b hotfix/vX.Y.Z vX.Y.Z

# Make fixes, then bump patch version + update changelog
git commit -m "fix: description"
git commit -m "release: vX.Y.Z+1"
git tag -a vX.Y.Z+1 -m "vX.Y.Z+1"

# Merge back to production and master
git checkout production && git merge hotfix/vX.Y.Z
git push origin production --tags

git checkout master && git merge hotfix/vX.Y.Z
git push origin master
```

---

## Docker Image Tags

Each release produces these images:

| Image | Tags |
|-------|------|
| `ghcr.io/rodacato/drawhaus-backend` | `latest`, `<sha>` |
| `ghcr.io/rodacato/drawhaus-frontend` | `latest`, `<sha>` |

---

## Verify Release

After deploying:

```bash
# Health check
curl https://drawhaus-api.notdefined.dev/health

# Check version endpoint
curl https://drawhaus-api.notdefined.dev/api/version

# View running containers
kamal app details -c config/deploy.backend.yml
kamal app details -c config/deploy.frontend.yml
```
