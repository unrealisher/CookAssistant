import { FormEvent, useState } from "react";

import type { Recipe, RecipeDraft } from "../../../entities/recipe/model/types";
import { validateRecipeDraft } from "../../../entities/recipe/lib/draft";
import { ApiError } from "../../../shared/api/client";

interface RecipeEditorProps {
  initialDraft: RecipeDraft;
  isEditing: boolean;
  onCancel: () => void;
  onSave: (recipe: Recipe) => void;
  save: (draft: RecipeDraft) => Promise<Recipe>;
}

export function RecipeEditor({
  initialDraft,
  isEditing,
  onCancel,
  onSave,
  save,
}: RecipeEditorProps) {
  const [draft, setDraft] = useState(initialDraft);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const validationIssues = showValidationErrors ? validateRecipeDraft(draft) : [];
  const nameIssue = validationIssues.find((issue) => issue.field === "name");

  function updateDraft<K extends keyof RecipeDraft>(key: K, value: RecipeDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setShowValidationErrors(true);
    if (validateRecipeDraft(draft).length) return;
    setIsSaving(true);
    try {
      const saved = await save(draft);
      onSave(saved);
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : "Не удалось сохранить рецепт. Проверьте соединение и повторите попытку.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="recipe-editor" onSubmit={handleSubmit}>
      <div className="editor-heading">
        <div>
          <p className="eyebrow">{isEditing ? "РУЧНОЕ РЕДАКТИРОВАНИЕ" : "НОВЫЙ РЕЦЕПТ"}</p>
          <h1>{isEditing ? "Изменить рецепт" : "Записать рецепт"}</h1>
        </div>
      </div>

      <label className="field">
        <span>Название рецепта</span>
        <input
          autoFocus
          maxLength={255}
          name="name"
          placeholder="Например, яблочный пирог"
          required
          aria-invalid={Boolean(nameIssue)}
          aria-describedby={nameIssue ? "recipe-name-error" : undefined}
          value={draft.name}
          onChange={(event) => updateDraft("name", event.target.value)}
        />
      </label>
      {nameIssue && <p className="field-error" id="recipe-name-error" role="alert">{nameIssue.message}</p>}

      <label className="field">
        <span>Исходная заметка <em>необязательно</em></span>
        <textarea
          maxLength={20_000}
          name="original_text"
          placeholder="Сохраните исходный текст или свои заметки"
          rows={3}
          value={draft.original_text}
          onChange={(event) => updateDraft("original_text", event.target.value)}
        />
      </label>

      <section className="editor-section" aria-labelledby="ingredients-title">
        <div className="section-heading">
          <div>
            <h2 id="ingredients-title">Ингредиенты</h2>
            <p>Количество и единицу можно оставить свободной записью.</p>
          </div>
          <button
            className="button button--quiet"
            onClick={() => updateDraft("ingredients", [...draft.ingredients, { name: "", quantity: "", unit: "" }])}
            type="button"
          >
            <span aria-hidden="true">＋</span> Добавить
          </button>
        </div>
        {draft.ingredients.length ? (
          <div className="editor-rows">
            {draft.ingredients.map((ingredient, index) => {
              const issue = validationIssues.find((item) => item.field === "ingredient" && item.index === index);
              const errorId = `ingredient-${index}-error`;
              return (
                <fieldset aria-invalid={Boolean(issue)} className="ingredient-row" key={`ingredient-${index}`}>
                  <legend className="sr-only">Ингредиент {index + 1}</legend>
                  <label className="field field--ingredient-name">
                    <span className="sr-only">Название ингредиента</span>
                    <input
                      aria-invalid={Boolean(issue)}
                      aria-describedby={issue ? errorId : undefined}
                      maxLength={255}
                      placeholder="Ингредиент"
                      value={ingredient.name}
                      onChange={(event) => {
                        const ingredients = [...draft.ingredients];
                        ingredients[index] = { ...ingredient, name: event.target.value };
                        updateDraft("ingredients", ingredients);
                      }}
                    />
                  </label>
                  <label className="field field--amount">
                    <span className="sr-only">Количество</span>
                    <input
                      maxLength={100}
                      placeholder="Количество"
                      value={ingredient.quantity}
                      onChange={(event) => {
                        const ingredients = [...draft.ingredients];
                        ingredients[index] = { ...ingredient, quantity: event.target.value };
                        updateDraft("ingredients", ingredients);
                      }}
                    />
                  </label>
                  <label className="field field--unit">
                    <span className="sr-only">Единица измерения</span>
                    <input
                      maxLength={80}
                      placeholder="Единица"
                      value={ingredient.unit}
                      onChange={(event) => {
                        const ingredients = [...draft.ingredients];
                        ingredients[index] = { ...ingredient, unit: event.target.value };
                        updateDraft("ingredients", ingredients);
                      }}
                    />
                  </label>
                  <button
                    aria-label={`Удалить ингредиент ${index + 1}`}
                    className="icon-button row-remove"
                    onClick={() => updateDraft("ingredients", draft.ingredients.filter((_, itemIndex) => itemIndex !== index))}
                    type="button"
                  >
                    ×
                  </button>
                  {issue && <p className="field-error" id={errorId} role="alert">{issue.message}</p>}
                </fieldset>
              );
            })}
          </div>
        ) : (
          <p className="editor-empty">Добавьте ингредиенты или оставьте список пустым.</p>
        )}
      </section>

      <section className="editor-section" aria-labelledby="steps-title">
        <div className="section-heading">
          <div>
            <h2 id="steps-title">Приготовление</h2>
            <p>Время и температура относятся к конкретному шагу.</p>
          </div>
          <button
            className="button button--quiet"
            onClick={() => updateDraft("steps", [...draft.steps, { text: "", duration_minutes: "", temperature_c: "" }])}
            type="button"
          >
            <span aria-hidden="true">＋</span> Добавить
          </button>
        </div>
        {draft.steps.length ? (
          <div className="step-editor-list">
            {draft.steps.map((step, index) => {
              const issue = validationIssues.find((item) => item.field === "step" && item.index === index);
              const errorId = `step-${index}-error`;
              return (
                <fieldset aria-invalid={Boolean(issue)} className="step-editor-row" key={`step-${index}`}>
                  <legend className="sr-only">Шаг {index + 1}</legend>
                  <span className="step-editor-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                  <label className="field step-text-field">
                    <span className="sr-only">Текст шага {index + 1}</span>
                    <textarea
                      aria-invalid={Boolean(issue)}
                      aria-describedby={issue ? errorId : undefined}
                      maxLength={4000}
                      placeholder="Опишите шаг приготовления"
                      required={Boolean(step.text.trim())}
                      rows={2}
                      value={step.text}
                      onChange={(event) => {
                        const steps = [...draft.steps];
                        steps[index] = { ...step, text: event.target.value };
                        updateDraft("steps", steps);
                      }}
                    />
                  </label>
                  <div className="step-meta-fields">
                    <label className="field">
                      <span>Минуты</span>
                      <input
                        min="0"
                        max="100000"
                        type="number"
                        value={step.duration_minutes}
                        onChange={(event) => {
                          const steps = [...draft.steps];
                          steps[index] = { ...step, duration_minutes: event.target.value };
                          updateDraft("steps", steps);
                        }}
                      />
                    </label>
                    <label className="field">
                      <span>°C</span>
                      <input
                        min="-273.15"
                        max="10000"
                        step="any"
                        type="number"
                        value={step.temperature_c}
                        onChange={(event) => {
                          const steps = [...draft.steps];
                          steps[index] = { ...step, temperature_c: event.target.value };
                          updateDraft("steps", steps);
                        }}
                      />
                    </label>
                  </div>
                  <button
                    aria-label={`Удалить шаг ${index + 1}`}
                    className="icon-button row-remove"
                    onClick={() => updateDraft("steps", draft.steps.filter((_, itemIndex) => itemIndex !== index))}
                    type="button"
                  >
                    ×
                  </button>
                  {issue && <p className="field-error" id={errorId} role="alert">{issue.message}</p>}
                </fieldset>
              );
            })}
          </div>
        ) : (
          <p className="editor-empty">Добавьте шаги приготовления или оставьте список пустым.</p>
        )}
      </section>

      <section className="editor-section" aria-labelledby="tags-title">
        <div className="section-heading">
          <div>
            <h2 id="tags-title">Теги</h2>
            <p>По ним можно будет найти рецепт в коллекции.</p>
          </div>
          <button
            className="button button--quiet"
            onClick={() => updateDraft("tags", [...draft.tags, ""])}
            type="button"
          >
            <span aria-hidden="true">＋</span> Добавить
          </button>
        </div>
        {draft.tags.length ? (
          <div className="tag-editor-list">
            {draft.tags.map((tag, index) => (
              <div className="tag-editor-row" key={`tag-${index}`}>
                <input
                  aria-label={`Тег ${index + 1}`}
                  maxLength={80}
                  placeholder="Например, завтрак"
                  value={tag}
                  onChange={(event) => {
                    const tags = [...draft.tags];
                    tags[index] = event.target.value;
                    updateDraft("tags", tags);
                  }}
                />
                <button
                  aria-label={`Удалить тег ${index + 1}`}
                  className="icon-button row-remove"
                  onClick={() => updateDraft("tags", draft.tags.filter((_, itemIndex) => itemIndex !== index))}
                  type="button"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="editor-empty">Теги необязательны.</p>
        )}
      </section>

      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="editor-actions">
        <button className="button button--secondary" disabled={isSaving} onClick={onCancel} type="button">
          Отмена
        </button>
        <button className="button button--primary" disabled={isSaving} type="submit">
          {isSaving ? "Сохраняем…" : isEditing ? "Сохранить изменения" : "Сохранить рецепт"}
        </button>
      </div>
    </form>
  );
}
