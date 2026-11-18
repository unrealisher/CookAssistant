import { apiRequest } from "../../../shared/api/client";
import type { Credentials, SetupStatus, User } from "../model/types";

export const authApi = {
  getSetupStatus: () => apiRequest<SetupStatus>("/api/v1/auth/status"),
  getCurrentUser: () => apiRequest<User>("/api/v1/auth/me"),
  setup: (credentials: Credentials) =>
    apiRequest<User>("/api/v1/auth/setup", { method: "POST", body: JSON.stringify(credentials) }),
  login: (credentials: Credentials) =>
    apiRequest<User>("/api/v1/auth/login", { method: "POST", body: JSON.stringify(credentials) }),
  logout: () => apiRequest<void>("/api/v1/auth/logout", { method: "POST" }),
};
