// ── Mermaid Class Diagram AST ──────────────────────────────────

export type Visibility = "+" | "-" | "#" | "~" | "";

export interface ClassMember {
  kind: "attribute" | "method" | "enum_value";
  visibility: Visibility;
  name: string;
  type: string | null;
  parameters: string | null;
  isStatic: boolean;
  isAbstract: boolean;
}

export type ClassKind = "class" | "abstract_class" | "interface" | "enumeration";

export interface ClassEntity {
  name: string;
  kind: ClassKind;
  /** Optional stereotype from <<...>> annotation */
  stereotype: string | null;
  members: ClassMember[];
}

export type RelationType =
  | "inheritance"
  | "composition"
  | "aggregation"
  | "association"
  | "directed_association"
  | "implementation"
  | "dependency";

export interface ClassRelation {
  left: string;
  right: string;
  relationType: RelationType;
  label: string | null;
  leftCardinality: string | null;
  rightCardinality: string | null;
}

export interface ClassDiagramAST {
  entities: ClassEntity[];
  relations: ClassRelation[];
}
