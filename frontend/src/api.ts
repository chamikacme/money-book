export type HealthResponse = {
  ok: boolean;
  service: string;
};

export async function getApiHealth(): Promise<HealthResponse> {
  const response = await fetch("/api/health");

  if (!response.ok) {
    throw new Error(`API health check failed (${response.status})`);
  }

  return response.json() as Promise<HealthResponse>;
}
