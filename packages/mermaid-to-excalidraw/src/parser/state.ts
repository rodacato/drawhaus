/**
 * Regex-based parser for Mermaid state diagrams (stateDiagram-v2).
 *
 * Handles:
 *  - Simple states, states with description (ID: desc)
 *  - state "Label" as id syntax
 *  - Special states: [*] (start/end), <<choice>>, <<fork>>, <<join>>
 *  - Transitions with optional labels (A --> B: label)
 *  - Composite/nested states (state Name { ... })
 *  - Direction declarations
 *  - Notes (note right/left of State ... end note)
 */

import type {
  StateDiagramAST,
  StateNode,
  StateTransition,
  StateNote,
  StateKind,
  Direction,
} from "./state-types.js";

// ── Regex patterns ───────────────────────────────────────────────

const DIRECTION_RE = /^\s*direction\s+(TB|BT|LR|RL)\s*$/i;
const TRANSITION_RE = /^\s*(\S+)\s*-->\s*(\S+?)(?:\s*:\s*(.+))?\s*$/;
const STATE_DESC_RE = /^\s*(\w+)\s*:\s*(.+)\s*$/;
const STATE_LABEL_RE = /^\s*state\s+"([^"]+)"\s+as\s+(\w+)\s*$/;
const STATE_PSEUDO_RE = /^\s*state\s+(\w+)\s+<<(choice|fork|join)>>\s*$/i;
const COMPOSITE_START_RE = /^\s*state\s+(?:"([^"]+)"\s+as\s+)?(\w+)\s*\{\s*$/;
const COMPOSITE_END_RE = /^\s*\}\s*$/;
const NOTE_START_RE = /^\s*note\s+(right|left)\s+of\s+(\S+)\s*$/i;
const NOTE_END_RE = /^\s*end\s+note\s*$/i;

// Start/end state counter for unique IDs
let pseudoCounter = 0;

// ── Parser ───────────────────────────────────────────────────────

export function parseMermaidStateDiagram(definition: string): StateDiagramAST {
  pseudoCounter = 0;
  const lines = definition.split("\n");

  // Skip header line
  let startIdx = 0;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (/^stateDiagram(?:-v2)?\s*$/i.test(trimmed)) {
      startIdx = i + 1;
      break;
    }
    if (trimmed !== "" && !trimmed.startsWith("%%")) {
      startIdx = i;
      break;
    }
  }

  const contentLines = lines.slice(startIdx);
  return parseBlock(contentLines);
}

function parseBlock(lines: string[]): StateDiagramAST {
  const stateMap = new Map<string, StateNode>();
  const transitions: StateTransition[] = [];
  const notes: StateNote[] = [];
  let direction: Direction = "TB";

  function ensureState(id: string): StateNode {
    if (id === "[*]") {
      // Don't store [*] in map — create unique instances per reference
      return { id, kind: "start" };
    }
    if (!stateMap.has(id)) {
      stateMap.set(id, { id, kind: "normal" });
    }
    return stateMap.get(id)!;
  }

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty / comments / style directives
    if (
      trimmed === "" ||
      trimmed.startsWith("%%") ||
      trimmed.startsWith("classDef") ||
      trimmed.startsWith("class ")
    ) {
      i++;
      continue;
    }

    // Strip inline ::: style annotations
    const cleanTrimmed = trimmed.replace(/:::\w+/g, "").trim();

    // Block end (return to parent)
    if (COMPOSITE_END_RE.test(cleanTrimmed)) {
      break;
    }

    // Concurrency separator
    if (cleanTrimmed === "--") {
      i++;
      continue;
    }

    // Direction
    const dirMatch = cleanTrimmed.match(DIRECTION_RE);
    if (dirMatch) {
      direction = dirMatch[1].toUpperCase() as Direction;
      i++;
      continue;
    }

    // Note block
    const noteMatch = cleanTrimmed.match(NOTE_START_RE);
    if (noteMatch) {
      const placement = noteMatch[1].toLowerCase() as "left" | "right";
      const stateId = noteMatch[2];
      ensureState(stateId);
      i++;
      const noteLines: string[] = [];
      while (i < lines.length) {
        if (NOTE_END_RE.test(lines[i].trim())) {
          i++;
          break;
        }
        noteLines.push(lines[i].trim());
        i++;
      }
      notes.push({
        stateId,
        placement,
        text: noteLines.join("\n"),
      });
      continue;
    }

    // State with pseudo-state annotation (<<choice>>, <<fork>>, <<join>>)
    const pseudoMatch = cleanTrimmed.match(STATE_PSEUDO_RE);
    if (pseudoMatch) {
      const id = pseudoMatch[1];
      const kind = pseudoMatch[2].toLowerCase() as StateKind;
      if (!stateMap.has(id)) {
        stateMap.set(id, { id, kind });
      } else {
        stateMap.get(id)!.kind = kind;
      }
      i++;
      continue;
    }

    // Composite state start
    const compositeMatch = cleanTrimmed.match(COMPOSITE_START_RE);
    if (compositeMatch) {
      const label = compositeMatch[1];
      const id = compositeMatch[2];
      i++;

      // Collect nested lines until closing brace
      const nestedLines: string[] = [];
      let depth = 1;
      while (i < lines.length && depth > 0) {
        const nl = lines[i].trim();
        if (/\{\s*$/.test(nl)) depth++;
        if (COMPOSITE_END_RE.test(nl)) depth--;
        if (depth > 0) nestedLines.push(lines[i]);
        i++;
      }

      const children = parseBlock(nestedLines);
      const state = ensureState(id);
      state.children = children;
      if (label) state.label = label;
      continue;
    }

    // State "Label" as id
    const labelMatch = cleanTrimmed.match(STATE_LABEL_RE);
    if (labelMatch) {
      const label = labelMatch[1];
      const id = labelMatch[2];
      const state = ensureState(id);
      state.label = label;
      i++;
      continue;
    }

    // Transition: A --> B or A --> B: label
    const transMatch = cleanTrimmed.match(TRANSITION_RE);
    if (transMatch) {
      const sourceRaw = transMatch[1].replace(/:::\w+/g, "");
      const targetRaw = transMatch[2].replace(/:::\w+/g, "");
      const label = transMatch[3]?.trim();

      // Handle [*] — determine if start or end
      let sourceId = sourceRaw;
      let targetId = targetRaw;

      if (sourceRaw === "[*]") {
        const id = `__start_${++pseudoCounter}`;
        stateMap.set(id, { id, kind: "start" });
        sourceId = id;
      } else {
        ensureState(sourceRaw);
      }

      if (targetRaw === "[*]") {
        const id = `__end_${++pseudoCounter}`;
        stateMap.set(id, { id, kind: "end" });
        targetId = id;
      } else {
        ensureState(targetRaw);
      }

      transitions.push({
        sourceId,
        targetId,
        ...(label ? { label } : {}),
      });
      i++;
      continue;
    }

    // State with description: ID: description
    const descMatch = cleanTrimmed.match(STATE_DESC_RE);
    if (descMatch) {
      const id = descMatch[1];
      const desc = descMatch[2].trim();
      const state = ensureState(id);
      state.description = desc;
      i++;
      continue;
    }

    // Bare state reference (single word on a line)
    if (/^\s*\w+\s*$/.test(cleanTrimmed)) {
      ensureState(cleanTrimmed.trim());
      i++;
      continue;
    }

    i++;
  }

  return {
    direction,
    states: Array.from(stateMap.values()),
    transitions,
    notes,
  };
}
