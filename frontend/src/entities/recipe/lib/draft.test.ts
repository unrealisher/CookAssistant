import { describe, expect, it } from "vitest";

import { toRecipeDraft, toRecipeInput } from "./draft";

describe("recipe draft conversion", () => {
  it("converts empty optional values to null and parses step numbers", () => {
    expect(
      toRecipeInput({
        name: "  Суп  ",
        original_text: " ",
        ingredients: [{ name: "Соль", quantity: "", unit: " по вкусу " }],
        steps: [{ text: " Варить ", duration_minutes: "15", temperature_c: "180.5" }],
        tags: ["  Обед ", ""],
      }),
    ).toEqual({
      name: "Суп",
      original_text: null,
      ingredients: [{ name: "Соль", quantity: null, unit: "по вкусу" }],
      steps: [{ text: "Варить", duration_minutes: 15, temperature_c: 180.5 }],
      tags: ["Обед"],
    });
  });

  it("creates an editable draft from a recipe response", () => {
    expect(
      toRecipeDraft({
        id: 1,
        name: "Рис",
        original_text: null,
        ingredients: [{ id: 2, name: "Рис", quantity: null, unit: null, position: 0 }],
        steps: [{
          id: 3,
          text: "Сварить",
          duration_minutes: 12,
          temperature_c: null,
          position: 0,
        }],
        tags: [],
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      }),
    ).toEqual({
      name: "Рис",
      original_text: "",
      ingredients: [{ name: "Рис", quantity: "", unit: "" }],
      steps: [{ text: "Сварить", duration_minutes: "12", temperature_c: "" }],
      tags: [],
    });
  });
});
