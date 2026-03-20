import { parse as parseClassGrammar } from "./grammar/class.js";
import { parse as parseObjectGrammar } from "./grammar/object.js";
import { parse as parseUseCaseGrammar } from "./grammar/usecase.js";
import { parse as parseStateGrammar } from "./grammar/state.js";
import { parse as parseComponentGrammar } from "./grammar/component.js";
import type {
  DiagramAST,
  DiagramType,
} from "./types.js";
import { PlantUMLParseError, PlantUMLUnsupportedError } from "./types.js";

export { PlantUMLParseError, PlantUMLUnsupportedError } from "./types.js";
export type { DiagramAST, DiagramType } from "./types.js";

// ── Parser Registry ─────────────────────────────────────────────
//
// Each supported diagram type registers a parser function here.
// To add a new diagram type:
//   1. Create grammar/xxx.peggy + grammar/xxx.d.ts
//   2. Add a detection rule in DETECTION_RULES
//   3. Register the parser in PARSERS
//   4. Add the type to DiagramType in types.ts

type ParserFn = (code: string) => DiagramAST;

/** Registered parsers for supported diagram types. */
const PARSERS = new Map<DiagramType, ParserFn>([
  ["class", (code) => parseWithPeggy(parseClassGrammar, code)],
  ["object", (code) => parseWithPeggy(parseObjectGrammar, code)],
  ["usecase", (code) => parseWithPeggy(parseUseCaseGrammar, code)],
  ["state", (code) => parseWithPeggy(parseStateGrammar, code)],
  ["component", (code) => parseWithPeggy(parseComponentGrammar, code)],
]);

// ── Detection Rules ─────────────────────────────────────────────
//
// Ordered list of heuristic rules. First match wins.
// Each rule returns a DiagramType or null (no match).
// Rules are checked in order, so put more specific/unambiguous rules first.

interface DetectionRule {
  type: DiagramType;
  /** Returns true if the code matches this diagram type. */
  test: (stripped: string, lower: string) => boolean;
  /** Fallback types to try if the primary parser fails. */
  fallbacks: DiagramType[];
}

const DETECTION_RULES: DetectionRule[] = [
  // Use Case: unambiguous keyword
  {
    type: "usecase",
    test: (_s, lower) => lower.includes("usecase "),
    fallbacks: ["class"],
  },

  // State: explicit state keyword or [*] pseudo-state
  {
    type: "state",
    test: (stripped, lower) =>
      /^\s*state\s+/m.test(lower) ||
      stripped.includes("[*]"),
    fallbacks: ["class"],
  },

  // Component: bracket component syntax [Name] or component keyword or container keywords
  {
    type: "component",
    test: (stripped, lower) =>
      /\[[\w\s]+\]/.test(stripped) ||
      lower.includes("component ") ||
      (/^\s*(package|cloud|database|folder|frame)\s+/m.test(lower) &&
        stripped.includes("{")),
    fallbacks: ["class"],
  },

  // Sequence: participant declarations or message syntax (A -> B: msg)
  {
    type: "sequence",
    test: (stripped, lower) =>
      lower.includes("participant ") ||
      /^\s*\w+\s*->>?\s*\w+\s*:/m.test(stripped),
    fallbacks: [],
  },

  // Class: explicit keywords
  {
    type: "class",
    test: (_s, lower) =>
      lower.includes("class ") ||
      lower.includes("interface ") ||
      lower.includes("enum ") ||
      lower.includes("abstract "),
    fallbacks: ["object", "usecase"],
  },

  // Class (implicit): class-specific arrows or inline member syntax
  {
    type: "class",
    test: (stripped) => {
      const hasClassArrows =
        /(<\|--|--\|>|\.\.\|>|<\|\.\.|(\*--)|(-{2}\*)|o--|--o)/m.test(stripped);
      const hasInlineMembers = /^\s*\w+\s+:\s+\w+/m.test(stripped);
      return hasClassArrows || hasInlineMembers;
    },
    fallbacks: ["object", "usecase"],
  },

  // Object: line-start "object" or "map" keyword
  {
    type: "object",
    test: (_s, lower) =>
      /^\s*object\s+/m.test(lower) || /^\s*map\s+/m.test(lower),
    fallbacks: ["class"],
  },

  // Actor without sequence arrows → likely use case
  {
    type: "usecase",
    test: (_s, lower) => lower.includes("actor "),
    fallbacks: ["class"],
  },

  // Activity: action syntax (:text;), start/stop keywords
  {
    type: "activity",
    test: (stripped, lower) =>
      /^\s*:.*;\s*$/m.test(stripped) ||
      /^\s*start\s*$/m.test(lower) ||
      /^\s*stop\s*$/m.test(lower),
    fallbacks: [],
  },
];

