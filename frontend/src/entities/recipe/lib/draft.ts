import type { Recipe, RecipeDraft, RecipeInput } from "../model/types";

export function toRecipeDraft(recipe?: Recipe): RecipeDraft {
  if (!recipe) {
    return { name: "", original_text: "", ingredients: [], steps: [], tags: [] };
  }
  return {
    name: recipe.name,
    original_text: recipe.original_text ?? "",
    ingredients: recipe.ingredients.map(({ name, quantity, unit }) => ({
      name,
      quantity: quantity ?? "",
      unit: unit ?? "",
    })),
    steps: recipe.steps.map(({ text, duration_minutes, temperature_c }) => ({
      text,
      duration_minutes: duration_minutes === null ? "" : String(duration_minutes),
      temperature_c: temperature_c === null ? "" : String(temperature_c),
    })),
    tags: [...recipe.tags],
  };
}

export function toRecipeInput(draft: RecipeDraft): RecipeInput {
  return {
    name: draft.name.trim(),
    original_text: draft.original_text.trim() || null,
    ingredients: draft.ingredients
      .filter((item) => item.name.trim())
      .map((item) => ({
        name: item.name.trim(),
        quantity: item.quantity.trim() || null,
        unit: item.unit.trim() || null,
      })),
    steps: draft.steps
      .filter((step) => step.text.trim())
      .map((step) => ({
        text: step.text.trim(),
        duration_minutes: step.duration_minutes.trim() ? Number(step.duration_minutes) : null,
        temperature_c: step.temperature_c.trim() ? Number(step.temperature_c) : null,
      })),
    tags: draft.tags.map((tag) => tag.trim()).filter(Boolean),
  };
}
