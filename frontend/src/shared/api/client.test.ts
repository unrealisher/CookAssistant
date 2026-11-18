import { afterEach, describe, expect, it, vi } from "vitest";

import { apiRequest } from "./client";

afterEach(() => vi.unstubAllGlobals());

describe("apiRequest", () => {
  it("sends cookies and parses JSON responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ setup_required: true }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiRequest<{ setup_required: boolean }>("/api/v1/auth/status")).resolves.toEqual({
      setup_required: true,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/auth/status",
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("turns API error details into readable exceptions", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ detail: "Invalid username or password" }), { status: 401 }),
      ),
    );

    await expect(apiRequest("/api/v1/auth/login")).rejects.toMatchObject({
      name: "ApiError",
      status: 401,
      message: "Invalid username or password",
    });
  });
});
