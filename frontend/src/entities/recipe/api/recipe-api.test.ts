import { afterEach, describe, expect, it, vi } from "vitest";

import { recipeApi } from "./recipe-api";

afterEach(() => vi.unstubAllGlobals());

describe("recipeApi", () => {
  it("sends the search term through the API query parameter", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("[]", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await recipeApi.list("Суп & хлеб");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/recipes?q=%D0%A1%D1%83%D0%BF+%26+%D1%85%D0%BB%D0%B5%D0%B1",
      expect.objectContaining({ credentials: "include" }),
    );
  });
});
