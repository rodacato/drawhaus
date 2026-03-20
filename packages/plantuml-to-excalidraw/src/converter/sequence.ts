import type { ExcalidrawElementSkeleton } from "../types.js";
import type { SequenceDiagramAST, SequenceParticipant } from "../parser/types.js";
import type { DiagramTheme } from "../theme/types.js";
import { createRect, createText, createArrow, createLine } from "../elements.js";

// ── Layout constants ────────────────────────────────────────────

const CHAR_WIDTH = 9.5;
const PADDING_X = 20;
const PADDING_Y = 10;
const PARTICIPANT_MIN_WIDTH = 100;
const PARTICIPANT_HEIGHT = 36;
const PARTICIPANT_GAP = 40;
const BASE_MESSAGE_SPACING = 50;
const MARGIN = 40;
const LIFELINE_EXTEND = 30;

// ── Public API ──────────────────────────────────────────────────

export function mapSequenceDiagram(
  ast: SequenceDiagramAST,
  theme: DiagramTheme,
): ExcalidrawElementSkeleton[] {
  const skeletons: ExcalidrawElementSkeleton[] = [];

  if (ast.participants.length === 0) return skeletons;

  // Compute message spacing based on longest label
  const maxLabelWidth = ast.messages.reduce(
    (max, msg) => Math.max(max, msg.label.length * CHAR_WIDTH),
    0,
  );
  const messageSpacing = Math.max(BASE_MESSAGE_SPACING, maxLabelWidth * 0.4 + 30);

  // Measure participant widths — also consider message labels between adjacent participants
  const participantWidths = new Map<string, number>();
  for (const p of ast.participants) {
    const displayName = p.label ?? p.name;
    const width = Math.max(
      displayName.length * CHAR_WIDTH + PADDING_X * 2,
      PARTICIPANT_MIN_WIDTH,
    );
    participantWidths.set(p.name, width);
  }

  // Compute minimum gap between each pair of adjacent participants
  // based on message label widths that span between them
  const participantOrder = ast.participants.map((p) => p.name);
  const indexMap = new Map(participantOrder.map((name, i) => [name, i]));
  const pairGaps = new Map<string, number>();

  for (const msg of ast.messages) {
    const fromIdx = indexMap.get(msg.from);
    const toIdx = indexMap.get(msg.to);
    if (fromIdx === undefined || toIdx === undefined) continue;

    const minIdx = Math.min(fromIdx, toIdx);
    const maxIdx = Math.max(fromIdx, toIdx);

    // Distribute label width across the spans
    if (maxIdx > minIdx) {
      const labelWidth = msg.label.length * CHAR_WIDTH + PADDING_X * 2;
      const perSpan = labelWidth / (maxIdx - minIdx);

      for (let s = minIdx; s < maxIdx; s++) {
        const key = `${s}-${s + 1}`;
        pairGaps.set(key, Math.max(pairGaps.get(key) ?? 0, perSpan));
      }
    }
  }

  // Compute X center for each participant using adaptive gaps
  const participantX = new Map<string, number>();
  let currentX = MARGIN;
  for (let i = 0; i < participantOrder.length; i++) {
    const name = participantOrder[i];
    const width = participantWidths.get(name)!;
    participantX.set(name, currentX + width / 2);

    if (i < participantOrder.length - 1) {
      const pairKey = `${i}-${i + 1}`;
      const neededGap = pairGaps.get(pairKey) ?? 0;
      const gap = Math.max(PARTICIPANT_GAP, neededGap);
      currentX += width + gap;
    }
  }

  // Compute total diagram height
  const lifelineStartY = MARGIN + PARTICIPANT_HEIGHT;
  const totalMessageHeight = ast.messages.length * messageSpacing;
  const lifelineEndY = lifelineStartY + totalMessageHeight + LIFELINE_EXTEND;
  const bottomBoxY = lifelineEndY;

  // ── Layer 1: Lifelines (dashed vertical lines) ──────────────

  for (const p of ast.participants) {
    const cx = participantX.get(p.name)!;
    skeletons.push(
      createLine({
        startX: cx,
        startY: lifelineStartY,
        endX: cx,
        endY: bottomBoxY,
        strokeStyle: "dashed",
        strokeColor: theme.sequenceLifeline.stroke,
        strokeWidth: theme.sequenceLifeline.strokeWidth,
      }),
    );
  }

  // ── Layer 2: Participant boxes (top) ────────────────────────

  for (const p of ast.participants) {
    renderParticipantBox(p, participantX, participantWidths, MARGIN, theme, skeletons);
  }

  // ── Layer 3: Participant boxes (bottom — mirrored) ──────────

  for (const p of ast.participants) {
    renderParticipantBox(p, participantX, participantWidths, bottomBoxY, theme, skeletons);
  }

  // ── Layer 4: Messages (horizontal arrows) ───────────────────

  for (let i = 0; i < ast.messages.length; i++) {
    const msg = ast.messages[i];
    const fromX = participantX.get(msg.from);
    const toX = participantX.get(msg.to);
    if (fromX === undefined || toX === undefined) continue;

    const y = lifelineStartY + messageSpacing * (i + 0.5);

    const isReturn = msg.arrowType === "return";

    skeletons.push(
      createArrow({
        points: [
          { x: fromX, y },
          { x: toX, y },
        ],
        label: msg.label || undefined,
        endArrowhead: "arrow",
        strokeStyle: isReturn ? "dashed" : "solid",
        strokeColor: theme.sequenceMessage.stroke,
        strokeWidth: theme.sequenceMessage.strokeWidth,
      }),
    );
  }

  return skeletons;
}

// ── Helpers ─────────────────────────────────────────────────────

function renderParticipantBox(
  p: SequenceParticipant,
  participantX: Map<string, number>,
  participantWidths: Map<string, number>,
  y: number,
  theme: DiagramTheme,
  skeletons: ExcalidrawElementSkeleton[],
): void {
  const cx = participantX.get(p.name)!;
  const width = participantWidths.get(p.name)!;
  const x = cx - width / 2;

  skeletons.push(
    createRect({
      x,
      y,
      width,
      height: PARTICIPANT_HEIGHT,
      backgroundColor: theme.sequenceParticipant.fill,
      strokeColor: theme.sequenceParticipant.stroke,
      strokeStyle: theme.sequenceParticipant.strokeStyle,
      roundness: 4,
    }),
  );

  const displayName = p.label ?? p.name;
  skeletons.push(
    createText({
      x: cx,
      y: y + PADDING_Y,
      text: displayName,
      fontSize: theme.headerText.fontSize,
      color: theme.headerText.color,
      textAlign: "center",
    }),
  );
}
