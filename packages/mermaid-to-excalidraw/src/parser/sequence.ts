/**
 * Regex-based parser for Mermaid sequence diagrams.
 *
 * Handles:
 *  - participant / actor declarations (with optional alias)
 *  - Messages: solid (->>, ->, ->>+, ->>-), dashed (-->>, -->, -->>+, -->>-),
 *    open arrow (-)), cross (-x)
 *  - Notes: over, right of, left of (single or dual participants)
 *  - Control blocks: alt/else, loop, opt, par/and, critical/break
 *  - Implicit participant creation from messages
 */

import type {
  SequenceDiagramAST,
  SequenceParticipant,
  SequenceMessage,
  SequenceNote,
  SequenceBlock,
  SequenceBlockSection,
  SequenceItem,
  MessageStyle,
  ArrowType,
  BlockType,
} from "./sequence-types.js";

// ── Regex patterns ───────────────────────────────────────────────

// participant/actor declarations
const PARTICIPANT_RE = /^\s*(participant|actor)\s+(\S+?)(?:\s+as\s+(.+))?\s*$/i;

// Message patterns — order matters (longest match first)
// Activation/deactivation suffixes: + or - after arrow
const MESSAGE_RE =
  /^\s*(\S+?)\s*(--?>>?|--?>|--?x|-\))\s*([+-])?\s*(\S+?)\s*:\s*(.+)\s*$/i;

// Note patterns
const NOTE_OVER_RE = /^\s*Note\s+over\s+(\S+?)(?:\s*,\s*(\S+?))?\s*:\s*(.+)\s*$/i;
const NOTE_SIDE_RE = /^\s*Note\s+(right|left)\s+of\s+(\S+?)\s*:\s*(.+)\s*$/i;

// Block control patterns
const BLOCK_START_RE = /^\s*(alt|loop|opt|par|critical|break)\s*(.*)\s*$/i;
const BLOCK_SECTION_RE = /^\s*(else|and)\s*(.*)\s*$/i;
const BLOCK_END_RE = /^\s*end\s*$/i;

// Activate/deactivate standalone
const ACTIVATE_RE = /^\s*activate\s+(\S+)\s*$/i;
const DEACTIVATE_RE = /^\s*deactivate\s+(\S+)\s*$/i;

// ── Parser ───────────────────────────────────────────────────────

export function parseMermaidSequence(definition: string): SequenceDiagramAST {
  const lines = definition.split("\n");
  const participants: SequenceParticipant[] = [];
  const participantSet = new Set<string>();

  function ensureParticipant(id: string) {
    if (!participantSet.has(id)) {
      participantSet.add(id);
      participants.push({ id, type: "participant" });
    }
  }

  // Skip first line (sequenceDiagram header)
  let startIdx = 0;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (/^sequenceDiagram\s*$/i.test(trimmed)) {
      startIdx = i + 1;
      break;
    }
    if (trimmed !== "" && !trimmed.startsWith("%%")) {
      startIdx = i;
      break;
    }
  }

  const contentLines = lines.slice(startIdx);
  const items = parseLines(contentLines, participants, participantSet, ensureParticipant);

  return { participants, items };
}

