import { useEffect, useState } from "react";

import { RecipeCard } from "../../entities/recipe/ui/RecipeCard";
import type { Recipe } from "../../entities/recipe/model/types";
import { recipeApi } from "../../entities/recipe/api/recipe-api";
import { ApiError } from "../../shared/api/client";
import { RecipeSearch } from "../../features/recipes/ui/RecipeSearch";

interface RecipeCollectionWidgetProps {
  onCreate: () => void;
  onOpen: (recipeId: number) => void;
  onUnauthorized: () => void;
}

export function RecipeCollectionWidget({ onCreate, onOpen, onUnauthorized }: RecipeCollectionWidgetProps) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isCurrent = true;
    setIsLoading(true);
    setError("");

    const timeoutId = window.setTimeout(() => {
      recipeApi.list(query).then((result) => {
        if (isCurrent) setRecipes(result);
      }).catch((cause: unknown) => {
        if (!isCurrent) return;
        if (cause instanceof ApiError && cause.status === 401) {
          onUnauthorized();
          return;
        }
        setError(cause instanceof Error ? cause.message : "Не удалось загрузить рецепты.");
      }).finally(() => {
        if (isCurrent) setIsLoading(false);
      });
    }, query ? 220 : 0);

    return () => {
      isCurrent = false;
      window.clearTimeout(timeoutId);
    };
  }, [query, reloadKey, onUnauthorized]);

  return (
    <section className="collection" aria-labelledby="collection-title">
      <div className="collection-heading">
        <div>
          <p className="eyebrow">ВАШИ ДОМАШНИЕ РЕЦЕПТЫ</p>
          <h1 id="collection-title">Коллекция</h1>
          <p className="collection-intro">Все любимые блюда — в одном спокойном месте.</p>
        </div>
        <button className="button button--primary create-recipe-button" onClick={onCreate} type="button">
          <span aria-hidden="true">＋</span> Новый рецепт
        </button>
      </div>

      <div className="collection-toolbar">
        <RecipeSearch value={query} onChange={setQuery} />
        <span className="recipe-count" aria-live="polite">
          {isLoading ? "Загружаем…" : `${recipes.length} ${pluralize(recipes.length, "рецепт", "рецепта", "рецептов")}`}
        </span>
      </div>

      {error && (
        <div className="notice notice--error" role="alert">
          <span>{error}</span>
          <button className="button button--quiet" onClick={() => setReloadKey((key) => key + 1)} type="button">Повторить</button>
        </div>
      )}

      {isLoading ? (
        <div className="loading-state" role="status"><span className="loading-spinner" /> Загружаем вашу коллекцию…</div>
      ) : error ? null : recipes.length ? (
        <div className="recipe-grid">
          {recipes.map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} onOpen={onOpen} />)}
        </div>
      ) : query.trim() ? (
        <div className="empty-state">
          <span className="empty-illustration" aria-hidden="true">⌕</span>
          <h2>Ничего не нашлось</h2>
          <p>Попробуйте другое название или тег.</p>
          <button className="button button--secondary" onClick={() => setQuery("")} type="button">Очистить поиск</button>
        </div>
      ) : (
        <div className="empty-state">
          <span className="empty-illustration" aria-hidden="true">✳</span>
          <h2>Здесь будет ваша коллекция</h2>
          <p>Запишите первый рецепт — название, ингредиенты и шаги можно добавить вручную.</p>
          <button className="button button--primary" onClick={onCreate} type="button">Записать первый рецепт</button>
        </div>
      )}
    </section>
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
