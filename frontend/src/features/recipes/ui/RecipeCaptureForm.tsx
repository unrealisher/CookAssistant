import { FormEvent, useState } from "react";

import type { Recipe } from "../../../entities/recipe/model/types";
import { ApiError } from "../../../shared/api/client";

interface RecipeCaptureFormProps {
  onCancel: () => void;
  onSave: (recipe: Recipe) => void;
  onUnauthorized: () => void;
  save: (text: string) => Promise<Recipe>;
}

export function RecipeCaptureForm({
  onCancel,
  onSave,
  onUnauthorized,
  save,
}: RecipeCaptureFormProps) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!text.trim()) {
      setError("Добавьте текст рецепта перед сохранением.");
      return;
    }

    setIsSaving(true);
    try {
      onSave(await save(text));
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      setError(
        cause instanceof ApiError
          ? cause.message
          : "Не удалось разобрать рецепт. Проверьте соединение и повторите попытку.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="recipe-capture" onSubmit={handleSubmit}>
      <div className="editor-heading">
        <p className="eyebrow">НОВЫЙ РЕЦЕПТ</p>
        <h1>Записать рецепт</h1>
        <p className="capture-intro">
          Вставьте рецепт или надиктуйте его микрофоном клавиатуры. Мы выделим ингредиенты,
          шаги и теги, а исходный текст сохраним вместе с рецептом.
        </p>
      </div>

      <label className="field">
        <span>Текст рецепта</span>
        <textarea
          autoFocus
          className="recipe-capture-input"
          maxLength={20_000}
          name="recipe_text"
          placeholder="Например: Для теста смешать 500 г муки, 250 мл молока и щепотку соли. Дать постоять 30 минут…"
          required
          rows={12}
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
      </label>

      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="editor-actions">
        <button className="button button--secondary" disabled={isSaving} onClick={onCancel} type="button">
          Отмена
        </button>
        <button className="button button--primary" disabled={isSaving} type="submit">
          {isSaving ? "Разбираем рецепт…" : "Сохранить рецепт"}
        </button>
      </div>
    </form>
  );
}