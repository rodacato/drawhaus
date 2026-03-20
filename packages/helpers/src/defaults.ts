export const DIAGRAM_STYLES = {
  dbSchema: {
    table: { backgroundColor: "#a5d8ff", strokeColor: "#1e1e1e" },
    column: { fontSize: 14, fontFamily: 3 as const },
    primaryKey: { strokeColor: "#e67700", backgroundColor: "#fff3bf" },
    foreignKey: { endArrowhead: "arrow" as const, strokeStyle: "solid" as const },
  },
  classDiagram: {
    class: { backgroundColor: "#e3f2fd", strokeStyle: "solid" as const },
    interface: { backgroundColor: "#e8f5e9", strokeStyle: "dashed" as const },
    enum: { backgroundColor: "#fff8e1", strokeStyle: "solid" as const },
    abstract: { backgroundColor: "#f3e5f5", strokeStyle: "solid" as const },
    inheritance: { endArrowhead: "triangle" as const, strokeStyle: "solid" as const },
    composition: { endArrowhead: "diamond" as const, strokeStyle: "solid" as const },
    aggregation: { endArrowhead: "diamond" as const, strokeStyle: "solid" as const },
    implementation: { endArrowhead: "triangle" as const, strokeStyle: "dashed" as const },
    association: { endArrowhead: "arrow" as const, strokeStyle: "solid" as const },
  },
  sequence: {
    participant: { backgroundColor: "#d0bfff" },
    lifeline: { strokeStyle: "dashed" as const, strokeColor: "#868e96" },
    message: { endArrowhead: "arrow" as const },
    response: { endArrowhead: "arrow" as const, strokeStyle: "dashed" as const, strokeColor: "#868e96" },
    activation: { backgroundColor: "#e3f2fd" },
  },
  architecture: {
    frontend: { backgroundColor: "#d3f9d8" },
    backend: { backgroundColor: "#a5d8ff" },
    database: { backgroundColor: "#ffec99" },
    external: { backgroundColor: "#ffd8a8" },
    queue: { backgroundColor: "#eebefa" },
    cache: { backgroundColor: "#ffc9c9" },
  },
} as const;

export type DiagramType = keyof typeof DIAGRAM_STYLES;
