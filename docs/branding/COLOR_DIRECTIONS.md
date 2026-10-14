# Drawhaus color directions

**Selected symbol:** [I · Looped d](proposals/looped-d.svg). **Selected palette:** Ocean Ink (Adrian, 2026-10-14). The three directions share the same mark, typography, layout, and copy, so the comparison concerns color.

| Direction        | Why it fits                                                                                              | Tradeoff                                      |
| ---------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Architect Blue   | A restrained technical palette with a clear blue action color and navy structure.                        | Familiar and easy to apply; less distinctive. |
| Graphite & Amber | Warm paper, graphite ink, and a rich studio accent connect to drawing and making.                        | Amber needs separation from warning states.   |
| Ocean Ink        | Deep ink and blue actions keep the interface clear; a blue-to-teal mark adds a continuous color gesture. | The gradient needs SVG and a solid fallback.  |

**Decision:** Ocean Ink. Reserve the gradient for the mark and selected brand surfaces. Keep controls, permissions, and state indicators solid and labelled. Architect Blue is the simpler fallback if restraint takes priority. These are design judgements, not claims that a hue creates trust on its own.

## Preview and source

From the repo root, with Node available:

```sh
bash site/build.sh
python3 -m http.server 8080 --directory site/_site
```

Open `http://localhost:8080/brand/colors/`. GitHub Pages would serve this route under `/drawhaus/brand/colors/` after publication.

[palettes.css](../../site/brand/colors/palettes.css) is the single source for the proposed values. The page reads its labels from CSS; [the asset builder](../../site/build-color-assets.mjs) derives six light/dark SVGs from these colors and the selected mark. Change proposals there and rebuild. Never edit `site/_site/` exports.

## Final identity

This is the archived comparison. The selected roles now live in the existing [token source](../../apps/frontend/src/globals.css), with exports consumed by the marketing site and guide. See [the source guide](../BRANDING.md) for generation and application adoption. The operational app theme is preserved in this presentation-stage delivery.
