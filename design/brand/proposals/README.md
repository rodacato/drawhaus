# Drawhaus logo directions

Archive of nine explored symbols for a self-hosted collaborative whiteboard. **I · Looped d is the selected mark** (Adrian, 2026-10-14) and Ocean Ink is the selected palette; the [brand guide](../README.md) defines the identity.

`looped-d.svg` is **not** just history: `site/build-color-assets.mjs` and the logo comparison page read it as the live source of the selected mark. The other eight are the archive and feed only the comparison page.

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

**Decision:** I. The simple single d is the selected symbol. The original mint/green is not selected; the color studies are archived in [COLOR_DIRECTIONS.md](../COLOR_DIRECTIONS.md). The other marks remain an archive of the exploration.

G–I used the supplied Skynot image as a reference for fluid strokes, round terminals, and mint on charcoal. They use Drawhaus's letter cues rather than the reference's R. Each is one editable SVG path with one continuous stroke. Their color values remain exploratory.

Colors inside these SVGs are exploratory and are not application tokens.

## Preview

From the repository root:

```sh
bash site/build.sh
python3 -m http.server 8080 --directory site/_site
```

Open `http://localhost:8080/brand/logos/`. The page compares the marks at the same scale, shows light/dark lockup previews, and includes actual 16/24/32 px samples and SVG downloads. Its copy is English.

## Sources and exports

The nine SVGs in this directory are the editable symbol sources. [The site build](../../../site/build.sh) copies them into the comparison page and derives the display variants from the same geometry. For D–I it also generates monochrome variants. G–I provide a deeper green for light surfaces and mint for dark surfaces. Run the build after editing a source; never edit generated files in `site/_site/`.

The [comparison page](../../../site/brand/logos/index.html) uses the existing site's typography and palette. Its lowercase wordmarks and headline are proposals. Downloaded SVGs contain only the symbols; final outlined wordmarks, favicon files, and share images follow selection.
