import { useEffect, useState } from "react";

import { recipeApi } from "../../entities/recipe/api/recipe-api";
import { toRecipeDraft, toRecipeInput } from "../../entities/recipe/lib/draft";
import type { Recipe, RecipeDraft } from "../../entities/recipe/model/types";
import { ApiError } from "../../shared/api/client";
import { RecipeCaptureForm } from "../../features/recipes/ui/RecipeCaptureForm";
import { RecipeEditor } from "../../features/recipes/ui/RecipeEditor";

interface EditorPageProps {
  recipeId?: number;
  onCancel: () => void;
  onSaved: (recipe: Recipe) => void;
  onUnauthorized: () => void;
}

export function EditorPage({ recipeId, onCancel, onSaved, onUnauthorized }: EditorPageProps) {
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(recipeId));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!recipeId) return;
    let isCurrent = true;
    setIsLoading(true);
    recipeApi.get(recipeId).then((result) => {
      if (isCurrent) setRecipe(result);
    }).catch((cause: unknown) => {
      if (!isCurrent) return;
      if (cause instanceof ApiError && cause.status === 401) {
        onUnauthorized();
        return;
      }
      setError(cause instanceof Error ? cause.message : "Не удалось открыть рецепт для изменения.");
    }).finally(() => {
      if (isCurrent) setIsLoading(false);
    });
    return () => { isCurrent = false; };
  }, [recipeId, onUnauthorized]);

  if (isLoading) return <div className="loading-state" role="status"><span className="loading-spinner" /> Загружаем рецепт…</div>;
  if (error) {
    return <div className="page-message"><p className="notice notice--error" role="alert">{error}</p><button className="button button--secondary" onClick={onCancel} type="button">Назад</button></div>;
  }

  if (!recipeId) {
    return (
      <div className="editor-page">
        <button className="back-link" onClick={onCancel} type="button"><span aria-hidden="true">←</span> Назад</button>
        <RecipeCaptureForm
          onCancel={onCancel}
          onSave={onSaved}
          onUnauthorized={onUnauthorized}
          save={recipeApi.createFromText}
        />
      </div>
    );
  }

  const currentRecipeId = recipeId;
  if (!currentRecipeId || !recipe) return null;

  async function save(draft: RecipeDraft) {
    const data = toRecipeInput(draft);
    try {
      return await recipeApi.update(currentRecipeId, data);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      throw cause;
    }
  }

  return (
    <div className="editor-page">
      <button className="back-link" onClick={onCancel} type="button"><span aria-hidden="true">←</span> Назад</button>
      <RecipeEditor
        initialDraft={toRecipeDraft(recipe)}
        isEditing
        onCancel={onCancel}
        onSave={onSaved}
        save={save}
      />
    </div>
  );
}