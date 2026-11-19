/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Recipe } from "../../../entities/recipe/model/types";
import { ApiError } from "../../../shared/api/client";
import { RecipeCaptureForm } from "./RecipeCaptureForm";

afterEach(() => cleanup());

describe("RecipeCaptureForm", () => {
  it("keeps the text after an error, retries it, and passes the saved recipe to onSave", async () => {
    const recipe: Recipe = {
      id: 7,
      name: "Яблочный пирог",
      original_text: "Пирог с яблоками",
      ingredients: [],
      steps: [],
      tags: ["десерт"],
      created_at: "2026-11-19T12:00:00Z",
      updated_at: "2026-11-19T12:00:00Z",
    };
    const text = "Пирог с яблоками";
    const save = vi.fn<(value: string) => Promise<Recipe>>();
    save
      .mockRejectedValueOnce(new ApiError("Сервис ИИ-разбора сейчас недоступен.", 503))
      .mockResolvedValueOnce(recipe);
    const onSave = vi.fn<(value: Recipe) => void>();

    render(
      <RecipeCaptureForm
        onCancel={vi.fn()}
        onSave={onSave}
        onUnauthorized={vi.fn()}
        save={save}
      />,
    );

    const textarea = screen.getByRole("textbox", { name: "Текст рецепта" });
    fireEvent.change(textarea, { target: { value: text } });
    fireEvent.click(screen.getByRole("button", { name: "Сохранить рецепт" }));

    const error = await screen.findByRole("alert");
    expect(error.textContent).toContain("Сервис ИИ-разбора");
    expect((textarea as HTMLTextAreaElement).value).toBe(text);

    fireEvent.click(screen.getByRole("button", { name: "Сохранить рецепт" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith(recipe));
    expect(save).toHaveBeenCalledTimes(2);
    expect(save).toHaveBeenNthCalledWith(1, text);
    expect(save).toHaveBeenNthCalledWith(2, text);
  });
});