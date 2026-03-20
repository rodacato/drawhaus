// ── AST Types ──────────────────────────────────────────────────

export type DiagramType = "class" | "object" | "usecase" | "state" | "component" | "deployment" | "sequence" | "mindmap" | "activity" | "unknown";

export type DiagramAST = ClassDiagramAST | ObjectDiagramAST | UseCaseDiagramAST | StateDiagramAST | ComponentDiagramAST | DeploymentDiagramAST | SequenceDiagramAST | MindmapDiagramAST | ActivityDiagramAST;

// ── Class Diagram ──────────────────────────────────────────────

export interface ClassDiagramAST {
  type: "class";
  entities: ClassEntity[];
  relations: ClassRelation[];
}

export interface ClassEntity {
  kind: "class" | "interface" | "enum" | "abstract_class";
  name: string;
  stereotype: string | null;
  members: ClassMember[];
}

export type ClassMember = ClassAttribute | ClassMethod | ClassEnumValue;

interface ClassMemberBase {
  name: string;
  visibility: "+" | "-" | "#" | "~" | null;
  isStatic: boolean;
  isAbstract: boolean;
}

export interface ClassAttribute extends ClassMemberBase {
  kind: "attribute";
  type: string | null;
}

export interface ClassMethod extends ClassMemberBase {
  kind: "method";
  type: string | null;
  parameters: string;
}

export interface ClassEnumValue {
  kind: "enum_value";
  name: string;
  visibility: null;
  type: null;
  isStatic: false;
  isAbstract: false;
}

export type ClassRelationType =
  | "inheritance"
  | "inheritance_reverse"
  | "implementation"
  | "implementation_reverse"
  | "composition"
  | "composition_reverse"
  | "aggregation"
  | "aggregation_reverse"
  | "directed_association"
  | "directed_association_reverse"
  | "dependency"
  | "association";

export interface ClassRelation {
  left: string;
  right: string;
  relationType: ClassRelationType;
  label: string | null;
  leftCardinality: string | null;
  rightCardinality: string | null;
}

// ── Object Diagram ──────────────────────────────────────────────

export interface ObjectDiagramAST {
  type: "object";
  entities: ObjectEntity[];
  relations: ObjectRelation[];
}

export interface ObjectEntity {
  kind: "object" | "map";
  name: string;
  instanceOf: string | null;
  fields: ObjectField[];
}

export interface ObjectField {
  key: string;
  value: string;
  separator: "=" | "=>";
}

export interface ObjectRelation {
  left: string;
  right: string;
  relationType: ClassRelationType;
  label: string | null;
}

// ── Use Case Diagram ────────────────────────────────────────────

export interface UseCaseDiagramAST {
  type: "usecase";
  actors: UseCaseActor[];
  useCases: UseCase[];
  boundaries: UseCaseBoundary[];
  relations: UseCaseRelation[];
  direction: "TB" | "LR";
}

export interface UseCaseActor {
  name: string;
  alias: string | null;
}

export interface UseCase {
  name: string;
  alias: string | null;
  boundary: string | null;
}

export interface UseCaseBoundary {
  name: string;
}

export type UseCaseRelationType =
  | "association"
  | "directed"
  | "include"
  | "extend"
  | "inheritance";

export interface UseCaseRelation {
  left: string;
  right: string;
  relationType: UseCaseRelationType;
  label: string | null;
  stereotype: string | null;
}

// ── Component Diagram ──────────────────────────────────────────

export interface ComponentDiagramAST {
  type: "component";
  components: ComponentNode[];
  containers: ComponentContainer[];
  interfaces: ComponentInterface[];
  relations: ComponentRelation[];
}

export interface ComponentNode {
  name: string;
  alias: string | null;
  container: string | null;
}

export type ContainerKind = "package" | "node" | "cloud" | "database" | "folder" | "frame" | "rectangle";

