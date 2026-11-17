"""Private structured recipe API tests."""

from fastapi.testclient import TestClient


def _sign_in(client: TestClient) -> None:
    response = client.post(
        "/api/v1/auth/setup",
        json={"username": "owner", "password": "local-password-123"},
    )
    assert response.status_code == 201


def _recipe_payload(name: str = "Borscht") -> dict[str, object]:
    return {
        "name": name,
        "original_text": "Simmer the vegetables until tender.",
        "ingredients": [
            {"name": "beetroot", "quantity": "2 medium", "unit": None},
            {"name": "salt", "quantity": "to taste", "unit": None},
        ],
        "steps": [
            {
                "text": "Simmer the vegetables.",
                "duration_minutes": 35,
                "temperature_c": None,
            },
            {
                "text": "Cool before serving.",
                "duration_minutes": None,
                "temperature_c": 4,
            },
        ],
        "tags": ["soup", "Dinner"],
    }


def test_recipe_routes_require_authentication(client: TestClient) -> None:
    response = client.get("/api/v1/recipes")
    assert response.status_code == 401

    response = client.post("/api/v1/recipes", json=_recipe_payload())
    assert response.status_code == 401


def test_create_search_update_and_delete_recipe(client: TestClient) -> None:
    _sign_in(client)

    created = client.post("/api/v1/recipes", json=_recipe_payload())
    assert created.status_code == 201
    recipe = created.json()
    recipe_id = recipe["id"]
    assert recipe["name"] == "Borscht"
    assert recipe["ingredients"][0]["quantity"] == "2 medium"
    assert recipe["ingredients"][1]["quantity"] == "to taste"
    assert recipe["steps"][0]["duration_minutes"] == 35
    assert recipe["steps"][1]["temperature_c"] == 4
    assert recipe["tags"] == ["Dinner", "soup"]

    fetched = client.get(f"/api/v1/recipes/{recipe_id}")
    assert fetched.status_code == 200
    assert fetched.json() == recipe

    assert len(client.get("/api/v1/recipes", params={"q": "bors"}).json()) == 1
    assert len(client.get("/api/v1/recipes", params={"q": "SOUP"}).json()) == 1
    assert client.get("/api/v1/recipes", params={"q": "beetroot"}).json() == []

    updated = client.patch(
        f"/api/v1/recipes/{recipe_id}",
        json={"name": "Borscht with dill", "ingredients": [], "tags": ["Family"]},
    )
    assert updated.status_code == 200
    assert updated.json()["name"] == "Borscht with dill"
    assert updated.json()["original_text"] == "Simmer the vegetables until tender."
    assert updated.json()["ingredients"] == []
    assert updated.json()["tags"] == ["Family"]

    deleted = client.delete(f"/api/v1/recipes/{recipe_id}")
    assert deleted.status_code == 204
    assert client.get(f"/api/v1/recipes/{recipe_id}").status_code == 404


def test_recipes_reuse_tags_and_reject_blank_names(client: TestClient) -> None:
    _sign_in(client)
    first = client.post("/api/v1/recipes", json=_recipe_payload("First recipe"))
    assert first.status_code == 201

    second_payload = _recipe_payload("Second recipe")
    second_payload["tags"] = ["SOUP"]
    second = client.post("/api/v1/recipes", json=second_payload)
    assert second.status_code == 201
    assert second.json()["tags"] == ["soup"]

    invalid = client.post("/api/v1/recipes", json={**_recipe_payload(), "name": "  "})
    assert invalid.status_code == 422
