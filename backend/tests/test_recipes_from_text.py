"""Tests for the free-form recipe endpoint with an injected parser."""

from fastapi.testclient import TestClient

from app import main
from app.api.recipes import get_recipe_parser
from app.recipe_parser import ParsedIngredient, ParsedRecipe, ParsedStep, RecipeParseError


def _sign_in(client: TestClient) -> None:
    response = client.post(
        "/api/v1/auth/setup",
        json={"username": "owner", "password": "local-password-123"},
    )
    assert response.status_code == 201


def test_create_from_text_saves_raw_text_and_reuses_existing_tags(client: TestClient) -> None:
    _sign_in(client)
    existing = client.post(
        "/api/v1/recipes",
        json={
            "name": "Первый суп",
            "ingredients": [],
            "steps": [],
            "tags": ["soup"],
        },
    )
    assert existing.status_code == 201

    raw_text = "  Борщ: свёкла, соль по вкусу. Варить 35 минут.  "
    observed: dict[str, object] = {}

    def fake_parser(text: str, existing_tags: list[str]) -> ParsedRecipe:
        observed["text"] = text
        observed["existing_tags"] = existing_tags
        return ParsedRecipe(
            name="Борщ",
            ingredients=[
                ParsedIngredient(name="свёкла", quantity="2", unit="шт."),
                ParsedIngredient(name="соль", quantity="по вкусу", unit=None),
            ],
            steps=[
                ParsedStep(
                    text="Варить 35 минут.",
                    duration_minutes=35,
                    temperature_c=None,
                )
            ],
            tags=["SOUP", "обед"],
        )

    main.app.dependency_overrides[get_recipe_parser] = lambda: fake_parser
    try:
        response = client.post("/api/v1/recipes/from-text", json={"text": raw_text})
    finally:
        main.app.dependency_overrides.pop(get_recipe_parser, None)

    assert response.status_code == 201
    recipe = response.json()
    assert recipe["name"] == "Борщ"
    assert recipe["original_text"] == raw_text
    assert recipe["ingredients"][0] == {
        "id": recipe["ingredients"][0]["id"],
        "name": "свёкла",
        "quantity": "2",
        "unit": "шт.",
        "position": 0,
    }
    assert recipe["steps"][0]["duration_minutes"] == 35
    assert recipe["tags"] == ["soup", "обед"]
    assert observed == {"text": raw_text, "existing_tags": ["soup"]}


def test_create_from_text_rejects_blank_text_without_calling_ai(client: TestClient) -> None:
    _sign_in(client)

    response = client.post("/api/v1/recipes/from-text", json={"text": "   "})

    assert response.status_code == 422


def test_create_from_text_requires_authentication(client: TestClient) -> None:
    response = client.post("/api/v1/recipes/from-text", json={"text": "Суп"})

    assert response.status_code == 401


def test_create_from_text_returns_safe_parser_error(client: TestClient) -> None:
    _sign_in(client)

    def fail_parser(_: str, __: list[str]) -> ParsedRecipe:
        raise RecipeParseError("Сервис ИИ-разбора сейчас недоступен. Попробуйте ещё раз.")

    main.app.dependency_overrides[get_recipe_parser] = lambda: fail_parser
    try:
        response = client.post("/api/v1/recipes/from-text", json={"text": "Суп"})
    finally:
        main.app.dependency_overrides.pop(get_recipe_parser, None)

    assert response.status_code == 503
    assert response.json()["detail"] == "Сервис ИИ-разбора сейчас недоступен. Попробуйте ещё раз."
