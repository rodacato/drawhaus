# Brand fonts

Sora, Inter and JetBrains Mono are served locally on the brand and marketing site. Their adjacent OFL files must travel with redistributed fonts. The selected logo's wordmark is outlined; application text uses live fonts and system fallbacks.

Sources are the corresponding family directories in [Google Fonts](https://github.com/google/fonts/tree/67bc647ce1910e92f461bcc82aae30f21d21a9cc/ofl). The export script uses that pinned revision, preserves the fonts without subsetting, and converts them to variable WOFF2. The wordmark uses Sora at weight 600.

Only font maintenance needs Python/fontTools. The normal site build uses the checked-in exports:

```sh
python3 -m venv /tmp/drawhaus-font-export
/tmp/drawhaus-font-export/bin/pip install 'fonttools[woff]==4.60.1'
/tmp/drawhaus-font-export/bin/python design/brand/fonts/export.py
```

The script downloads sources to a temporary directory and replaces the WOFF2 files, licenses and outlined wordmark. Afterwards regenerate brand assets and PNGs as described in [the source guide](../README.md). Keep generated fonts and licensing together when copying them into an app.
