/**
 * Parser for Mermaid classDiagram syntax → ClassDiagramAST.
 *
 * Handles:
 * - Class declarations with members (class Foo { ... })
 * - Stereotypes (<<interface>>, <<abstract>>, <<enumeration>>)
 * - Relationships with labels and cardinalities
 * - Inline member declarations (Foo : +method())
 * - Namespace blocks (parsed but flattened)
 */

import type {
  ClassDiagramAST,
  ClassEntity,
  ClassKind,
  ClassMember,
  ClassRelation,
  RelationType,
  Visibility,
} from "./types.js";

// ── Relationship patterns ─────────────────────────────────────

// Mermaid relationship arrows (left→right direction):
//   <|--  inheritance        --|>  inheritance (reverse)
//   *--   composition        --*   composition (reverse)
//   o--   aggregation        --o   aggregation (reverse)
//   -->   directed_assoc     <--   directed_assoc (reverse)
//   --    association
//   ..>   dependency         <..   dependency (reverse)
//   ..|>  implementation     <|..  implementation (reverse)

const ARROW_PATTERNS: Array<{ regex: RegExp; type: RelationType; reversed: boolean }> = [
  // Implementation (dotted + triangle)
  { regex: /\.\.\|>/, type: "implementation", reversed: false },
  { regex: /<\|\.\./,  type: "implementation", reversed: true },
  // Inheritance (solid + triangle)
  { regex: /<\|--/, type: "inheritance", reversed: true },
  { regex: /--\|>/, type: "inheritance", reversed: false },
  // Composition (solid + diamond filled)
  { regex: /\*--/,  type: "composition", reversed: true },
  { regex: /--\*/,  type: "composition", reversed: false },
  // Aggregation (solid + diamond open)
  { regex: /o--/,   type: "aggregation", reversed: true },
  { regex: /--o/,   type: "aggregation", reversed: false },
  // Dependency (dotted + arrow)
  { regex: /\.\.>/,  type: "dependency", reversed: false },
  { regex: /<\.\./,  type: "dependency", reversed: true },
  // Directed association (solid + arrow)
  { regex: /-->/,   type: "directed_association", reversed: false },
  { regex: /<--/,   type: "directed_association", reversed: true },
  // Association (plain solid)
  { regex: /--/,    type: "association", reversed: false },
  // Dotted association
  { regex: /\.\./,  type: "association", reversed: false },
];

// Build one big regex that captures: leftClass "card" arrow "card" rightClass : label
function buildRelationRegex(): RegExp {
  const arrowAlts = ARROW_PATTERNS.map((p) => p.regex.source).join("|");
  // Match: ClassName "cardinality"? <arrow> "cardinality"? ClassName : label?
  return new RegExp(
    `^\\s*(\\S+)\\s+` +                              // left class
    `(?:"([^"]*)"\\s+)?` +                            // optional left cardinality
    `(${arrowAlts})` +                                 // arrow
    `\\s+(?:"([^"]*)"\\s+)?` +                        // optional right cardinality
    `(\\S+)` +                                         // right class
    `(?:\\s*:\\s*(.+))?$`,                              // optional label
  );
}

const RELATION_RE = buildRelationRegex();

// ── Member parsing ────────────────────────────────────────────

function parseMember(line: string): ClassMember | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  let visibility: Visibility = "";
  let rest = trimmed;

  // Check for visibility prefix
  if (/^[+\-#~]/.test(rest)) {
    visibility = rest[0] as Visibility;
    rest = rest.slice(1);
  }

  const isStatic = rest.startsWith("$") || /\$\s*$/.test(rest);
  rest = rest.replace(/^\$\s*/, "").replace(/\s*\$$/, "");

  const isAbstract = rest.includes("*") && rest.endsWith("*");
  rest = rest.replace(/\*$/, "").trim();

  // Check if it's a method: has parentheses
  const methodMatch = rest.match(/^(\w+)\s*\(([^)]*)\)\s*(?:(\w+))?$/);
  if (methodMatch) {
    return {
      kind: "method",
      visibility,
      name: methodMatch[1],
      parameters: methodMatch[2] || null,
      type: methodMatch[3] || null,
      isStatic,
      isAbstract,
    };
  }

  // Attribute: Type name  OR  name Type
  // Mermaid uses: +Type name (type first, then name)
  const attrMatch = rest.match(/^(\S+)\s+(\S+)$/);
  if (attrMatch) {
    return {
      kind: "attribute",
      visibility,
      name: attrMatch[2],
      type: attrMatch[1],
      parameters: null,
      isStatic,
      isAbstract,
    };
  }

  // Simple name only
  return {
    kind: "attribute",
    visibility,
    name: rest,
    type: null,
    parameters: null,
    isStatic,
    isAbstract,
  };
}

