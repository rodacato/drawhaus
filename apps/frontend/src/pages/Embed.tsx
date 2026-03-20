import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { shareApi } from "@/api/share";
import { ExcalidrawCanvas } from "@/components/ExcalidrawCanvas";

export function Embed() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<{ elements: unknown[]; appState: Record<string, unknown> } | null>(null);

  useEffect(() => {
    if (!token) return;
    shareApi.resolve(token).then((res) => {
      const d = res.diagram ?? res;
      setData({ elements: d.elements ?? [], appState: d.appState ?? d.app_state ?? {} });
    }).catch(() => {});
  }, [token]);

  if (!data) return <div className="flex h-screen items-center justify-center text-sm text-text-muted">Loading...</div>;

  return (
    <div className="h-screen w-screen">
      <ExcalidrawCanvas initialData={{ elements: data.elements, appState: { ...data.appState, viewBackgroundColor: "#ffffff" } }} viewModeEnabled={true} />
    </div>
  );
}
