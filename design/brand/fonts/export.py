from pathlib import Path
from urllib.request import urlopen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
import tempfile

revision = "67bc647ce1910e92f461bcc82aae30f21d21a9cc"
destination = Path(__file__).resolve().parent
out = Path(tempfile.mkdtemp(prefix="drawhaus-fonts-"))
files = {'Sora':'sora/Sora[wght].ttf','Inter':'inter/Inter[opsz,wght].ttf','JetBrainsMono':'jetbrainsmono/JetBrainsMono[wght].ttf'}
for name, file in files.items():
    base = f'https://raw.githubusercontent.com/google/fonts/{revision}/ofl/'
    raw = out / (name + '.ttf')
    raw.write_bytes(urlopen(base + file.replace('[','%5B').replace(']','%5D').replace(',','%2C')).read())
    font = TTFont(raw); font.flavor = 'woff2'; font.save(out / (name + '.woff2'))
    folder = file.split('/')[0]
    (out / (name + '-OFL.txt')).write_bytes(urlopen(base + folder + '/OFL.txt').read())
    if name == 'Sora':
        static = instantiateVariableFont(TTFont(raw), {'wght':600}, inplace=False)
        glyphs = static.getGlyphSet(); cmap = static.getBestCmap(); pen = SVGPathPen(glyphs)
        cursor = 0; size = 48 / static['head'].unitsPerEm
        for letter in 'Drawhaus':
            glyph = cmap[ord(letter)]
            glyphs[glyph].draw(TransformPen(pen, (size,0,0,-size,cursor,49)))
            cursor += static['hmtx'][glyph][0] * size
        (out / 'wordmark.svg').write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {cursor:.2f} 60"><title>Drawhaus wordmark — Sora 600</title><path fill="currentColor" d="{pen.getCommands()}"/></svg>\n')
for artifact in out.iterdir():
    if artifact.suffix == '.woff2' or artifact.name.endswith('-OFL.txt'):
        (destination / artifact.name).write_bytes(artifact.read_bytes())
(destination.parent / 'wordmark.svg').write_bytes((out / 'wordmark.svg').read_bytes())
print('FONT-EXPORTS-COMPLETE')
