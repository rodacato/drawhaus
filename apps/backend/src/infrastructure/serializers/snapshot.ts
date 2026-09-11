import type { DiagramSnapshot } from "../../domain/entities/diagram-snapshot";

export function formatSnapshot(s: DiagramSnapshot) {
  return {
    id: s.id,
    diagramId: s.diagramId,
    createdBy: s.createdBy,
    createdByName: s.createdByName,
    activeUsers: s.activeUsers,
    trigger: s.trigger,
    name: s.name,
    createdAt: s.createdAt.toISOString(),
  };
}

export function formatSnapshotFull(s: DiagramSnapshot) {
  return {
    ...formatSnapshot(s),
    elements: s.elements,
    appState: s.appState,
  };
}
