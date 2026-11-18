import type { Recipe, RecipeDraft, RecipeInput } from "../model/types";

export type RecipeDraftIssue =
  | { field: "name"; message: string }
  | { field: "ingredient"; index: number; message: string }
  | { field: "step"; index: number; message: string };

export class RecipeDraftValidationError extends Error {
  constructor(readonly issues: RecipeDraftIssue[]) {
    super("Заполните обязательные поля рецепта.");
    this.name = "RecipeDraftValidationError";
  }
}

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

export function validateRecipeDraft(draft: RecipeDraft): RecipeDraftIssue[] {
  const issues: RecipeDraftIssue[] = [];
  if (!draft.name.trim()) {
    issues.push({ field: "name", message: "Укажите название рецепта." });
  }

  draft.ingredients.forEach((ingredient, index) => {
    const hasAmount = Boolean(ingredient.quantity.trim() || ingredient.unit.trim());
    if (!ingredient.name.trim() && hasAmount) {
      issues.push({
        field: "ingredient",
        index,
        message: "Укажите ингредиент, чтобы сохранить количество и единицу измерения.",
      });
    }
  });

  draft.steps.forEach((step, index) => {
    const hasConditions = Boolean(step.duration_minutes.trim() || step.temperature_c.trim());
    if (!step.text.trim() && hasConditions) {
      issues.push({
        field: "step",
        index,
        message: "Добавьте описание шага, чтобы сохранить время или температуру.",
      });
    }
  });

  return issues;
}

export function toRecipeInput(draft: RecipeDraft): RecipeInput {
  const issues = validateRecipeDraft(draft);
  if (issues.length) throw new RecipeDraftValidationError(issues);

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
