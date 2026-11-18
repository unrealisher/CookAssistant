import { apiRequest } from "../../../shared/api/client";
import type { Recipe, RecipeInput } from "../model/types";

export const recipeApi = {
  list: (query = "") => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    const suffix = params.size ? `?${params.toString()}` : "";
    return apiRequest<Recipe[]>(`/api/v1/recipes${suffix}`);
  },
  get: (recipeId: number) => apiRequest<Recipe>(`/api/v1/recipes/${recipeId}`),
  create: (recipe: RecipeInput) =>
    apiRequest<Recipe>("/api/v1/recipes", { method: "POST", body: JSON.stringify(recipe) }),
  update: (recipeId: number, recipe: RecipeInput) =>
    apiRequest<Recipe>(`/api/v1/recipes/${recipeId}`, {
      method: "PATCH",
      body: JSON.stringify(recipe),
    }),
  remove: (recipeId: number) =>
    apiRequest<void>(`/api/v1/recipes/${recipeId}`, { method: "DELETE" }),
};
