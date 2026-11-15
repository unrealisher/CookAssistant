export interface HealthResponse {
  status: "ok";
}

export async function getApiHealth(): Promise<HealthResponse> {
  const response = await fetch("/api/v1/health");

  if (!response.ok) {
    throw new Error(`API health check failed with status ${response.status}`);
  }

  const body: unknown = await response.json();
  if (typeof body !== "object" || body === null || !("status" in body) || body.status !== "ok") {
    throw new Error("API returned an unexpected health response");
  }

  return { status: "ok" };
}
