import { parse as parseClassGrammar } from "./grammar/class.js";
import type {
  ClassDiagramAST,
  DiagramAST,
  DiagramType,
} from "./types.js";
import { PlantUMLParseError, PlantUMLUnsupportedError } from "./types.js";

export { PlantUMLParseError, PlantUMLUnsupportedError } from "./types.js";
export type { DiagramAST, DiagramType } from "./types.js";

/**
 * Detect the diagram type from PlantUML source code.
 * Strips comments before checking keywords to avoid false positives.
 */
export function detectDiagramType(code: string): DiagramType {
  const stripped = stripComments(code);
  const lower = stripped.toLowerCase();

  // Sequence: participant/actor declarations or message syntax (A -> B: msg)
  if (
    lower.includes("participant ") ||
    lower.includes("actor ") ||
    /^\s*\w+\s*->>?\s*\w+\s*:/m.test(stripped)
  ) {
    return "sequence";
  }

  // Class: class/interface/enum declarations
  if (
    lower.includes("class ") ||
    lower.includes("interface ") ||
    lower.includes("enum ")
  ) {
    return "class";
  }

  // Activity: action syntax (:text;), start/stop keywords
  if (
    /^\s*:.*;\s*$/m.test(stripped) ||
    /^\s*start\s*$/m.test(lower) ||
    /^\s*stop\s*$/m.test(lower)
  ) {
    return "activity";
  }

  return "unknown";
}

/**
 * Parse PlantUML source code into a structured AST.
 *
 * Currently supports:
 * - Class diagrams (class, interface, enum, abstract class, relations)
 *
 * Future support planned for:
 * - Sequence diagrams
 * - Activity diagrams
 */
export function parsePlantUML(code: string): DiagramAST {
  const type = detectDiagramType(code);

  if (type === "unknown") {
    throw new PlantUMLUnsupportedError("unknown");
  }

  if (type === "sequence") {
    throw new PlantUMLUnsupportedError("sequence");
  }

  if (type === "activity") {
    throw new PlantUMLUnsupportedError("activity");
  }

  return parseClassDiagram(code);
}

function parseClassDiagram(code: string): ClassDiagramAST {
  try {
    return parseClassGrammar(code) as ClassDiagramAST;
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

// ── Helpers ──────────────────────────────────────────────────────

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