function parseLines(
  lines: string[],
  participants: SequenceParticipant[],
  participantSet: Set<string>,
  ensureParticipant: (id: string) => void,
): SequenceItem[] {
  const items: SequenceItem[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty / comments
    if (trimmed === "" || trimmed.startsWith("%%")) {
      i++;
      continue;
    }

    // Skip title
    if (/^\s*title\s+/i.test(trimmed)) {
      i++;
      continue;
    }

    // End of block (return to caller)
    if (BLOCK_END_RE.test(trimmed)) {
      break;
    }

    // Else/And (return to caller — block section boundary)
    if (BLOCK_SECTION_RE.test(trimmed)) {
      break;
    }

    // Participant / actor declaration
    const partMatch = trimmed.match(PARTICIPANT_RE);
    if (partMatch) {
      const type = partMatch[1].toLowerCase() as "participant" | "actor";
      const id = partMatch[2];
      const alias = partMatch[3]?.trim();
      if (!participantSet.has(id)) {
        participantSet.add(id);
        participants.push({ id, alias, type });
      } else {
        // Update alias if redeclared
        const existing = participants.find((p) => p.id === id);
        if (existing && alias) {
          existing.alias = alias;
          existing.type = type;
        }
      }
      i++;
      continue;
    }

    // Activate / deactivate standalone (skip, we track via +/- on messages)
    if (ACTIVATE_RE.test(trimmed) || DEACTIVATE_RE.test(trimmed)) {
      i++;
      continue;
    }

    // Block start (alt, loop, opt, par, critical, break)
    const blockMatch = trimmed.match(BLOCK_START_RE);
    if (blockMatch) {
      const blockType = blockMatch[1].toLowerCase() as BlockType;
      const label = blockMatch[2]?.trim() || "";
      const block = parseBlock(blockType, label, lines, i + 1, participants, participantSet, ensureParticipant);
      items.push(block.block);
      i = block.nextLine;
      continue;
    }

    // Note over
    const noteOverMatch = trimmed.match(NOTE_OVER_RE);
    if (noteOverMatch) {
      const p1 = noteOverMatch[1];
      const p2 = noteOverMatch[2];
      ensureParticipant(p1);
      if (p2) ensureParticipant(p2);
      items.push({
        kind: "note",
        text: noteOverMatch[3].trim(),
        placement: "over",
        participants: p2 ? [p1, p2] : [p1],
      });
      i++;
      continue;
    }

    // Note right/left of
    const noteSideMatch = trimmed.match(NOTE_SIDE_RE);
    if (noteSideMatch) {
      const side = noteSideMatch[1].toLowerCase();
      const pid = noteSideMatch[2];
      ensureParticipant(pid);
      items.push({
        kind: "note",
        text: noteSideMatch[3].trim(),
        placement: side === "right" ? "rightOf" : "leftOf",
        participants: [pid],
      });
      i++;
      continue;
    }

    // Message
    const msgMatch = trimmed.match(MESSAGE_RE);
    if (msgMatch) {
      const from = msgMatch[1];
      const arrowStr = msgMatch[2];
      const modifier = msgMatch[3]; // + or -
      const to = msgMatch[4];
      const text = msgMatch[5].trim();

      ensureParticipant(from);
      ensureParticipant(to);

      const { style, arrowType } = parseArrow(arrowStr);

      const msg: SequenceMessage = {
        kind: "message",
        from,
        to,
        text,
        style,
        arrowType,
      };

      if (modifier === "+") msg.activateTarget = true;
      if (modifier === "-") msg.deactivateSource = true;

      items.push(msg);
      i++;
      continue;
    }

    // Unknown line — skip
    i++;
  }

  return items;
}

function parseBlock(
  type: BlockType,
  label: string,
  lines: string[],
  startLine: number,
  participants: SequenceParticipant[],
  participantSet: Set<string>,
  ensureParticipant: (id: string) => void,
): { block: SequenceBlock; nextLine: number } {
  const sections: SequenceBlockSection[] = [];
  let currentLabel = label;
  let i = startLine;

  while (i < lines.length) {
    const sectionItems = parseLines(
      lines.slice(i),
      participants,
      participantSet,
      ensureParticipant,
    );

    // How many lines did we consume?
    let consumed = 0;
    let remaining = lines.slice(i);
    for (let j = 0; j < remaining.length; j++) {
      const trimmed = remaining[j].trim();
      if (trimmed === "" || trimmed.startsWith("%%")) {
        consumed++;
        continue;
      }
      if (/^\s*title\s+/i.test(trimmed)) {
        consumed++;
        continue;
      }
      if (BLOCK_END_RE.test(trimmed) || BLOCK_SECTION_RE.test(trimmed)) {
        consumed = j;
        break;
      }
      consumed = j + 1;
    }

    sections.push({ label: currentLabel, items: sectionItems });
    i += consumed;

    if (i >= lines.length) break;

    const nextTrimmed = lines[i].trim();

    // End of block
    if (BLOCK_END_RE.test(nextTrimmed)) {
      i++; // consume 'end'
      break;
    }

    // Section separator (else, and)
    const sectionMatch = nextTrimmed.match(BLOCK_SECTION_RE);
    if (sectionMatch) {
      currentLabel = sectionMatch[2]?.trim() || sectionMatch[1].toLowerCase();
      i++;
      continue;
    }

    break;
  }

  return {
    block: { kind: "block", type, label, sections },
    nextLine: i,
  };
}

function parseArrow(arrow: string): { style: MessageStyle; arrowType: ArrowType } {
  // Dashed lines start with --
  const isDashed = arrow.startsWith("--");

  if (arrow.endsWith(")")) {
    return { style: "solid", arrowType: "open" };
  }
  if (arrow.toLowerCase().endsWith("x")) {
    return { style: isDashed ? "dashed" : "solid", arrowType: "cross" };
  }

  return {
    style: isDashed ? "dashed" : "solid",
    arrowType: "arrow",
  };
}
