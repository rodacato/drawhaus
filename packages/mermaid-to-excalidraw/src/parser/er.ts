/**
 * Regex-based parser for Mermaid Entity Relationship diagrams.
 *
 * Handles:
 *  - Entity declarations (bare and with attribute blocks)
 *  - Attributes with type, name, constraints (PK/FK/UK), optional comments
 *  - Relationships with crow's foot cardinality notation
 *  - Identifying (--) and non-identifying (..) relationship lines
 *  - Relationship labels
 *  - Hyphenated entity names (LINE-ITEM)
 */

import type {
  ERDiagramAST,
  EREntity,
  ERAttribute,
  ERRelation,
  Cardinality,
  RelationLineType,
} from "./er-types.js";

// ── Regex patterns ───────────────────────────────────────────────

// Relationship line:  ENTITY1 cardinality--cardinality ENTITY2 : label
// Cardinality markers: ||  |o  o|  }|  |{  }o  o{
const RELATION_RE =
  /^\s*([\w-]+)\s+([|o}]{1,2})(--|\.\.)([|o{]{1,2})\s+([\w-]+)\s*(?::\s*(.+))?\s*$/;

// Entity block start:  ENTITY {
const ENTITY_BLOCK_START_RE = /^\s*([\w-]+)\s*\{\s*$/;

// Attribute line:  type name [constraints] ["comment"]
const ATTRIBUTE_RE =
  /^\s+(\w+)\s+([\w-]+)(?:\s+((?:PK|FK|UK)(?:\s*,\s*(?:PK|FK|UK))*))?(?:\s+"([^"]*)")?\s*$/;

// Block end
const BLOCK_END_RE = /^\s*\}\s*$/;

// ── Parser ───────────────────────────────────────────────────────

export function parseMermaidERDiagram(definition: string): ERDiagramAST {
  const lines = definition.split("\n");
  const entityMap = new Map<string, EREntity>();
  const relations: ERRelation[] = [];

  function ensureEntity(name: string): EREntity {
    if (!entityMap.has(name)) {
      entityMap.set(name, { name, attributes: [] });
    }
    return entityMap.get(name)!;
  }

  // Skip header line
  let i = 0;
  for (; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (/^erDiagram\s*$/i.test(trimmed)) {
      i++;
      break;
    }
    if (trimmed !== "" && !trimmed.startsWith("%%")) {
      break;
    }
  }

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty / comments
    if (trimmed === "" || trimmed.startsWith("%%")) {
      i++;
      continue;
    }

    // Entity block start
    const blockMatch = trimmed.match(ENTITY_BLOCK_START_RE);
    if (blockMatch) {
      const entity = ensureEntity(blockMatch[1]);
      i++;

      // Parse attributes until closing brace
      while (i < lines.length) {
        const attrLine = lines[i];
        const attrTrimmed = attrLine.trim();

        if (BLOCK_END_RE.test(attrTrimmed)) {
          i++;
          break;
        }

        const attrMatch = attrLine.match(ATTRIBUTE_RE);
        if (attrMatch) {
          const constraints = attrMatch[3]
            ? attrMatch[3].split(/\s*,\s*/).map((c) => c.trim())
            : [];
          const attr: ERAttribute = {
            type: attrMatch[1],
            name: attrMatch[2],
            constraints,
          };
          if (attrMatch[4]) attr.comment = attrMatch[4];
          entity.attributes.push(attr);
        }

        i++;
      }
      continue;
    }

    // Relationship
    const relMatch = trimmed.match(RELATION_RE);
    if (relMatch) {
      const leftName = relMatch[1];
      const leftMarker = relMatch[2];
      const lineType = relMatch[3];
      const rightMarker = relMatch[4];
      const rightName = relMatch[5];
      const label = relMatch[6]?.trim();

      ensureEntity(leftName);
      ensureEntity(rightName);

      relations.push({
        left: leftName,
        right: rightName,
        leftCardinality: parseCardinality(leftMarker, "left"),
        rightCardinality: parseCardinality(rightMarker, "right"),
        lineType: lineType === ".." ? "nonIdentifying" : "identifying",
        ...(label ? { label } : {}),
      });

      i++;
      continue;
    }

    // Bare entity name (no block, no relationship)
    if (/^\s*([\w-]+)\s*$/.test(trimmed)) {
      ensureEntity(trimmed.trim());
      i++;
      continue;
    }

    i++;
  }

  return {
    entities: Array.from(entityMap.values()),
    relations,
  };
}

function parseCardinality(marker: string, side: "left" | "right"): Cardinality {
  // Left-side markers (before --/..):
  //   ||  = exactly one
  //   |o  = zero or one
  //   }|  = one or more
  //   }o  = zero or more
  //
  // Right-side markers (after --/..):
  //   ||  = exactly one
  //   o|  = zero or one
  //   |{  = one or more
  //   o{  = zero or more

  if (side === "left") {
    if (marker === "||") return "one";
    if (marker === "|o") return "zeroOrOne";
    if (marker === "}|") return "oneOrMore";
    if (marker === "}o") return "many";
    // Single char fallbacks
    if (marker === "|") return "one";
    if (marker === "}") return "many";
  } else {
    if (marker === "||") return "one";
    if (marker === "o|") return "zeroOrOne";
    if (marker === "|{") return "oneOrMore";
    if (marker === "o{") return "many";
    // Single char fallbacks
    if (marker === "|") return "one";
    if (marker === "{") return "many";
  }

  return "one";
}
