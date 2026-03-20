/** AST types for Mermaid sequence diagrams. */

export interface SequenceParticipant {
  id: string;
  alias?: string;
  type: "participant" | "actor";
}

export type MessageStyle = "solid" | "dashed";
export type ArrowType = "arrow" | "open" | "cross";

export interface SequenceMessage {
  kind: "message";
  from: string;
  to: string;
  text: string;
  style: MessageStyle;
  arrowType: ArrowType;
  activateTarget?: boolean;
  deactivateSource?: boolean;
}

export interface SequenceNote {
  kind: "note";
  text: string;
  placement: "over" | "rightOf" | "leftOf";
  participants: string[];
}

export type BlockType = "alt" | "loop" | "opt" | "par" | "critical" | "break";

export interface SequenceBlock {
  kind: "block";
  type: BlockType;
  label: string;
  sections: SequenceBlockSection[];
}

export interface SequenceBlockSection {
  label: string;
  items: SequenceItem[];
}

export type SequenceItem = SequenceMessage | SequenceNote | SequenceBlock;

export interface SequenceDiagramAST {
  participants: SequenceParticipant[];
  items: SequenceItem[];
}
