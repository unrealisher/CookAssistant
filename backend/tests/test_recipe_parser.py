"""OpenAI recipe extraction tests use fake Responses API results only."""

import json
from types import SimpleNamespace

import pytest

import app.recipe_parser as recipe_parser


def _response(
    output: dict[str, object] | None = None,
    *,
    status: str = "completed",
    refusal: bool = False,
) -> SimpleNamespace:
    return SimpleNamespace(
        output_text=json.dumps(output or {}, ensure_ascii=False),
        status=status,
        output=[SimpleNamespace(content=[SimpleNamespace(type="refusal")])] if refusal else [],
    )


def test_parse_recipe_text_uses_responses_json_schema_and_model(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured: dict[str, object] = {}
    expected = {
        "name": "Борщ",
        "ingredients": [
            {"name": "свёкла", "quantity": "2", "unit": "шт."},
            {"name": "соль", "quantity": "по вкусу", "unit": None},
        ],
        "steps": [
            {"text": "Варить 35 минут при 180 °C.", "duration_minutes": 35, "temperature_c": 180}
        ],
        "tags": ["суп"],
    }

    class FakeResponses:
        def create(self, **kwargs: object) -> SimpleNamespace:
            captured.update(kwargs)
            return _response(expected)

    class FakeOpenAI:
        def __init__(self, **kwargs: object) -> None:
            captured["client"] = kwargs
            self.responses = FakeResponses()

    monkeypatch.setattr(recipe_parser, "OpenAI", FakeOpenAI)
    monkeypatch.setattr(recipe_parser, "load_dotenv", lambda **_: None)
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setenv("COOKASSISTANT_OPENAI_MODEL", "test-model")

    result = recipe_parser.parse_recipe_text(
        "Борщ: свёкла, соль. Варить 35 минут при 180 °C.", ["суп"]
    )

    assert result.name == "Борщ"
    assert result.ingredients[1].quantity == "по вкусу"
    assert captured["model"] == "test-model"
    assert captured["input"]
    assert captured["text"]["format"]["type"] == "json_schema"
    assert captured["text"]["format"]["strict"] is True
    assert captured["text"]["format"]["schema"]["additionalProperties"] is False


def test_parse_recipe_text_fails_without_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(recipe_parser, "load_dotenv", lambda **_: None)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

    with pytest.raises(recipe_parser.RecipeParseError, match="не настроен"):
        recipe_parser.parse_recipe_text("Суп", [])


@pytest.mark.parametrize(
    ("response", "message"),
    [
        (_response(status="incomplete"), "не завершился"),
        (_response(status="completed", refusal=True), "не смог разобрать"),
        (_response(status="completed", output={"invalid": True}), "некорректный разбор"),
    ],
)
def test_parse_recipe_text_handles_incomplete_refusal_and_invalid_output(
    monkeypatch: pytest.MonkeyPatch,
    response: SimpleNamespace,
    message: str,
) -> None:
    class FakeResponses:
        def create(self, **_: object) -> SimpleNamespace:
            return response

    class FakeOpenAI:
        def __init__(self, **_: object) -> None:
            self.responses = FakeResponses()

    monkeypatch.setattr(recipe_parser, "OpenAI", FakeOpenAI)
    monkeypatch.setattr(recipe_parser, "load_dotenv", lambda **_: None)
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")

    with pytest.raises(recipe_parser.RecipeParseError, match=message):
        recipe_parser.parse_recipe_text("Суп", [])
