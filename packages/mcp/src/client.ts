import { DrawhausApiError, hintForStatus } from "./errors.js";

export interface DiagramSummary {
  id: string;
  title: string;
  url: string;
  createdVia: string;
  folderId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DiagramDetail extends DiagramSummary {
  elements: unknown[];
  appState: Record<string, unknown>;
}

export interface DiagramListResponse {
  data: DiagramSummary[];
  total: number;
  limit: number;
  offset: number;
}

export interface HealthResponse {
  status: string;
  version: string;
  database: string;
}

export interface CreateDiagramParams {
  title?: string;
  elements?: unknown[];
  appState?: Record<string, unknown>;
  folderId?: string | null;
}

export interface UpdateDiagramParams {
  title?: string;
  elements?: unknown[];
  appState?: Record<string, unknown>;
}

export interface ListDiagramsParams {
  folderId?: string;
  limit?: number;
  offset?: number;
}

export class DrawhausClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.apiKey = apiKey;
  }

  async health(): Promise<HealthResponse> {
    return this.request<HealthResponse>("GET", "/v1/health");
  }

  async createDiagram(params: CreateDiagramParams): Promise<DiagramDetail> {
    const res = await this.request<{ data: DiagramDetail }>("POST", "/v1/diagrams", params);
    return res.data;
  }

  async listDiagrams(params?: ListDiagramsParams): Promise<DiagramListResponse> {
    const query = new URLSearchParams();
    if (params?.folderId) query.set("folderId", params.folderId);
    if (params?.limit !== undefined) query.set("limit", String(params.limit));
    if (params?.offset !== undefined) query.set("offset", String(params.offset));
    const qs = query.toString();
    return this.request<DiagramListResponse>("GET", `/v1/diagrams${qs ? `?${qs}` : ""}`);
  }

  async getDiagram(id: string): Promise<DiagramDetail> {
    const res = await this.request<{ data: DiagramDetail }>("GET", `/v1/diagrams/${id}`);
    return res.data;
  }

  async updateDiagram(id: string, params: UpdateDiagramParams): Promise<DiagramDetail> {
    const res = await this.request<{ data: DiagramDetail }>("PATCH", `/v1/diagrams/${id}`, params);
    return res.data;
  }

  async deleteDiagram(id: string): Promise<void> {
    await this.request<void>("DELETE", `/v1/diagrams/${id}`);
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      "Authorization": `Bearer ${this.apiKey}`,
      "X-Drawhaus-Client": "mcp-server",
    };
    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (response.status === 204) {
      return undefined as T;
    }

    if (!response.ok) {
      let apiMessage = `HTTP ${response.status}`;
      try {
        const errorBody = await response.json() as { error?: string };
        if (errorBody.error) apiMessage = errorBody.error;
      } catch {
        // Use status text if body parsing fails
      }
      const hint = hintForStatus(response.status);
      throw new DrawhausApiError(response.status, apiMessage, hint);
    }

    return response.json() as Promise<T>;
  }
}
