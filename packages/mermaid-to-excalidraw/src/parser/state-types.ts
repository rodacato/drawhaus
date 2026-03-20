/** AST types for Mermaid state diagrams. */

export type StateKind = "normal" | "start" | "end" | "choice" | "fork" | "join";

export interface StateNode {
  id: string;
  label?: string;
  description?: string;
  kind: StateKind;
  children?: StateDiagramAST;  // composite state
}

export interface StateTransition {
  sourceId: string;
  targetId: string;
  label?: string;
}

export interface StateNote {
  stateId: string;
  placement: "left" | "right";
  text: string;
}

export type Direction = "TB" | "BT" | "LR" | "RL";

export interface StateDiagramAST {
  direction: Direction;
  states: StateNode[];
  transitions: StateTransition[];
  notes: StateNote[];
}
