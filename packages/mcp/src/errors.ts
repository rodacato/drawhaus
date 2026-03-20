export class DrawhausApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly apiMessage: string,
    public readonly hint: string,
  ) {
    super(`Drawhaus API error (${status}): ${apiMessage}`);
    this.name = "DrawhausApiError";
  }
}

const HINTS: Record<number, string> = {
  400: "",
  401: "Check that DRAWHAUS_API_KEY is valid and not expired. You can create a new key in Drawhaus → Settings → API Keys.",
  403: "The diagram belongs to a different workspace than your API key.",
  404: "Diagram not found. Check the ID and try list_diagrams to see available diagrams.",
  429: "Rate limit exceeded. Wait a moment before retrying (limit: 60 requests/minute).",
};

export function hintForStatus(status: number): string {
  return HINTS[status] ?? `Unexpected error (HTTP ${status}).`;
}

export function formatErrorForMcp(error: unknown): string {
  if (error instanceof DrawhausApiError) {
    const parts = [error.apiMessage];
    if (error.hint) parts.push(error.hint);
    return parts.join("\n\n");
  }

  if (error instanceof TypeError && String(error.message).includes("fetch")) {
    return "Could not connect to Drawhaus. Check that the server is running and DRAWHAUS_URL is correct.";
  }

  if (error instanceof Error && error.name === "ZodError") {
    return `Invalid input: ${error.message}`;
  }

  return String(error);
}
