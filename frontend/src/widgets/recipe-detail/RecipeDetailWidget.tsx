import { useEffect, useState } from "react";

import { recipeApi } from "../../entities/recipe/api/recipe-api";
import type { Recipe } from "../../entities/recipe/model/types";
import { ApiError } from "../../shared/api/client";

interface RecipeDetailWidgetProps {
  recipeId: number;
  onBack: () => void;
  onEdit: (recipeId: number) => void;
  onDeleted: () => void;
  onUnauthorized: () => void;
}

const numberFormat = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 });

export function RecipeDetailWidget({
  recipeId,
  onBack,
  onEdit,
  onDeleted,
  onUnauthorized,
}: RecipeDetailWidgetProps) {
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let isCurrent = true;
    setIsLoading(true);
    setError("");
    recipeApi.get(recipeId).then((result) => {
      if (isCurrent) setRecipe(result);
    }).catch((cause: unknown) => {
      if (!isCurrent) return;
      if (cause instanceof ApiError && cause.status === 401) {
        onUnauthorized();
        return;
      }
      setError(cause instanceof Error ? cause.message : "Не удалось открыть рецепт.");
    }).finally(() => {
      if (isCurrent) setIsLoading(false);
    });
    return () => { isCurrent = false; };
  }, [recipeId, onUnauthorized]);

  async function handleDelete() {
    if (!recipe || !window.confirm(`Удалить рецепт «${recipe.name}»? Это действие нельзя отменить.`)) return;
    setIsDeleting(true);
    setError("");
    try {
      await recipeApi.remove(recipe.id);
      onDeleted();
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) {
        onUnauthorized();
      } else {
        setError(cause instanceof Error ? cause.message : "Не удалось удалить рецепт.");
      }
    } finally {
      setIsDeleting(false);
    }
  }

  if (isLoading) {
    return <div className="loading-state" role="status"><span className="loading-spinner" /> Открываем рецепт…</div>;
  }
  if (error && !recipe) {
    return (
      <div className="page-message">
        <p className="notice notice--error" role="alert">{error}</p>
        <button className="button button--secondary" onClick={onBack} type="button">К коллекции</button>
      </div>
    );
  }
  if (!recipe) return null;

  return (
    <article className="recipe-detail">
      <button className="back-link" onClick={onBack} type="button"><span aria-hidden="true">←</span> Все рецепты</button>
      <header className="detail-heading">
        <div>
          <p className="eyebrow">ИЗ ВАШЕЙ КОЛЛЕКЦИИ</p>
          <h1>{recipe.name}</h1>
          <p className="detail-updated">Изменён {new Intl.DateTimeFormat("ru-RU", { dateStyle: "long" }).format(new Date(recipe.updated_at))}</p>
        </div>
        <div className="detail-actions">
          <button className="button button--secondary" onClick={() => onEdit(recipe.id)} type="button">Изменить</button>
          <button className="button button--danger-quiet" disabled={isDeleting} onClick={handleDelete} type="button">
            {isDeleting ? "Удаляем…" : "Удалить"}
          </button>
        </div>
      </header>

      {error && <p className="notice notice--error" role="alert">{error}</p>}

      <div className="detail-meta">
        <span>{recipe.ingredients.length} {pluralize(recipe.ingredients.length, "ингредиент", "ингредиента", "ингредиентов")}</span>
        <span aria-hidden="true">·</span>
        <span>{recipe.steps.length} {pluralize(recipe.steps.length, "шаг", "шага", "шагов")}</span>
      </div>
      {recipe.tags.length > 0 && (
        <ul className="detail-tags" aria-label="Теги">
          {recipe.tags.map((tag) => <li className="tag-chip" key={tag}>{tag}</li>)}
        </ul>
      )}

      <div className="detail-columns">
        <section className="detail-section ingredients-panel" aria-labelledby="detail-ingredients-title">
          <p className="eyebrow">ЧТО ПОНАДОБИТСЯ</p>
          <h2 id="detail-ingredients-title">Ингредиенты</h2>
          {recipe.ingredients.length ? (
            <ul className="ingredient-list">
              {recipe.ingredients.map((ingredient) => (
                <li key={ingredient.id}>
                  <span className="ingredient-bullet" aria-hidden="true" />
                  <span>{ingredient.name}</span>
                  {(ingredient.quantity || ingredient.unit) && (
                    <span className="ingredient-amount">{[ingredient.quantity, ingredient.unit].filter(Boolean).join(" ")}</span>
                  )}
                </li>
              ))}
            </ul>
          ) : <p className="muted-copy">Ингредиенты пока не добавлены.</p>}
        </section>

        <section className="detail-section steps-panel" aria-labelledby="detail-steps-title">
          <p className="eyebrow">КАК ПРИГОТОВИТЬ</p>
          <h2 id="detail-steps-title">Шаги</h2>
          {recipe.steps.length ? (
            <ol className="recipe-steps">
              {recipe.steps.map((step, index) => (
                <li key={step.id}>
                  <span className="step-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <p>{step.text}</p>
                    {(step.duration_minutes !== null || step.temperature_c !== null) && (
                      <span className="step-conditions">
                        {step.duration_minutes !== null && <span>{step.duration_minutes} мин</span>}
                        {step.temperature_c !== null && <span>{numberFormat.format(step.temperature_c)} °C</span>}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          ) : <p className="muted-copy">Шаги приготовления пока не добавлены.</p>}
        </section>
      </div>

      {recipe.original_text && (
        <details className="original-note">
          <summary>Исходная заметка</summary>
          <p>{recipe.original_text}</p>
        </details>
      )}
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
