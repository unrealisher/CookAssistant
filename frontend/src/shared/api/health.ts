import { apiRequest } from "./client";

interface HealthResponse {
  status: "ok";
}

export async function getApiHealth(): Promise<HealthResponse> {
  const body = await apiRequest<unknown>("/api/v1/health");
  if (typeof body !== "object" || body === null || !("status" in body) || body.status !== "ok") {
    throw new Error("Сервер вернул неожиданный ответ.");
  }
  return { status: "ok" };
}
