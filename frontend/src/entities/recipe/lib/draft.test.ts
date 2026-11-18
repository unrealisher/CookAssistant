import { describe, expect, it } from "vitest";

import {
  RecipeDraftValidationError,
  toRecipeDraft,
  toRecipeInput,
  validateRecipeDraft,
} from "./draft";

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

  it("rejects an unnamed ingredient that has a quantity or unit without changing the draft", () => {
    const draft = {
      name: "Суп",
      original_text: "",
      ingredients: [{ name: "  ", quantity: "2", unit: "стакана" }],
      steps: [],
      tags: [],
    };

    expect(validateRecipeDraft(draft)).toEqual([
      {
        field: "ingredient",
        index: 0,
        message: "Укажите ингредиент, чтобы сохранить количество и единицу измерения.",
      },
    ]);
    expect(() => toRecipeInput(draft)).toThrow(RecipeDraftValidationError);
    expect(draft.ingredients[0]).toEqual({ name: "  ", quantity: "2", unit: "стакана" });
  });

  it("rejects a step with timing or temperature but no description without changing the draft", () => {
    const draft = {
      name: "Суп",
      original_text: "",
      ingredients: [],
      steps: [{ text: "", duration_minutes: "25", temperature_c: "180" }],
      tags: [],
    };

    expect(validateRecipeDraft(draft)).toEqual([
      {
        field: "step",
        index: 0,
        message: "Добавьте описание шага, чтобы сохранить время или температуру.",
      },
    ]);
    expect(() => toRecipeInput(draft)).toThrow(RecipeDraftValidationError);
    expect(draft.steps[0]).toEqual({ text: "", duration_minutes: "25", temperature_c: "180" });
  });

  it("omits completely blank ingredient and step rows", () => {
    expect(
      toRecipeInput({
        name: "Суп",
        original_text: "",
        ingredients: [{ name: " ", quantity: "", unit: " " }],
        steps: [{ text: "  ", duration_minutes: "", temperature_c: " " }],
        tags: [],
      }),
    ).toMatchObject({ ingredients: [], steps: [] });
  });
});
