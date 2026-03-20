import type { DiagramConverter } from "../types.js";

const registry = new Map<string, DiagramConverter>();

/**
 * Register a custom converter for a diagram type.
 * When registered, this converter takes priority over the excalidraw fallback.
 */
export function registerConverter(type: string, converter: DiagramConverter): void {
  registry.set(type, converter);
}

/**
 * Get the custom converter for a diagram type, or null if none registered.
 */
export function getConverter(type: string): DiagramConverter | null {
  return registry.get(type) ?? null;
}

/**
 * Check if a custom converter is registered for a diagram type.
 */
export function hasConverter(type: string): boolean {
  return registry.has(type);
}

/**
 * List all registered custom converter types.
 */
export function listConverters(): string[] {
  return Array.from(registry.keys());
}