// ── Inline member parsing (ClassName : member) ────────────────

function parseInlineMember(memberStr: string): ClassMember {
  return parseMember(memberStr) ?? {
    kind: "attribute",
    visibility: "",
    name: memberStr.trim(),
    type: null,
    parameters: null,
    isStatic: false,
    isAbstract: false,
  };
}

// ── Main parser ───────────────────────────────────────────────

export function parseMermaidClassDiagram(definition: string): ClassDiagramAST {
  const entities = new Map<string, ClassEntity>();
  const relations: ClassRelation[] = [];

  const lines = definition.split("\n");
  let i = 0;

  // Skip header line
  const firstLine = lines[0]?.trim();
  if (firstLine && /^classDiagram/i.test(firstLine)) {
    i = 1;
  }

  function getOrCreateEntity(name: string): ClassEntity {
    if (!entities.has(name)) {
      entities.set(name, {
        name,
        kind: "class",
        stereotype: null,
        members: [],
      });
    }
    return entities.get(name)!;
  }

  while (i < lines.length) {
    const line = lines[i].trim();
    i++;

    // Skip empty lines, comments, directives
    if (!line || line.startsWith("%%") || line.startsWith("direction")) continue;

    // Skip namespace blocks (just flatten contents)
    if (/^namespace\s+/.test(line)) {
      // Skip opening brace if on same line
      continue;
    }

    // Skip closing braces (from namespace or class blocks)
    if (line === "}") continue;

    // Class block: class ClassName { ... }
    const classBlockMatch = line.match(
      /^class\s+(\S+?)(?:\s*~([^~]+)~)?\s*\{?\s*$/,
    );
    if (classBlockMatch) {
      const entity = getOrCreateEntity(classBlockMatch[1]);

      // If there's an opening brace, read until closing brace
      if (line.includes("{")) {
        while (i < lines.length) {
          const memberLine = lines[i].trim();
          i++;
          if (memberLine === "}") break;
          if (!memberLine) continue;
          const member = parseMember(memberLine);
          if (member) entity.members.push(member);
        }
      }
      continue;
    }

    // Stereotype annotation: class ClassName
    // Followed by <<stereotype>> or on same line
    const classSimple = line.match(/^class\s+(\S+)\s*$/);
    if (classSimple) {
      getOrCreateEntity(classSimple[1]);
      continue;
    }

    // Annotation: <<interface>> ClassName  or  <<abstract>> ClassName
    const annotationMatch = line.match(
      /^<<(\w+)>>\s+(\S+)$/,
    );
    if (annotationMatch) {
      const entity = getOrCreateEntity(annotationMatch[2]);
      const annotation = annotationMatch[1].toLowerCase();
      if (annotation === "interface") entity.kind = "interface";
      else if (annotation === "abstract") entity.kind = "abstract_class";
      else if (annotation === "enumeration") entity.kind = "enumeration";
      else entity.stereotype = annotationMatch[1];
      continue;
    }

    // Relationship: A <|-- B : label
    const relMatch = line.match(RELATION_RE);
    if (relMatch) {
      const [, leftName, leftCard, arrow, rightCard, rightName, label] = relMatch;

      // Find which arrow pattern matched
      let relationType: RelationType = "association";
      let reversed = false;
      for (const pat of ARROW_PATTERNS) {
        if (pat.regex.test(arrow)) {
          relationType = pat.type;
          reversed = pat.reversed;
          break;
        }
      }

      const left = reversed ? rightName : leftName;
      const right = reversed ? leftName : rightName;

      getOrCreateEntity(leftName);
      getOrCreateEntity(rightName);

      relations.push({
        left,
        right,
        relationType,
        label: label?.trim() || null,
        leftCardinality: reversed ? rightCard || null : leftCard || null,
        rightCardinality: reversed ? leftCard || null : rightCard || null,
      });
      continue;
    }

    // Inline member: ClassName : +member
    const inlineMatch = line.match(/^(\S+)\s*:\s*(.+)$/);
    if (inlineMatch) {
      const entity = getOrCreateEntity(inlineMatch[1]);
      entity.members.push(parseInlineMember(inlineMatch[2]));
      continue;
    }
  }

  return {
    entities: Array.from(entities.values()),
    relations,
  };
}
