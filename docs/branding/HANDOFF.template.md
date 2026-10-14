# Drawhaus brand kit — Looped d / Ocean Ink

This folder contains the approved identity and a ready-to-host marketing site. Start with the [file-purpose index](ASSETS.md), then follow the instructions below. These paths refer to the exported kit.

The package is a snapshot. [manifest.json](manifest.json) records its source revision and file checksums. Edit the original Drawhaus sources and export a new kit when the identity changes; do not maintain a second palette in this folder.

## What's here

| Folder         | Purpose                                                                                                                                         |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `assets/`      | Final light/dark, solid and monochrome logos; favicon, avatar, social card, CSS tokens and fonts with their licenses.                           |
| `site/`        | Complete static marketing home, English brand guide and archived logo/color explorations. Includes every local asset needed to serve the pages. |
| `sources/`     | Editable logo geometry, outlined lettering and a snapshot of the canonical token source.                                                        |
| `integration/` | The existing Drawhaus Pages workflow as a reference for the full repository.                                                                    |

`drawhaus-brand-kit.zip` contains the same package, under one `drawhaus-brand-kit/` folder. To inspect or send the kit, use that ZIP. To use it locally, the files are already extracted here.

## Preview the website

From this folder:

```sh
python3 -m http.server 8118 --bind 127.0.0.1 --directory site
```

Open `http://127.0.0.1:8118/` for marketing, or `/brand/` for the guide. Stop the server with Ctrl+C. Use an HTTP server rather than double-clicking HTML, so fonts and clipboard features work under normal browser rules.

The site requires no frontend build, npm install, database or application server. Keep its directory structure intact: the CSS, logo/font assets, screenshots and guide routes use relative paths.

## Use the identity assets

- **Horizontal logo:** website headers, README and document headers. Pick the light or dark surface variant. The wordmark is outlined and needs no installed font.
- **Standalone mark:** app navigation and compact signatures. Keep the full square viewBox and preserve its proportions.
- **Monochrome mark:** one-color print or documents. Use the solid blue mark when a gradient is unsuitable.
- **Stacked logo:** square covers or layouts with more vertical space. Use the wordmark alone where the mark already appears nearby.
- **Favicon:** use the supplied SVG and PNG. The avatar is for square profile images, not a replacement favicon.
- **Social PNG:** product announcements and link previews. The SVG is an editable layout source; live text in that social SVG needs the supplied fonts. Use the PNG when you need a consistent finished image.

The exact filenames and their roles are in [ASSETS.md](ASSETS.md). Use the same geometry in every context. Keep the gradient on the identity and solid colors on controls; text, permissions and states must stay readable without relying on color alone.

## Integrate with the application

First integrate the reviewed branding branch into the full Drawhaus repository. The app's existing operational theme was preserved when this kit was created; copying files alone does not change every screen.

1. Copy this kit's `assets/` directory into `apps/frontend/public/brand/`, including fonts and all OFL license files.
2. In `apps/frontend/index.html`, replace the Google Fonts stylesheet/preconnect links with locally served fonts. Add these references:

   ```html
   <link rel="stylesheet" href="/brand/fonts.css" />
   <link rel="stylesheet" href="/brand/tokens.css" />
   <link rel="icon" href="/brand/favicon.svg" type="image/svg+xml" />
   <link rel="icon" href="/brand/favicon.png" sizes="32x32" />
   ```

   Those root paths apply to the independently hosted Drawhaus app. The Pages site uses its own relative paths under `/drawhaus/`.

3. Update existing logo consumers, such as `BoardSidebar`, `DashboardSidebar` and `AppErrorFallback`, to use the supplied mark. Replace horizontal logo consumers with the corresponding horizontal export. Select dark/light logo variants from the app's actual theme.
4. Reuse the app's existing theme selector: port the aliases from `assets/tokens.css`'s `.theme-dark` mapping into the existing `:root.dark` rule in `globals.css`. This keeps the current `ThemeContext.tsx` behavior, including system-theme changes and pages that temporarily use the light theme. Preserve existing operational overrides while adapting components; no new theme provider is needed.
5. Adapt shared styles in `apps/frontend/src/lib/ui.ts` before individual screens. For example, a primary button can use:

   ```tsx
   const btnPrimary = "bg-brand-action text-brand-on-action hover:bg-brand-action-hover";
   ```

   Those utilities come from the brand roles in the existing `globals.css` theme. Pair the background with its on-action token: dark buttons use dark ink text, so keeping `text-white` everywhere will reduce contrast.

