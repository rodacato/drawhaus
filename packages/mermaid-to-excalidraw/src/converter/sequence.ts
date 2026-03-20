/**
 * Mermaid Sequence Diagram → Excalidraw elements converter.
 *
 * Layout is custom (no dagre) since sequence diagrams have a
 * strictly columnar structure:
 *   - Participants placed horizontally
 *   - Messages/notes laid out vertically in order
 *   - Lifelines as dashed vertical lines
 *   - Activation boxes as narrow rectangles on lifelines
 *   - Control blocks (alt, loop, etc.) as dashed containers
 */

import type {
  ExcalidrawElementSkeleton,
  MermaidConfig,
  MermaidToExcalidrawResult,
} from "../types.js";
import type {
  SequenceDiagramAST,
  SequenceParticipant,
  SequenceMessage,
  SequenceNote,
  SequenceBlock,
  SequenceItem,
} from "../parser/sequence-types.js";
import type { MermaidTheme } from "../theme/types.js";
import { DEFAULT_THEME } from "../theme/default.js";
import { parseMermaidSequence } from "../parser/sequence.js";
import {
  createRect,
  createText,
  createArrow,
  createLine,
  resetIdCounter,
} from "../elements.js";

// ── Layout constants ────────────────────────────────────────────

const CHAR_WIDTH = 9;
const PARTICIPANT_PADDING_X = 24;
const PARTICIPANT_PADDING_Y = 12;
const PARTICIPANT_MIN_WIDTH = 100;
const PARTICIPANT_HEIGHT = 40;
const PARTICIPANT_SPACING = 60;
const MESSAGE_SPACING = 50;
const INITIAL_Y = 80;
const NOTE_WIDTH = 140;
const NOTE_HEIGHT = 36;
const NOTE_PADDING = 8;
const BLOCK_PADDING_X = 16;
const BLOCK_PADDING_Y = 24;
const BLOCK_LABEL_HEIGHT = 20;
const ACTIVATION_WIDTH = 12;
const SELF_MESSAGE_WIDTH = 60;

// ── Public API ──────────────────────────────────────────────────

export async function convertSequenceDiagram(
  definition: string,
  _config?: MermaidConfig,
): Promise<MermaidToExcalidrawResult> {
  resetIdCounter();

  const ast = parseMermaidSequence(definition);
  const elements = mapSequenceDiagram(ast, DEFAULT_THEME);

  return {
    elements,
    diagramType: "sequenceDiagram",
  };
}

