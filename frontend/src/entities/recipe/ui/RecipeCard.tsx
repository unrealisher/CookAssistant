import type { Recipe } from "../model/types";

interface RecipeCardProps {
  recipe: Recipe;
  onOpen: (recipeId: number) => void;
}

const dateFormat = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" });

export function RecipeCard({ recipe, onOpen }: RecipeCardProps) {
  const ingredientCount = recipe.ingredients.length;
  const stepCount = recipe.steps.length;

  return (
    <article className="recipe-card">
      <button
        aria-label={`Открыть рецепт «${recipe.name}»`}
        className="recipe-card-open"
        onClick={() => onOpen(recipe.id)}
        type="button"
      >
        <span className="recipe-card-topline">
          <span className="recipe-card-mark" aria-hidden="true">✳</span>
          <span className="recipe-updated">{dateFormat.format(new Date(recipe.updated_at))}</span>
        </span>
        <span className="recipe-card-title">{recipe.name}</span>
        {recipe.original_text ? (
          <span className="recipe-card-summary">{recipe.original_text}</span>
        ) : (
          <span className="recipe-card-summary recipe-card-summary--quiet">Личная запись из вашей коллекции</span>
        )}
        <span className="recipe-card-meta">
          <span>{ingredientCount} {pluralize(ingredientCount, "ингредиент", "ингредиента", "ингредиентов")}</span>
          <span aria-hidden="true">·</span>
          <span>{stepCount} {pluralize(stepCount, "шаг", "шага", "шагов")}</span>
        </span>
        {recipe.tags.length > 0 && (
          <span className="tag-list" aria-label="Теги">
            {recipe.tags.slice(0, 3).map((tag) => <span className="tag-chip" key={tag}>{tag}</span>)}
            {recipe.tags.length > 3 && <span className="tag-more">+{recipe.tags.length - 3}</span>}
          </span>
        )}
      </button>
    </article>
  );
}

function pluralize(count: number, one: string, few: string, many: string) {
  const modulo100 = count % 100;
  const modulo10 = count % 10;
  if (modulo100 >= 11 && modulo100 <= 14) return many;
  if (modulo10 === 1) return one;
  if (modulo10 >= 2 && modulo10 <= 4) return few;
  return many;
}
