# Releasing

A release is an annotated `vX.Y.Z` tag on a commit that is already on `master`, with a GitHub
Release carrying its changelog section. Releasing and deploying are independent: tagging deploys
nothing, and deploying tags nothing. Deploys are in the
[deploy runbook](docs/guides/kamal-deploy.md#step-5-deploying).

---

## Versioning

Drawhaus follows [Semantic Versioning](https://semver.org/), with tags `vX.Y.Z` or `vX.Y.Z-rc.N`:

- **MAJOR** (`X.0.0`) — breaking API or config changes
- **MINOR** (`0.X.0`) — new features, backward-compatible
- **PATCH** (`0.0.X`) — bug fixes only

Only `v*` tags are releases.

**The version lives in the root `package.json`.** `apps/backend` and `apps/frontend` carry the same
number and move with it in the same command. The packages under `packages/` version on their own;
`@drawhaus/mcp` is published with the tag's version whatever its `package.json` says.

`CHANGELOG.md` follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Changes land under
`## [Unreleased]` as they merge; a release renames that section. Earlier sections keep their
original `## vX.Y.Z — Title (YYYY-MM)` headings, up to v0.12.0.

---

## 1. Bump the version and the changelog, by pull request

```bash
git fetch origin && git checkout -b release/vX.Y.Z origin/master --no-track
npm version X.Y.Z --no-git-tag-version --include-workspace-root --workspace=backend --workspace=frontend
```

In `CHANGELOG.md`, rename `## [Unreleased]` to `## [X.Y.Z] - YYYY-MM-DD` and add an empty
`## [Unreleased]` above it, separated by `---`. Then:

```bash
git commit -am "release: vX.Y.Z"
git push -u origin release/vX.Y.Z:release/vX.Y.Z
gh pr create --base master --title "release: vX.Y.Z"
```

Merge it once the checks pass, like any change.

## 2. Tag the merged commit

```bash
git fetch origin
sha=<the release pull request's merge commit>
git merge-base --is-ancestor "$sha" origin/master && git tag -a vX.Y.Z "$sha" -m "vX.Y.Z"
git push origin vX.Y.Z
```

Push only the tag. Never `git push origin master --tags`: it pushes straight to `master`, skipping the pull request,
and publishes every tag you have locally.

## 3. Publish the GitHub Release

```bash
v=X.Y.Z
awk -v h="## [$v]" 'index($0, h) == 1 { f = 1; next } /^## / { f = 0 } f && !/^---$/' CHANGELOG.md > "release-notes-$v.md"
gh release create "v$v" --verify-tag --title "v$v" --notes-file "release-notes-$v.md"
rm "release-notes-$v.md"
```

`--verify-tag` refuses to run when the tag is not on GitHub, instead of creating one on the
default branch's head.

---

## What a tag publishes

| Workflow          | On a `v*` tag                                                                          |
| ----------------- | -------------------------------------------------------------------------------------- |
| `publish-mcp.yml` | Builds `@drawhaus/mcp`, sets its version from the tag, publishes it to GitHub Packages |

No Docker image is tagged with the version. `kamal deploy` tags each image with the deployed
commit's SHA and `latest`, whether or not that commit is a release.

## Deploying a release

A separate step, done when you choose: promote `master` to `production` as the
[deploy runbook](docs/guides/kamal-deploy.md#step-5-deploying) describes. Production then runs
`master`'s head, which may already be past the tag.

## Hotfix

There are no hotfix branches and no path straight to `production`. The fix merges to `master` by
pull request, is released as a patch with the steps above, and is promoted like any deploy.

## Verify

```bash
gh release view vX.Y.Z
git ls-remote --tags origin vX.Y.Z
```