export function mapSequenceDiagram(
  ast: SequenceDiagramAST,
  theme: MermaidTheme,
): ExcalidrawElementSkeleton[] {
  const skeletons: ExcalidrawElementSkeleton[] = [];

  if (ast.participants.length === 0) return skeletons;

  // ── Phase 1: Measure participant widths ─────────────────────
  const participantWidths = new Map<string, number>();
  for (const p of ast.participants) {
    const displayName = p.alias ?? p.id;
    const textWidth = displayName.length * CHAR_WIDTH;
    const width = Math.max(textWidth + PARTICIPANT_PADDING_X * 2, PARTICIPANT_MIN_WIDTH);
    participantWidths.set(p.id, width);
  }

  // ── Phase 1.5: Calculate dynamic spacing based on message text ──
  // Build participant index map
  const pIndexMap = new Map<string, number>();
  ast.participants.forEach((p, i) => pIndexMap.set(p.id, i));

  // For each adjacent pair, find the max text width of messages between them
  const pairMaxWidth = new Array(ast.participants.length).fill(0);

  function scanMessageWidths(items: SequenceItem[]): void {
    for (const item of items) {
      if (item.kind === "message" && item.from !== item.to) {
        const fromIdx = pIndexMap.get(item.from) ?? -1;
        const toIdx = pIndexMap.get(item.to) ?? -1;
        if (fromIdx < 0 || toIdx < 0) continue;
        const lo = Math.min(fromIdx, toIdx);
        const hi = Math.max(fromIdx, toIdx);
        const gaps = hi - lo;
        const textWidth = item.text.length * CHAR_WIDTH + 80;
        const perGap = textWidth / gaps;
        for (let g = lo; g < hi; g++) {
          pairMaxWidth[g] = Math.max(pairMaxWidth[g], perGap);
        }
      } else if (item.kind === "block") {
        for (const section of item.sections) {
          scanMessageWidths(section.items);
        }
      }
    }
  }
  scanMessageWidths(ast.items);

  // ── Phase 2: Calculate participant X positions ──────────────
  const participantX = new Map<string, number>();
  let currentX = 0;
  for (let pi = 0; pi < ast.participants.length; pi++) {
    const p = ast.participants[pi];
    participantX.set(p.id, currentX);
    const w = participantWidths.get(p.id)!;
    // Spacing = max(default, required for message text)
    const requiredSpacing = Math.max(
      PARTICIPANT_SPACING,
      pairMaxWidth[pi] - w / 2 - (participantWidths.get(ast.participants[pi + 1]?.id) ?? 0) / 2,
    );
    currentX += w + Math.max(PARTICIPANT_SPACING, requiredSpacing);
  }

  // Helper: get center X of a participant
  function centerX(pid: string): number {
    const x = participantX.get(pid) ?? 0;
    const w = participantWidths.get(pid) ?? PARTICIPANT_MIN_WIDTH;
    return x + w / 2;
  }

  // ── Phase 3: Walk items to calculate total height ──────────
  let messageY = INITIAL_Y + PARTICIPANT_HEIGHT + 30;

  function layoutItems(items: SequenceItem[]): number {
    let y = messageY;
    for (const item of items) {
      switch (item.kind) {
        case "message":
          y += MESSAGE_SPACING;
          break;
        case "note":
          y += MESSAGE_SPACING;
          break;
        case "block": {
          y += BLOCK_LABEL_HEIGHT + 10;
          for (const section of item.sections) {
            if (section !== item.sections[0]) {
              y += 20; // separator between sections
            }
            const savedY = messageY;
            messageY = y;
            const sectionBottom = layoutItems(section.items);
            y = sectionBottom;
            messageY = savedY;
          }
          y += BLOCK_PADDING_Y;
          break;
        }
      }
    }
    return y;
  }

  const totalHeight = layoutItems(ast.items) + 30;

  // ── Phase 4: Render participant boxes (top) ─────────────────
  const participantIdMap = new Map<string, string>();

  for (const p of ast.participants) {
    const x = participantX.get(p.id)!;
    const w = participantWidths.get(p.id)!;
    const style = p.type === "actor" ? theme.seqActor : theme.seqParticipant;
    const displayName = p.alias ?? p.id;

    const rect = createRect({
      x,
      y: INITIAL_Y,
      width: w,
      height: PARTICIPANT_HEIGHT,
      label: displayName,
      roundness: 8,
      backgroundColor: style.fill,
      strokeColor: style.stroke,
      strokeStyle: style.strokeStyle,
    });
    if (rect.id) participantIdMap.set(p.id, rect.id as string);
    skeletons.push(rect);
  }

  // ── Phase 5: Render lifelines ───────────────────────────────
  const lifelineTop = INITIAL_Y + PARTICIPANT_HEIGHT;
  const lifelineBottom = totalHeight;

  for (const p of ast.participants) {
    const cx = centerX(p.id);
    skeletons.push(createLine({
      startX: cx,
      startY: lifelineTop,
      endX: cx,
      endY: lifelineBottom,
      strokeStyle: "dashed",
      strokeColor: theme.seqLifeline.stroke,
      strokeWidth: theme.seqLifeline.strokeWidth,
    }));
  }

  // ── Phase 6: Render participant boxes (bottom) ──────────────
  for (const p of ast.participants) {
    const x = participantX.get(p.id)!;
    const w = participantWidths.get(p.id)!;
    const style = p.type === "actor" ? theme.seqActor : theme.seqParticipant;
    const displayName = p.alias ?? p.id;

    skeletons.push(createRect({
      x,
      y: lifelineBottom,
      width: w,
      height: PARTICIPANT_HEIGHT,
      label: displayName,
      roundness: 8,
      backgroundColor: style.fill,
      strokeColor: style.stroke,
      strokeStyle: style.strokeStyle,
    }));
  }

  // ── Phase 7: Render messages, notes, and blocks ─────────────
  let currentY = INITIAL_Y + PARTICIPANT_HEIGHT + 30;

  function renderItems(items: SequenceItem[]): void {
    for (const item of items) {
      switch (item.kind) {
        case "message":
          renderMessage(item);
          break;
        case "note":
          renderNote(item);
          break;
        case "block":
          renderBlock(item);
          break;
      }
    }
  }

  function renderMessage(msg: SequenceMessage): void {
    currentY += MESSAGE_SPACING;
    const fromCx = centerX(msg.from);
    const toCx = centerX(msg.to);

    const isSelf = msg.from === msg.to;
    const arrowTheme = msg.style === "dashed" ? theme.seqDashedMessage : theme.seqMessage;

    if (isSelf) {
      // Self-message: loop arrow to the right
      const points = [
        { x: fromCx, y: currentY },
        { x: fromCx + SELF_MESSAGE_WIDTH, y: currentY },
        { x: fromCx + SELF_MESSAGE_WIDTH, y: currentY + 20 },
        { x: fromCx, y: currentY + 20 },
      ];

      skeletons.push(createArrow({
        points,
        label: msg.text,
        startArrowhead: null,
        endArrowhead: msg.arrowType === "cross" ? "bar" : msg.arrowType === "open" ? null : "arrow",
        strokeStyle: msg.style === "dashed" ? "dashed" : "solid",
        strokeColor: arrowTheme.stroke,
        strokeWidth: arrowTheme.strokeWidth,
      }));
    } else {
      const points = [
        { x: fromCx, y: currentY },
        { x: toCx, y: currentY },
      ];

      let endArrowhead: "arrow" | "bar" | null = "arrow";
      if (msg.arrowType === "cross") endArrowhead = "bar";
      if (msg.arrowType === "open") endArrowhead = null;

      skeletons.push(createArrow({
        points,
        label: msg.text,
        startArrowhead: null,
        endArrowhead,
        strokeStyle: msg.style === "dashed" ? "dashed" : "solid",
        strokeColor: arrowTheme.stroke,
        strokeWidth: arrowTheme.strokeWidth,
      }));
    }
  }

  function renderNote(note: SequenceNote): void {
    currentY += MESSAGE_SPACING;

    let noteX: number;
    const noteW = Math.max(note.text.length * CHAR_WIDTH + NOTE_PADDING * 2, NOTE_WIDTH);
    const noteH = NOTE_HEIGHT;

    if (note.placement === "over") {
      if (note.participants.length === 2) {
        const cx1 = centerX(note.participants[0]);
        const cx2 = centerX(note.participants[1]);
        const midX = (cx1 + cx2) / 2;
        noteX = midX - noteW / 2;
      } else {
        noteX = centerX(note.participants[0]) - noteW / 2;
      }
    } else if (note.placement === "rightOf") {
      const w = participantWidths.get(note.participants[0]) ?? PARTICIPANT_MIN_WIDTH;
      noteX = (participantX.get(note.participants[0]) ?? 0) + w + 10;
    } else {
      noteX = (participantX.get(note.participants[0]) ?? 0) - noteW - 10;
    }

    skeletons.push(createRect({
      x: noteX,
      y: currentY - noteH / 2,
      width: noteW,
      height: noteH,
      label: note.text,
      backgroundColor: theme.seqNote.fill,
      strokeColor: theme.seqNote.stroke,
      strokeStyle: theme.seqNote.strokeStyle,
    }));
  }

  function renderBlock(block: SequenceBlock): void {
    const blockStartY = currentY + 10;
    currentY += BLOCK_LABEL_HEIGHT + 10;

    // Determine X range: full participant width
    const allPIds = ast.participants.map((p) => p.id);
    const minX = Math.min(...allPIds.map((id) => participantX.get(id) ?? 0)) - BLOCK_PADDING_X;
    const maxX = Math.max(...allPIds.map((id) => {
      const x = participantX.get(id) ?? 0;
      const w = participantWidths.get(id) ?? PARTICIPANT_MIN_WIDTH;
      return x + w;
    })) + BLOCK_PADDING_X;

    const sectionStartYs: number[] = [];

    for (let si = 0; si < block.sections.length; si++) {
      if (si > 0) {
        sectionStartYs.push(currentY);
        currentY += 20;
      }
      renderItems(block.sections[si].items);
    }

    const blockEndY = currentY + BLOCK_PADDING_Y;

    // Block container
    skeletons.push(createRect({
      x: minX,
      y: blockStartY,
      width: maxX - minX,
      height: blockEndY - blockStartY,
      backgroundColor: theme.seqLoop.fill,
      strokeColor: theme.seqLoop.stroke,
      strokeStyle: theme.seqLoop.strokeStyle,
    }));

    // Block type label
    const typeLabel = block.type.toUpperCase() + (block.label ? ` [${block.label}]` : "");
    skeletons.push(createText({
      x: minX + 8,
      y: blockStartY + 4,
      text: typeLabel,
      fontSize: theme.labelText.fontSize,
      color: theme.seqLoop.stroke,
      textAlign: "left",
    }));

    // Section separator lines (for alt/else, par/and)
    for (let si = 0; si < sectionStartYs.length; si++) {
      const sepY = sectionStartYs[si];
      skeletons.push(createLine({
        startX: minX,
        startY: sepY,
        endX: maxX,
        endY: sepY,
        strokeStyle: "dashed",
        strokeColor: theme.seqLoop.stroke,
        strokeWidth: 1,
      }));

      // Section label
      const sectionLabel = block.sections[si + 1].label;
      if (sectionLabel) {
        skeletons.push(createText({
          x: minX + 8,
          y: sepY + 4,
          text: `[${sectionLabel}]`,
          fontSize: theme.labelText.fontSize,
          color: theme.seqLoop.stroke,
          textAlign: "left",
        }));
      }
    }

    currentY = blockEndY;
  }

  renderItems(ast.items);

  return skeletons;
}
