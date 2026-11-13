const apiBaseUrl = import.meta.env.VITE_API_URL ?? "";

export class ApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly details?: unknown) { super(message); this.name = "ApiError"; }
}

export async function apiRequest<T>(path: string, token?: string | null, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${apiBaseUrl}${path}`, { ...init, headers });
  const body = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(body?.error?.message ?? "The request failed", response.status, body);
  return body as T;
}
