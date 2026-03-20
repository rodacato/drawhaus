/** AST types for Mermaid Entity Relationship diagrams. */

export interface ERAttribute {
  type: string;
  name: string;
  constraints: string[];   // "PK", "FK", "UK"
  comment?: string;
}

export interface EREntity {
  name: string;
  attributes: ERAttribute[];
}

export type Cardinality = "one" | "zeroOrOne" | "many" | "oneOrMore";

export type RelationLineType = "identifying" | "nonIdentifying";

export interface ERRelation {
  left: string;
  right: string;
  leftCardinality: Cardinality;
  rightCardinality: Cardinality;
  lineType: RelationLineType;
  label?: string;
}

export interface ERDiagramAST {
  entities: EREntity[];
  relations: ERRelation[];
}
