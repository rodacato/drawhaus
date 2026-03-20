import { z } from "zod";

export interface ValidationError {
  elementIndex: number;
  elementId?: string;
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

const VALID_TYPES = [
  "rectangle",
  "text",
  "arrow",
  "line",
  "diamond",
  "ellipse",
  "freedraw",
  "image",
] as const;

const DANGEROUS_KEYS = ["__proto__", "constructor", "prototype"];

const MAX_ELEMENTS = 500;
const MAX_TEXT_LENGTH = 2000;
const COORD_MIN = -50000;
const COORD_MAX = 50000;
const DIM_MIN = 1;
const DIM_MAX = 10000;
const FONT_SIZE_MIN = 8;
const FONT_SIZE_MAX = 100;
const STROKE_WIDTH_MIN = 0.5;
const STROKE_WIDTH_MAX = 10;

const pointSchema = z.tuple([z.number(), z.number()]);

const baseElementSchema = z.object({
  type: z.enum(VALID_TYPES),
  x: z.number().min(COORD_MIN).max(COORD_MAX),
  y: z.number().min(COORD_MIN).max(COORD_MAX),
}).passthrough();

function hasDangerousKeys(obj: Record<string, unknown>): string | null {
  for (const key of Object.keys(obj)) {
    if (DANGEROUS_KEYS.includes(key)) return key;
  }
  return null;
}

export function validateElements(elements: unknown[]): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (!Array.isArray(elements)) {
    errors.push({
      elementIndex: -1,
      field: "elements",
      message: "Expected an array of elements",
    });
    return { valid: false, errors, warnings };
  }

  if (elements.length > MAX_ELEMENTS) {
    errors.push({
      elementIndex: -1,
      field: "elements",
      message: `Too many elements: ${elements.length} (max ${MAX_ELEMENTS})`,
    });
    return { valid: false, errors, warnings };
  }

  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];

    if (typeof el !== "object" || el === null || Array.isArray(el)) {
      errors.push({
        elementIndex: i,
        field: "element",
        message: "Element must be a plain object",
      });
      continue;
    }

    const record = el as Record<string, unknown>;
    const elId = typeof record.id === "string" ? record.id : undefined;

    // Check dangerous keys
    const dangerousKey = hasDangerousKeys(record);
    if (dangerousKey) {
      errors.push({
        elementIndex: i,
        elementId: elId,
        field: dangerousKey,
        message: `Dangerous key "${dangerousKey}" is not allowed`,
      });
      continue;
    }

    // Validate base structure
    const baseResult = baseElementSchema.safeParse(record);
    if (!baseResult.success) {
      for (const issue of baseResult.error.issues) {
        errors.push({
          elementIndex: i,
          elementId: elId,
          field: issue.path.join(".") || "element",
          message: issue.message,
        });
      }
      continue;
    }

    const type = record.type as string;

    // Type-specific validation
    if (type === "rectangle" || type === "diamond" || type === "ellipse") {
      validateShapeElement(record, i, elId, errors, warnings);
    } else if (type === "text") {
      validateTextElement(record, i, elId, errors, warnings);
    } else if (type === "arrow" || type === "line") {
      validateLinearElement(record, i, elId, errors, warnings);
    }

    // Common optional field validation
    if (record.fontSize !== undefined) {
      const fs = record.fontSize as number;
      if (typeof fs !== "number" || fs < FONT_SIZE_MIN || fs > FONT_SIZE_MAX) {
        warnings.push({
          elementIndex: i,
          elementId: elId,
          field: "fontSize",
          message: `fontSize should be between ${FONT_SIZE_MIN} and ${FONT_SIZE_MAX}, got ${fs}`,
        });
      }
    }

    if (record.strokeWidth !== undefined) {
      const sw = record.strokeWidth as number;
      if (typeof sw !== "number" || sw < STROKE_WIDTH_MIN || sw > STROKE_WIDTH_MAX) {
        warnings.push({
          elementIndex: i,
          elementId: elId,
          field: "strokeWidth",
          message: `strokeWidth should be between ${STROKE_WIDTH_MIN} and ${STROKE_WIDTH_MAX}, got ${sw}`,
        });
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

function validateShapeElement(
  record: Record<string, unknown>,
  index: number,
  elId: string | undefined,
  errors: ValidationError[],
  _warnings: ValidationError[],
): void {
  if (typeof record.width !== "number") {
    errors.push({ elementIndex: index, elementId: elId, field: "width", message: "width is required for shape elements" });
  } else if (record.width < DIM_MIN || record.width > DIM_MAX) {
    errors.push({ elementIndex: index, elementId: elId, field: "width", message: `width must be between ${DIM_MIN} and ${DIM_MAX}, got ${record.width}` });
  }

  if (typeof record.height !== "number") {
    errors.push({ elementIndex: index, elementId: elId, field: "height", message: "height is required for shape elements" });
  } else if (record.height < DIM_MIN || record.height > DIM_MAX) {
    errors.push({ elementIndex: index, elementId: elId, field: "height", message: `height must be between ${DIM_MIN} and ${DIM_MAX}, got ${record.height}` });
  }
}

function validateTextElement(
  record: Record<string, unknown>,
  index: number,
  elId: string | undefined,
  errors: ValidationError[],
  _warnings: ValidationError[],
): void {
  if (typeof record.text !== "string") {
    errors.push({ elementIndex: index, elementId: elId, field: "text", message: "text is required for text elements" });
  } else if (record.text.length > MAX_TEXT_LENGTH) {
    errors.push({ elementIndex: index, elementId: elId, field: "text", message: `text must be at most ${MAX_TEXT_LENGTH} characters, got ${record.text.length}` });
  }
}

function validateLinearElement(
  record: Record<string, unknown>,
  index: number,
  elId: string | undefined,
  errors: ValidationError[],
  _warnings: ValidationError[],
): void {
  if (!Array.isArray(record.points)) {
    errors.push({ elementIndex: index, elementId: elId, field: "points", message: "points array is required for arrow/line elements" });
    return;
  }

  if (record.points.length < 2) {
    errors.push({ elementIndex: index, elementId: elId, field: "points", message: "points must have at least 2 entries" });
    return;
  }

  for (let j = 0; j < record.points.length; j++) {
    const pt = record.points[j];
    const result = pointSchema.safeParse(pt);
    if (!result.success) {
      errors.push({ elementIndex: index, elementId: elId, field: `points[${j}]`, message: "Each point must be a [x, y] tuple of numbers" });
    }
  }
}
