import { parse as parseClassGrammar } from "./grammar/class.js";
import { parse as parseObjectGrammar } from "./grammar/object.js";
import { parse as parseUseCaseGrammar } from "./grammar/usecase.js";
import type {
  ClassDiagramAST,
  ObjectDiagramAST,
  UseCaseDiagramAST,
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

  // Use Case: unambiguous keyword
  if (lower.includes("usecase ")) {
    return "usecase";
  }

  // Sequence: participant declarations or message syntax (A -> B: msg)
  if (
    lower.includes("participant ") ||
    /^\s*\w+\s*->>?\s*\w+\s*:/m.test(stripped)
  ) {
    return "sequence";
  }

  // Object: object/map declarations
  if (lower.includes("object ") || lower.includes("map ")) {
    return "object";
  }

  // Class: class/interface/enum declarations
  if (
    lower.includes("class ") ||
    lower.includes("interface ") ||
    lower.includes("enum ")
  ) {
    return "class";
  }

  // Actor without sequence arrows → likely use case
  if (lower.includes("actor ")) {
    return "usecase";
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

  if (type === "object") {
    return parseObjectDiagram(code);
  }

  if (type === "usecase") {
    return parseUseCaseDiagram(code);
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

function parseObjectDiagram(code: string): ObjectDiagramAST {
  try {
    return parseObjectGrammar(code) as ObjectDiagramAST;
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

function parseUseCaseDiagram(code: string): UseCaseDiagramAST {
  try {
    return parseUseCaseGrammar(code) as UseCaseDiagramAST;
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