6. Adopt canvas/paper/ink/secondary/line roles in shared containers and text styles. Keep success, warning and destructive actions separate. Preserve Excalidraw content, collaborator colors, viewer/editor permissions and link expiry behavior.
7. Check sign-in, dashboard, editor shell, first-run and sharing in both themes, including keyboard focus, 320 px layout, empty/error states and contrast. Build required shared packages before the frontend checks, as the repository's CI does.

`assets/tokens.css` is the plain CSS export. `sources/globals.css` includes Tailwind and existing operational tokens; it is a source snapshot, not a drop-in standalone stylesheet. Once adopted, regenerate exports from the canonical source instead of editing copied hex values.

## Use the marketing site and GitHub Pages

For this repository, use the reviewed source under `site/` in the full Drawhaus checkout and its existing `.github/workflows/pages.yml`. [integration/pages.yml](integration/pages.yml) is a copy for reference; it expects the full repository and cannot build from this handoff alone.

```sh
bash site/build.sh
node site/check.mjs
```

The workflow builds and uploads `site/_site`, then deploys to the `github-pages` environment. Under repository Settings → Pages → Build and deployment, use **GitHub Actions** as the source. Review and merge the branding work through the normal PR flow; the workflow runs on relevant changes to master, or by manual dispatch. See [GitHub's custom workflow instructions](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

The intended product URL is `https://rodacato.github.io/drawhaus/`; the guide is `/drawhaus/brand/`. Test direct loads and refreshes under that project base path before publishing. The app continues to be hosted independently; Pages serves the marketing/reference site.

For another static host, upload the **contents** of this kit's `site/` folder. No build is needed. If the host or base path changes, update the canonical URL, `og:url`, `og:image`, `twitter:image` and the product sharing URL in `site/index.html` together. Keep image URLs absolute and accessible on the final public host.

A local preview is not publication. Confirm the Pages run succeeds and inspect the resulting public routes before announcing them.

## Social, repository and diagram sharing

Use `assets/social-card.png` for product link previews and announcement posts. The marketing home already includes Open Graph and Twitter image metadata. Replace its absolute URLs if you change the public host. Refresh a platform's cached preview after publishing a changed image.

Use `assets/avatar.png` for square repository/community profiles. In GitHub repository Settings → Social preview → Edit → Upload an image, select the social PNG when you choose to update the repository preview. See [GitHub's social preview instructions](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/customizing-your-repositorys-social-media-preview).

Use a horizontal/stacked SVG in the README. Keep its path relative to the repository and point at committed assets, not this ignored export folder. Introduce Drawhaus with its actual outcome: **Your whiteboard, on your server.** Explain self-hosting and credit Excalidraw.

For diagram invitations, use the app's existing share links and show the role and expiry. Product promotion and diagram sharing are different tasks. Keep private diagram names, thumbnails and invitation URLs out of public marketing cards.

## Fonts, edits and regeneration

The fonts are locally served variable WOFF2 files. Keep the adjacent OFL licenses when copying or redistributing them. [The source guide](https://github.com/rodacato/drawhaus/blob/master/docs/BRANDING.md) explains maintenance; the full online/local brand guide demonstrates typography and color roles.

In the full branding checkout, edit the mark/wordmark in `docs/branding/` and brand roles in `apps/frontend/src/globals.css`, then regenerate:

```sh
node site/build-brand.mjs
# PNG regeneration needs npm ci and npx playwright install chromium first.
node site/export-brand-png.mjs
bash site/build.sh
node site/check.mjs
node site/export-brand-kit.mjs /path/to/a/new/brand-kit
```

The exporter requires Node and Python 3, preserves the destination when it already contains files, and creates the ZIP automatically. Choose a new directory rather than overwriting a kit you have edited.

Run `python3 verify.py` from this folder to compare every exported file with the manifest and verify the ZIP contents. After intentionally editing this snapshot, its checksum verification will report the changed files; regenerate a fresh export from the source for a new verified handoff.
