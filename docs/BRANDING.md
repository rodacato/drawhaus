# Drawhaus branding

The selected identity is **Looped d / Ocean Ink**. Its continuous lowercase d connects to drawing; cool paper, deep ink and solid blue actions keep the surrounding interface clear. The blue–teal gradient belongs to the identity, not permissions or status.

The complete English guide is [site/brand/index.html](../site/brand/index.html). It explains each asset, color role, typography, spacing, UI/sharing guidance and integration. The marketing home is [site/index.html](../site/index.html). Both are built by the existing Pages pipeline; a local build is not publication.

## Canonical sources

- [Logo geometry](branding/logo.svg) and [outlined wordmark](branding/wordmark.svg). Preserve geometry and the padded viewBox.
- [Existing token source](../apps/frontend/src/globals.css). Brand presentation roles are added there; the operational app theme remains unchanged until application adoption.
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

Use the guide's integration example to map shared UI classes to the brand roles. Copy the corresponding logo exports into the existing public asset locations, serve the local fonts with their licenses, and apply the generated dark mapping on the existing theme root. Always pair action backgrounds with their on-action token; light and dark buttons require different label colors.

Check sign-in, dashboard, editor shell and sharing in both themes before adopting globally. Keep Excalidraw content, collaborator colors, permissions and diagram link behavior independent of the presentation palette. The guide's sharing samples are explicitly illustrative, not implemented replacement dialogs.

The selected kit replaces the former modular identity on the marketing site and README. [Logo exploration](branding/proposals/README.md) and [color studies](branding/COLOR_DIRECTIONS.md) remain archived context, not additional token sources.

## Export a portable kit

```sh
node site/export-brand-kit.mjs /path/to/a/new/brand-kit
```

This creates a complete site, selected assets/fonts/licenses, editable inputs, English instructions, a file-purpose index, checksums and a matching ZIP. Node and Python 3 are required. The exporter verifies the source build and refuses a nonempty destination. Its [handoff README template](branding/HANDOFF.template.md) explains app adoption, local preview, Pages and social use.

The generated folder ignores its contents in Git to avoid duplicating canonical files. Keep source changes on the branding branch and regenerate a fresh snapshot for each handoff.
