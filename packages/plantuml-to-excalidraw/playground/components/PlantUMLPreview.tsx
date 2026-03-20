import { useMemo, useState } from "react";
import pako from "pako";

interface PlantUMLPreviewProps {
  code: string;
}

// PlantUML uses a custom base64 alphabet for URL encoding
// See: https://plantuml.com/text-encoding
const PLANTUML_ALPHABET =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_";

function encode6bit(b: number): string {
  return PLANTUML_ALPHABET[b & 0x3f];
}

function append3bytes(b1: number, b2: number, b3: number): string {
  return (
    encode6bit(b1 >> 2) +
    encode6bit(((b1 & 0x3) << 4) | (b2 >> 4)) +
    encode6bit(((b2 & 0xf) << 2) | (b3 >> 6)) +
    encode6bit(b3)
  );
}

function encodePlantUML(text: string): string {
  const data = pako.deflateRaw(new TextEncoder().encode(text));
  let encoded = "";
  const len = data.length;

  for (let i = 0; i < len; i += 3) {
    if (i + 2 === len) {
      encoded += append3bytes(data[i], data[i + 1], 0);
    } else if (i + 1 === len) {
      encoded += append3bytes(data[i], 0, 0);
    } else {
      encoded += append3bytes(data[i], data[i + 1], data[i + 2]);
    }
  }

  return encoded;
}

const SERVER = "https://www.plantuml.com/plantuml/svg";

export function PlantUMLPreview({ code }: PlantUMLPreviewProps) {
  const [loadError, setLoadError] = useState(false);

  const url = useMemo(() => {
    const trimmed = code.trim();
    if (!trimmed) return null;
    try {
      return `${SERVER}/${encodePlantUML(trimmed)}`;
    } catch {
      return null;
    }
  }, [code]);

  if (!url) return null;

  return (
    <div className="plantuml-preview">
      <div className="plantuml-preview-header">PlantUML Reference</div>
      <div className="plantuml-preview-content">
        {loadError ? (
          <div className="plantuml-preview-error">
            Could not load PlantUML preview. Check your connection or diagram syntax.
          </div>
        ) : (
          <img
            src={url}
            alt="PlantUML server rendering"
            onError={() => setLoadError(true)}
            onLoad={() => setLoadError(false)}
          />
        )}
      </div>
    </div>
  );
}
