export interface Ingredient {
  id: number;
  name: string;
  quantity: string | null;
  unit: string | null;
  position: number;
}

export interface RecipeStep {
  id: number;
  text: string;
  duration_minutes: number | null;
  temperature_c: number | null;
  position: number;
}

export interface Recipe {
  id: number;
  name: string;
  original_text: string | null;
  ingredients: Ingredient[];
  steps: RecipeStep[];
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface IngredientInput {
  name: string;
  quantity: string | null;
  unit: string | null;
}

export interface StepInput {
  text: string;
  duration_minutes: number | null;
  temperature_c: number | null;
}

export interface RecipeInput {
  name: string;
  original_text: string | null;
  ingredients: IngredientInput[];
  steps: StepInput[];
  tags: string[];
}

export interface IngredientDraft {
  name: string;
  quantity: string;
  unit: string;
}

export interface StepDraft {
  text: string;
  duration_minutes: string;
  temperature_c: string;
}

export interface RecipeDraft {
  name: string;
  original_text: string;
  ingredients: IngredientDraft[];
  steps: StepDraft[];
  tags: string[];
}
