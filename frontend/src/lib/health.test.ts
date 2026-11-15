import { afterEach, describe, expect, it, vi } from "vitest";

import { getApiHealth } from "./health";

describe("getApiHealth", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns the API status when the health endpoint is available", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: "ok" }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(getApiHealth()).resolves.toEqual({ status: "ok" });
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/health");
  });

  it("rejects a failed health response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 503 })));

    await expect(getApiHealth()).rejects.toThrow("API health check failed with status 503");
  });
});
