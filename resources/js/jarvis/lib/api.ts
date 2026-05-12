import type { BootstrapPayload, Conversation } from "../types";

type JsonResponse<T> = { data: T };

export class HttpError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

async function request<T>(url: string, options: RequestInit = {}, companyId?: number | null): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(companyId ? { "X-Company-Id": String(companyId) } : {}),
      ...(options.headers || {}),
    },
    credentials: "same-origin",
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new HttpError("Falha na requisição.", response.status, body);
  }
  return body as T;
}

export const api = {
  bootstrap: (companyId?: number | null) => request<BootstrapPayload>("/api/jarvis/bootstrap", {}, companyId),
  conversations: {
    list: (companyId?: number | null) => request<JsonResponse<Conversation[]>>("/api/jarvis/conversations", {}, companyId),
    create: (payload: Partial<Conversation>, companyId?: number | null) => request<JsonResponse<Conversation>>("/api/jarvis/conversations", {
      method: "POST",
      body: JSON.stringify(payload),
    }, companyId),
    show: (id: number, companyId?: number | null) => request<JsonResponse<Conversation & { messages: any[] }>>(`/api/jarvis/conversations/${id}`, {}, companyId),
    sendMessage: (id: number, payload: { content: string; request_uuid: string }, companyId?: number | null) => request<JsonResponse<any>>(`/api/jarvis/conversations/${id}/messages`, {
      method: "POST",
      body: JSON.stringify(payload),
    }, companyId),
  },
};
