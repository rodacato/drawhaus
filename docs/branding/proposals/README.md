# Drawhaus logo directions

Nine proposed symbols for a self-hosted collaborative whiteboard. No replacement identity has been selected.

| Candidate         | Idea                                                              | Main tradeoff                                                                   |
| ----------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| A · Open D        | Evolve the existing modular D into an open outline.               | Preserves recognition; does not directly communicate collaboration.             |
| B · Drawing House | Draw a home and continue the same line into its canvas.           | Closest to the name; the inner stroke must distinguish it from a property logo. |
| C · Shared Frame  | Two open frames face a common space.                              | Compact and abstract; may resemble crop or capture controls.                    |
| D · Canvas Stroke | An open canvas frame and a diagonal drawing stroke.               | Immediate connection to drawing; resembles a familiar edit icon.                |
| E · Modular D     | A bar and a curve assemble into a solid D.                        | Clear at small sizes; the name leads more than the activity.                    |
| F · Drawn dh      | The lowercase initials share a stem and one continuous line.      | Specific to Drawhaus; pair with the name at a first encounter.                  |
| G · Freehand dh   | F's initials become a bowed stem, an irregular bowl and a soft h. | Readable initials with a looser gesture; deliberately less geometric.           |
| H · Signature dh  | A slanted loop flows into an arched h.                            | The most expressive gesture; its crossing is denser at favicon size.            |
| I · Looped d      | One slanted d with an open loop.                                  | The simplest silhouette; deliberately drops the h.                              |

**Recommended direction after round three:** G. It keeps the d/h relationship that Adrian liked in F and loosens the stroke without losing the letter cues. H tests a more expressive signature; I tests the smallest, simplest mark. F remains the geometric baseline.

G–I use the supplied Skynot image as a reference for fluid strokes, round terminals, and mint on charcoal. They use Drawhaus's letter cues rather than the reference's R. Each is one editable SVG path with one continuous stroke. Their color values remain exploratory.

## Preview

From the repository root:

```sh
bash site/build.sh
python3 -m http.server 8080 --directory site/_site
```

Open `http://localhost:8080/brand/logos/`. The page compares the marks at the same scale, shows light/dark lockup previews, and includes actual 16/24/32 px samples and SVG downloads. Its copy is English.

## Sources and exports

The nine SVGs in this directory are the editable symbol sources. [The site build](../../../site/build.sh) copies them into the comparison page and derives the display variants from the same geometry. For D–I it also generates monochrome variants. G–I provide a deeper green for light surfaces and mint for dark surfaces. Run the build after editing a source; never edit generated files in `site/_site/`.

D–F add provisional color directions. Color values live in their SVG sources; they are not adopted application tokens. Each new mark is also shown in monochrome and at favicon size, so color is not required to recognize it.

The [comparison page](../../../site/brand/logos/index.html) uses the existing site's typography and palette. Its lowercase wordmarks and headline are proposals. Downloaded SVGs contain only the symbols; final outlined wordmarks, favicon files, and share images follow selection.

| Asset                  | Purpose                                                                                             |
| ---------------------- | --------------------------------------------------------------------------------------------------- |
| Symbol                 | Favicons, app icons, avatars, and compact navigation.                                               |
| Symbol + wordmark      | Introduce Drawhaus in app headers, marketing, and the README.                                       |
| Product share image    | Explain the product in link previews with the final identity and a real screenshot.                 |
| Shared diagram preview | Represent the specific document; keep its title, privacy, and permissions independent of marketing. |

## Integration after selection

1. Refine the chosen geometry and inspect monochrome/light/dark and small sizes. Keep its proportions; preserve the padding built into the SVG viewBox.
2. Generate final wordmarks, icons, and share assets from a canonical source rather than hand-editing copies. The current app assets are in `apps/frontend/public/branding/`; current docs assets are in `docs/branding/`.
3. Evolve the existing app token source, `apps/frontend/src/globals.css`, and arrange for the brand guide and marketing site to consume the same values. Document semantic roles rather than maintaining another token table by hand.
4. Put the final brand guide in the existing static site with English asset purposes and integration steps. The public marketing home already lives at `/drawhaus/`; this comparison is built at `/drawhaus/brand/logos/` when the site is deployed.
5. Align the README and product-site sharing metadata with the selected identity. Publish only after direct loads, downloads, mobile layout, and links pass.

This round adds the comparison without changing the app's identity or the marketing home. The full branding and marketing page remains dependent on the logo choice.

## Verification

The nine-logo comparison passed the site build, local-reference and SVG-geometry checks. Chromium rendered it from 320 to 1440 px without overflow; all 24 downloads worked. Monochrome 16/24/32 px samples, keyboard focus, 200% zoom, reduced motion, and contrast were checked. The freehand marks and their light/dark previews were inspected visually. VoiceOver was not tested. The page is a local proposal; it has not been published.
