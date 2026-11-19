"""OpenRouter recipe extraction tests use fake Responses API results only."""

import json

import httpx
import pytest

import app.recipe_parser as recipe_parser


def _response(
    output: dict[str, object] | None = None,
    *,
    status: str = "completed",
    refusal: bool = False,
    include_text: bool = True,
) -> dict[str, object]:
    content: list[dict[str, object]] = []
    if refusal:
        content = [{"type": "refusal", "refusal": "not a recipe"}]
    elif include_text:
        content = [{"type": "output_text", "text": json.dumps(output or {}, ensure_ascii=False)}]

    return {
        "status": status,
        "output": [{"type": "message", "content": content}],
    }


class FakeHTTPResponse:
    def __init__(self, payload: dict[str, object]) -> None:
        self.payload = payload

    def raise_for_status(self) -> None:
        return None

    def json(self) -> dict[str, object]:
        return self.payload


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

    def fake_post(url: str, **kwargs: object) -> FakeHTTPResponse:
        captured["url"] = url
        captured.update(kwargs)
        return FakeHTTPResponse(_response(expected))

    monkeypatch.setattr(recipe_parser.httpx, "post", fake_post)
    monkeypatch.setattr(recipe_parser, "load_dotenv", lambda **_: None)
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")
    monkeypatch.setenv("COOKASSISTANT_OPENROUTER_MODEL", "test-model")

    result = recipe_parser.parse_recipe_text(
        "Борщ: свёкла, соль. Варить 35 минут при 180 °C.", ["суп"]
    )

    assert result.name == "Борщ"
    assert result.ingredients[1].quantity == "по вкусу"
    assert captured["url"] == "https://openrouter.ai/api/v1/responses"
    assert captured["headers"] == {"Authorization": "Bearer test-key"}
    assert captured["timeout"] == 45.0
    assert captured["json"]["model"] == "test-model"
    assert captured["json"]["store"] is False
    assert captured["json"]["input"]
    assert captured["json"]["text"]["format"]["type"] == "json_schema"
    assert captured["json"]["text"]["format"]["strict"] is True
    assert captured["json"]["text"]["format"]["schema"]["additionalProperties"] is False


def test_parse_recipe_text_uses_default_openrouter_model(monkeypatch: pytest.MonkeyPatch) -> None:
    captured: dict[str, object] = {}

    def fake_post(_: str, **kwargs: object) -> FakeHTTPResponse:
        captured.update(kwargs["json"])
        return FakeHTTPResponse(
            _response(
                {
                    "name": "Суп",
                    "ingredients": [],
                    "steps": [
                        {
                            "text": "Сварить суп",
                            "duration_minutes": None,
                            "temperature_c": None,
                        }
                    ],
                    "tags": ["суп"],
                }
            )
        )

    monkeypatch.setattr(recipe_parser.httpx, "post", fake_post)
    monkeypatch.setattr(recipe_parser, "load_dotenv", lambda **_: None)
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")
    monkeypatch.delenv("COOKASSISTANT_OPENROUTER_MODEL", raising=False)

    recipe_parser.parse_recipe_text("Суп", [])

    assert captured["model"] == recipe_parser.DEFAULT_OPENROUTER_MODEL


def test_parse_recipe_text_fails_without_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(recipe_parser, "load_dotenv", lambda **_: None)
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)

    with pytest.raises(recipe_parser.RecipeParseError, match="не настроен"):
        recipe_parser.parse_recipe_text("Суп", [])


@pytest.mark.parametrize(
    ("response", "message"),
    [
        (_response(status="incomplete"), "не завершился"),
        (_response(status="completed", refusal=True), "не смог разобрать"),
        (_response(status="completed", output={"invalid": True}), "некорректный разбор"),
        (_response(status="completed", include_text=False), "некорректный разбор"),
    ],
)
def test_parse_recipe_text_handles_incomplete_refusal_and_invalid_output(
    monkeypatch: pytest.MonkeyPatch,
    response: dict[str, object],
    message: str,
) -> None:
    monkeypatch.setattr(
        recipe_parser.httpx,
        "post",
        lambda *_args, **_kwargs: FakeHTTPResponse(response),
    )
    monkeypatch.setattr(recipe_parser, "load_dotenv", lambda **_: None)
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")

    with pytest.raises(recipe_parser.RecipeParseError, match=message):
        recipe_parser.parse_recipe_text("Суп", [])


def test_parse_recipe_text_sanitizes_http_errors(monkeypatch: pytest.MonkeyPatch) -> None:
    def fake_post(*_: object, **__: object) -> FakeHTTPResponse:
        raise httpx.ConnectError(
            "private provider detail",
            request=httpx.Request("POST", "https://openrouter.ai/api/v1/responses"),
        )

    monkeypatch.setattr(recipe_parser.httpx, "post", fake_post)
    monkeypatch.setattr(recipe_parser, "load_dotenv", lambda **_: None)
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")

    with pytest.raises(recipe_parser.RecipeParseError) as error:
        recipe_parser.parse_recipe_text("Суп", [])

    assert str(error.value) == "Сервис ИИ-разбора сейчас недоступен. Попробуйте ещё раз."
    assert "private provider detail" not in str(error.value)