// ── Public API ──────────────────────────────────────────────────

/**
 * Detect the diagram type from PlantUML source code.
 * Strips comments before checking keywords to avoid false positives.
 */
export function detectDiagramType(code: string): DiagramType {
  const stripped = stripComments(code);
  const lower = stripped.toLowerCase();

  for (const rule of DETECTION_RULES) {
    if (rule.test(stripped, lower)) {
      return rule.type;
    }
  }

  return "unknown";
}

/**
 * Parse PlantUML source code into a structured AST.
 *
 * Uses heuristic detection to pick the best parser, then falls back
 * to alternative parsers if the primary one fails. This handles
 * ambiguous cases where detection heuristics are wrong but a
 * different parser can still process the input.
 */
export function parsePlantUML(code: string): DiagramAST {
  const stripped = stripComments(code);
  const lower = stripped.toLowerCase();

  // Find the matching detection rule
  const matchedRule = DETECTION_RULES.find((r) => r.test(stripped, lower));

  if (!matchedRule) {
    throw new PlantUMLUnsupportedError("unknown");
  }

  // Build the ordered list of types to try: primary + fallbacks
  const typesToTry = [matchedRule.type, ...matchedRule.fallbacks];

  // Track the best error to throw if all parsers fail
  let bestError: Error | null = null;

  for (const type of typesToTry) {
    const parser = PARSERS.get(type);
    if (!parser) {
      // No parser for this type (e.g. sequence, activity) — skip or throw
      if (type === matchedRule.type) {
        throw new PlantUMLUnsupportedError(type);
      }
      continue;
    }

    try {
      return parser(code);
    } catch (err: unknown) {
      // Save the first error (from the primary parser) as the best diagnostic
      if (!bestError && err instanceof Error) {
        bestError = err;
      }
      // Continue to next fallback
    }
  }

  // All parsers failed — throw the primary parser's error
  throw bestError ?? new PlantUMLUnsupportedError(matchedRule.type);
}

// ── Helpers ──────────────────────────────────────────────────────

function parseWithPeggy(
  grammarParse: (input: string) => unknown,
  code: string,
): DiagramAST {
  try {
    return grammarParse(code) as DiagramAST;
  } catch (err: unknown) {
    if (isPeggyError(err)) {
      throw new PlantUMLParseError(
        err.message,
        err.location.start.line,
        err.location.start.column,
        err.expected?.map((e: { description: string }) => e.description) ?? [],
        err.found ?? null,
      );
    }
    throw err;
  }
}

function stripComments(code: string): string {
  return code
    .replace(/'[^\n]*/g, "") // single-line comments
    .replace(/\/'[\s\S]*?'\//g, ""); // block comments /' ... '/
}

interface PeggyError {
  message: string;
  location: { start: { line: number; column: number } };
  expected?: Array<{ description: string }>;
  found?: string;
}

function isPeggyError(err: unknown): err is PeggyError {
  return (
    err !== null &&
    typeof err === "object" &&
    "location" in err &&
    "message" in err
  );
}
