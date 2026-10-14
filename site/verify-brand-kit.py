"""Verify an extracted Drawhaus handoff and its ZIP against their manifest."""

from hashlib import sha256
from pathlib import Path
from zipfile import ZipFile
import json

root = Path(__file__).resolve().parent
manifest = json.loads((root / "manifest.json").read_text())
expected = manifest["files"]
for name, checksum in expected.items():
    path = root / name
    if not path.is_file():
        raise SystemExit(f"Missing file: {name}")
    if sha256(path.read_bytes()).hexdigest() != checksum:
        raise SystemExit(f"Changed file: {name}")

archive = root / "drawhaus-brand-kit.zip"
with ZipFile(archive) as bundle:
    prefix = "drawhaus-brand-kit/"
    names = {name.removeprefix(prefix) for name in bundle.namelist()}
    if names != set(expected) | {"manifest.json"}:
        raise SystemExit("ZIP contents do not match the manifest")
    for name in names:
        if bundle.read(prefix + name) != (root / name).read_bytes():
            raise SystemExit(f"ZIP file differs: {name}")
print(f"BRAND-KIT-VERIFIED ({len(expected)} files and matching ZIP)")
