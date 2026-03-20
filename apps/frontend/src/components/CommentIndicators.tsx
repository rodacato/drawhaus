import { useEffect, useState } from "react";
import type { ExcalidrawApi, ExcalidrawElement } from "@/lib/types";

type CommentIndicatorsProps = {
  elementsWithComments: Map<string, number>;
  excalidrawApiRef: React.MutableRefObject<ExcalidrawApi | null>;
  onClickIndicator: (elementId: string) => void;
};

type IndicatorPos = { elementId: string; x: number; y: number; count: number };

export function CommentIndicators({
  elementsWithComments,
  excalidrawApiRef,
  onClickIndicator,
}: CommentIndicatorsProps) {
  const [indicators, setIndicators] = useState<IndicatorPos[]>([]);

  useEffect(() => {
    if (elementsWithComments.size === 0) {
      setIndicators([]);
      return;
    }

    function update() {
      const api = excalidrawApiRef.current;
      if (!api) return;

      const elements = api.getSceneElements() as ExcalidrawElement[];
      const appState = api.getAppState();
      const scrollX = (appState.scrollX as number) ?? 0;
      const scrollY = (appState.scrollY as number) ?? 0;
      const zoom = ((appState.zoom as { value: number })?.value) ?? 1;

      const positions: IndicatorPos[] = [];
      for (const el of elements) {
        const count = elementsWithComments.get(el.id);
        if (!count) continue;
        const x = ((el.x as number) + (el.width as number) + scrollX) * zoom;
        const y = ((el.y as number) + scrollY) * zoom;
        positions.push({ elementId: el.id, x, y, count });
      }
      setIndicators(positions);
    }

    update();
    const interval = setInterval(update, 200);
    return () => clearInterval(interval);
  }, [elementsWithComments, excalidrawApiRef]);

  if (indicators.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-10">
      {indicators.map(({ elementId, x, y, count }) => (
        <button
          key={elementId}
          className="pointer-events-auto absolute flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white shadow-sm transition hover:scale-110 hover:bg-blue-600"
          style={{ left: x - 2, top: y - 2, transform: "translate(-50%, -50%)" }}
          onClick={() => onClickIndicator(elementId)}
          title={`${count} comment${count > 1 ? "s" : ""}`}
        >
          {count}
        </button>
      ))}
    </div>
  );
}
