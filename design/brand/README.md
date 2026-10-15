# Drawhaus brand

This directory is the brand **source**: the guide entry point, the editable logo and wordmark geometry, the licensed fonts and the generated assets. Everything the app and the site serve is a copy produced by a script (see [Asset map](#asset-map)); edit here, then regenerate.

The selected identity is **Looped d / Ocean Ink**. Its continuous lowercase d connects to drawing; cool paper, deep ink and solid blue actions keep the surrounding interface clear. The blue–teal gradient belongs to the identity, not permissions or status.

The complete English guide is [site/brand/index.html](../../site/brand/index.html). It explains each asset, color role, typography, spacing, UI/sharing guidance and integration. The marketing home is [site/index.html](../../site/index.html). Both are built by the existing Pages pipeline; a local build is not publication.

## Canonical sources

- [Logo geometry](logo.svg) and [outlined wordmark](wordmark.svg). Preserve geometry and the padded viewBox.
- [Existing token source](../../apps/frontend/src/globals.css). Brand roles live there and the operational tokens resolve to them.
- [Licensed local fonts](fonts/README.md). Sora for headings, Inter for reading/UI, JetBrains Mono for code.
- [Asset generator](../../site/build-brand.mjs) and [PNG exporter](../../site/export-brand-png.mjs). Generated CSS is consumed by the site; values are not maintained again in this document.

## Regenerate and preview

```sh
node site/build-brand.mjs
# For changes to the mark, wordmark, social layout, fonts or colors:
# npm ci && npx playwright install chromium
node site/export-brand-png.mjs
bash site/build.sh
node site/check.mjs
python3 -m http.server 8117 --directory site/_site
```

Open `/` for marketing or `/brand/` for the local guide. Before publishing, test the same output under the GitHub Pages project base `/drawhaus/`, including direct loads. The existing [Pages workflow](../../.github/workflows/site-pages.yml) validates all local page/CSS references and checks that raster exports match their SVG/font sources.

Generated SVG/PNG assets in [generated/](generated/) are checked in for repository use. Derived CSS and font copies there are ignored; the build recreates them. The normal Pages build requires Node only, without a browser or a font toolchain.

## Application adoption

The app consumes the brand roles through its existing token source and theme root:

- [globals.css](../../apps/frontend/src/globals.css) defines the brand roles. The operational tokens (`primary`, `surface`, `border`, `text-*`, `success`, `error`) resolve to them, and `:root.dark` remaps the roles once, so `ThemeContext` needed no change.
- Action backgrounds pair with `text-on-primary`, destructive ones with `text-on-danger`; the dark mapping makes those labels dark ink, so `text-white` on a brand background is a defect. `border-border-input` keeps form controls at 3:1 against their surface.
- [BrandLogo](../../apps/frontend/src/components/BrandLogo.tsx) renders the light and dark mark and lets CSS pick by the theme root, so pages that temporarily force light (the landing page) stay correct.
- Logos, favicon and licensed fonts are served from `apps/frontend/public/brand/`. Regenerate them with `node site/sync-app-brand.mjs`; never edit them by hand.
- The admin style guide reads its swatches from the live CSS variables, so it cannot drift from the tokens.

Excalidraw content, collaborator colors, viewer/editor permissions and link expiry do not use the presentation palette and are unchanged. The guide's sharing samples are illustrative, not implemented dialogs.

The selected kit replaces the former modular identity on the marketing site and README. [Logo exploration](proposals/README.md) and [color studies](COLOR_DIRECTIONS.md) remain archived context, not additional token sources.

## Voice and messaging

Drawhaus is a self-hosted collaborative diagramming tool built on Excalidraw, for developers and small teams. Speak plainly about the outcome, the setup and the responsibility of running it. The full section is "06 / Voice & sharing" in the [guide](../../site/brand/index.html#voice).

- **Primary message:** "Your whiteboard, on your server." Supporting line: draw together, keep diagrams organized, and share them with clear permissions; you run the instance and own its database.
- **Short description:** "Drawhaus is a self-hosted collaborative diagramming tool built on Excalidraw. Draw together, organize your diagrams, and share them with clear permissions."
- **Proof before promises:** credit Excalidraw, cite repository-backed capabilities and current screenshots; no invented customers, unmeasured setup times or blanket security/privacy claims.
- **Calls to action say what happens:** "Read the setup guide", "View source", "Copy link".

## Social preview and promotion

`og:image` and `twitter:image` (the app's `index.html` and the Pages home) point at the absolute URL `https://rodacato.github.io/drawhaus/brand/assets/social-card.png`, built from [social-card.svg](generated/social-card.svg). Platforms cache previews; refresh after changing the image.

GitHub's repository social preview is an account setting and is **not** set by any commit. To update it manually: repository Settings → Social preview → Edit → Upload an image, and choose [social-card.png](generated/social-card.png) (1200×630).

Product promotion and diagram sharing are different tasks. The card, the site and the README promote the product with its public outcome. Inviting someone to a diagram uses the app's share links, which show role and expiry; private diagram names, thumbnails and invitation URLs never appear in public marketing images or metadata.

## Assets

All files are in [generated/](generated/); pick the light or dark variant by the surface they sit on. Wordmarks are outlined, so no installed font is needed.

| Asset                               | Use                                                                                                                        |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `logo-horizontal-*.svg`             | Headers, README and documents.                                                                                             |
| `logo-stacked-*.svg`                | Square covers and taller layouts.                                                                                          |
| `mark-*.svg`                        | Compact navigation and signatures; keep the full square viewBox.                                                           |
| `mark-mono-*.svg`, `mark-solid.svg` | One-color print, or where a gradient is unsuitable.                                                                        |
| `wordmark-*.svg`                    | The name alone, when the mark already appears nearby.                                                                      |
| `favicon.svg`, `favicon.png`        | Browser tab icon.                                                                                                          |
| `avatar.svg`, `avatar.png`          | Square profile images; not a favicon replacement.                                                                          |
| `social-card.png`                   | Finished image for link previews and announcements. `social-card.svg` is the editable layout and needs the supplied fonts. |

Keep the gradient on the identity and solid colors on controls. Text, permissions and states must stay readable without relying on color alone.

## Asset map

Sources live here; every runtime copy is generated. Never edit a copy by hand.

| Source (this directory)                                   | Runtime copy                                                                         | Generated by                                                     |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| `logo.svg`, `wordmark.svg`, `fonts/`                      | `generated/*.svg`, `generated/tokens.css`, `generated/fonts.css`, `generated/fonts/` | `node site/build-brand.mjs` (CSS and font copies are gitignored) |
| `generated/*.svg`, `fonts/`                               | `generated/*.png`, `generated/raster-sources.json`                                   | `node site/export-brand-png.mjs` (needs Playwright Chromium)     |
| `generated/` (marks, logos, wordmarks, favicon, `fonts/`) | `apps/frontend/public/brand/` (served by the app)                                    | `node site/sync-app-brand.mjs`                                   |
| `generated/`, `proposals/*.svg`                           | `site/_site/brand/`, `site/_site/img/favicon.png` (Pages, gitignored)                | `bash site/build.sh`, verified by `node site/check.mjs`          |
| `proposals/looped-d.svg`                                  | `site/_site/brand/colors/assets/`                                                    | `node site/build-color-assets.mjs` (called by `site/build.sh`)   |
| `fonts/` (WOFF2, licenses) and `wordmark.svg`             | the same files, re-downloaded and re-outlined                                        | `fonts/export.py` (see [fonts/README.md](fonts/README.md))       |

The color roles are not duplicated here: [globals.css](../../apps/frontend/src/globals.css) is the token source, and `build-brand.mjs` derives `tokens.css` from it. The [Pages workflow](../../.github/workflows/site-pages.yml) rebuilds on changes to `design/brand/**`.

## Reuse in another project

There is no committed export: copy what you need from this directory. If a self-contained kit is ever needed, generate it into `design/brand/dist/`, which is gitignored.

- `generated/` for the assets above, with `fonts/` and its OFL licenses kept together; `generated/tokens.css` and `fonts.css` are the plain-CSS roles and `@font-face` rules (recreated by `node site/build-brand.mjs`).
- `logo.svg` and `wordmark.svg` as the editable geometry.
- `apps/frontend/src/globals.css` is the token source. It includes Tailwind and the app's operational tokens, so it is a reference, not a drop-in stylesheet. Port the `:root.dark` mapping to the host's own theme selector, and pair action backgrounds with their on-action token.
- [BrandLogo.tsx](../../apps/frontend/src/components/BrandLogo.tsx) is the component reference; if you port it, also port the `.brand-on-light` / `.brand-on-dark` visibility rules from `globals.css`.

Copied into a host's public `brand/` directory, the plain-CSS exports load like this (adapt the root paths to the host):

```html
<link rel="stylesheet" href="/brand/fonts.css" />
<link rel="stylesheet" href="/brand/tokens.css" />
<link rel="icon" href="/brand/favicon.svg" type="image/svg+xml" />
<link rel="icon" href="/brand/favicon.png" sizes="32x32" />
```

`tokens.css` ships a `.theme-dark` mapping; use it or map its aliases to the host's existing dark selector.

The marketing site is plain static files: upload the contents of `site/_site` after `bash site/build.sh` to any host. If the host or base path changes, update the canonical URL, `og:url`, `og:image`, `twitter:image` and the product sharing URL in `site/index.html` together, keeping image URLs absolute.
