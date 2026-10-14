# Drawhaus branding

The selected identity is **Looped d / Ocean Ink**. Its continuous lowercase d connects to drawing; cool paper, deep ink and solid blue actions keep the surrounding interface clear. The blue–teal gradient belongs to the identity, not permissions or status.

The complete English guide is [site/brand/index.html](../site/brand/index.html). It explains each asset, color role, typography, spacing, UI/sharing guidance and integration. The marketing home is [site/index.html](../site/index.html). Both are built by the existing Pages pipeline; a local build is not publication.

## Canonical sources

- [Logo geometry](branding/logo.svg) and [outlined wordmark](branding/wordmark.svg). Preserve geometry and the padded viewBox.
- [Existing token source](../apps/frontend/src/globals.css). Brand roles live there and the operational tokens resolve to them.
- [Licensed local fonts](branding/fonts/README.md). Sora for headings, Inter for reading/UI, JetBrains Mono for code.
- [Asset generator](../site/build-brand.mjs) and [PNG exporter](../site/export-brand-png.mjs). Generated CSS is consumed by the site; values are not maintained again in this document.

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

Open `/` for marketing or `/brand/` for the local guide. Before publishing, test the same output under the GitHub Pages project base `/drawhaus/`, including direct loads. The existing [Pages workflow](../.github/workflows/pages.yml) validates all local page/CSS references and checks that raster exports match their SVG/font sources.

Generated SVG/PNG assets in [branding/generated/](branding/generated/) are checked in for repository use. Derived CSS and font copies there are ignored; the build recreates them. The normal Pages build requires Node only, without a browser or a font toolchain.

## Application adoption

The app consumes the brand roles through its existing token source and theme root:

- [globals.css](../apps/frontend/src/globals.css) defines the brand roles. The operational tokens (`primary`, `surface`, `border`, `text-*`, `success`, `error`) resolve to them, and `:root.dark` remaps the roles once, so `ThemeContext` needed no change.
- Action backgrounds pair with `text-on-primary`, destructive ones with `text-on-danger`; the dark mapping makes those labels dark ink, so `text-white` on a brand background is a defect. `border-border-input` keeps form controls at 3:1 against their surface.
- [BrandLogo](../apps/frontend/src/components/BrandLogo.tsx) renders the light and dark mark and lets CSS pick by the theme root, so pages that temporarily force light (the landing page) stay correct.
- Logos, favicon and licensed fonts are served from `apps/frontend/public/brand/`. Regenerate them with `node site/sync-app-brand.mjs`; never edit them by hand.
- The admin style guide reads its swatches from the live CSS variables, so it cannot drift from the tokens.

Excalidraw content, collaborator colors, viewer/editor permissions and link expiry do not use the presentation palette and are unchanged. The guide's sharing samples are illustrative, not implemented dialogs.

The selected kit replaces the former modular identity on the marketing site and README. [Logo exploration](branding/proposals/README.md) and [color studies](branding/COLOR_DIRECTIONS.md) remain archived context, not additional token sources.

## Social preview and promotion

`og:image` and `twitter:image` (the app's `index.html` and the Pages home) point at the absolute URL `https://rodacato.github.io/drawhaus/brand/assets/social-card.png`, built from [social-card.svg](branding/generated/social-card.svg). Platforms cache previews; refresh after changing the image.

GitHub's repository social preview is an account setting and is **not** set by any commit. To update it manually: repository Settings → Social preview → Edit → Upload an image, and choose [social-card.png](branding/generated/social-card.png) (1200×630).

Product promotion and diagram sharing are different tasks. The card, the site and the README promote the product with its public outcome. Inviting someone to a diagram uses the app's share links, which show role and expiry; private diagram names, thumbnails and invitation URLs never appear in public marketing images or metadata.

## Export a portable kit

```sh
node site/export-brand-kit.mjs /path/to/a/new/brand-kit
```

This creates a complete site, selected assets/fonts/licenses, editable inputs, English instructions, a file-purpose index, checksums and a matching ZIP. Node and Python 3 are required. The exporter verifies the source build and refuses a nonempty destination. Its [handoff README template](branding/HANDOFF.template.md) explains app adoption, local preview, Pages and social use.

The generated folder ignores its contents in Git to avoid duplicating canonical files. Keep source changes on the branding branch and regenerate a fresh snapshot for each handoff.