export interface ComponentContainer {
  kind: ContainerKind;
  name: string;
  children: ComponentNode[];
  childContainers: ComponentContainer[];
}

export interface ComponentInterface {
  name: string;
  alias: string | null;
}

export type ComponentRelationType =
  | "association"
  | "directed"
  | "dependency"
  | "provided"
  | "required";

export interface ComponentRelation {
  left: string;
  right: string;
  relationType: ComponentRelationType;
  label: string | null;
}

// ── Deployment Diagram ─────────────────────────────────────────

export interface DeploymentDiagramAST {
  type: "deployment";
  nodes: DeploymentNode[];
  relations: DeploymentRelation[];
}

export type DeploymentNodeKind =
  | "node" | "artifact" | "cloud" | "database" | "folder" | "frame"
  | "queue" | "stack" | "storage" | "card" | "agent" | "actor"
  | "component" | "package" | "rectangle" | "person";

export interface DeploymentNode {
  kind: DeploymentNodeKind;
  name: string;
  label: string | null;
  children: DeploymentNode[];
}

export interface DeploymentRelation {
  left: string;
  right: string;
  relationType: "association" | "directed" | "dependency";
  label: string | null;
}

// ── State Diagram ──────────────────────────────────────────────

export interface StateDiagramAST {
  type: "state";
  states: StateNode[];
  transitions: StateTransition[];
}

export type StateNode = SimpleState | CompositeState | PseudoState;

export interface SimpleState {
  kind: "simple";
  name: string;
  label: string | null;
  description: string | null;
}

export interface CompositeState {
  kind: "composite";
  name: string;
  label: string | null;
  children: StateNode[];
  transitions: StateTransition[];
}

export type PseudoStateKind = "start_end" | "fork" | "join" | "choice" | "history" | "deep_history";

export interface PseudoState {
  kind: "pseudo";
  pseudoKind: PseudoStateKind;
  name: string;
}

export interface StateTransition {
  from: string;
  to: string;
  label: string | null;
}

// ── Sequence Diagram (future) ──────────────────────────────────

export interface SequenceDiagramAST {
  type: "sequence";
  participants: SequenceParticipant[];
  messages: SequenceMessage[];
  notes: SequenceNote[];
}

export interface SequenceParticipant {
  name: string;
  alias: string | null;
  label: string | null;
  kind: "participant" | "actor" | "boundary" | "control" | "entity" | "database" | "collections" | "queue";
}

export interface SequenceMessage {
  from: string;
  to: string;
  label: string;
  arrowType: "sync" | "async" | "return";
}

export interface SequenceNote {
  text: string;
  position: "left" | "right" | "over";
  participant: string;
}

// ── Mindmap Diagram ──────────────────────────────────────────

export interface MindmapDiagramAST {
  type: "mindmap";
  root: MindmapNode | null;
}

export interface MindmapNode {
  level: number;
  label: string;
  side: "right" | "left";
  shape: "default";
  children: MindmapNode[];
}

// ── Activity Diagram (future) ──────────────────────────────────

export interface ActivityDiagramAST {
  type: "activity";
  nodes: ActivityNode[];
}

export type ActivityNode =
  | { kind: "start" }
  | { kind: "stop" }
  | { kind: "action"; label: string }
  | { kind: "if"; condition: string; thenBranch: ActivityNode[]; elseBranch?: ActivityNode[] }
  | { kind: "fork"; branches: ActivityNode[][] };

// ── Errors ─────────────────────────────────────────────────────

export class PlantUMLParseError extends Error {
  public readonly name = "PlantUMLParseError" as const;

  constructor(
    message: string,
    public readonly line: number,
    public readonly column: number,
    public readonly expected: string[],
    public readonly found: string | null,
  ) {
    super(message);
  }
}

export class PlantUMLUnsupportedError extends Error {
  public readonly name = "PlantUMLUnsupportedError" as const;

  constructor(public readonly diagramType: string) {
    super(`Unsupported diagram type: ${diagramType}`);
  }
}
