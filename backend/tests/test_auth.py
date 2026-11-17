"""Authentication and first-owner setup API tests."""

from fastapi.testclient import TestClient


def _credentials(username: str = "owner", password: str = "local-password-123") -> dict[str, str]:
    return {"username": username, "password": password}


def test_initial_setup_creates_one_owner_and_closes_registration(client: TestClient) -> None:
    assert client.get("/api/v1/auth/status").json() == {"setup_required": True}

    response = client.post("/api/v1/auth/setup", json=_credentials("  owner  "))

    assert response.status_code == 201
    assert response.json() == {"id": 1, "username": "owner"}
    set_cookie = response.headers["set-cookie"].lower()
    assert "httponly" in set_cookie
    assert "samesite=lax" in set_cookie
    assert "path=/api/v1" in set_cookie
    assert client.get("/api/v1/auth/status").json() == {"setup_required": False}
    assert client.get("/api/v1/auth/me").json() == {"id": 1, "username": "owner"}

    second_setup = client.post("/api/v1/auth/setup", json=_credentials("another-owner"))
    assert second_setup.status_code == 409


def test_setup_rejects_short_password(client: TestClient) -> None:
    response = client.post(
        "/api/v1/auth/setup",
        json={"username": "owner", "password": "short"},
    )

    assert response.status_code == 422
    assert client.get("/api/v1/auth/status").json() == {"setup_required": True}


def test_login_and_logout_issue_and_revoke_session(client: TestClient) -> None:
    client.post("/api/v1/auth/setup", json=_credentials())
    client.post("/api/v1/auth/logout")
    assert client.get("/api/v1/auth/me").status_code == 401

    bad_login = client.post(
        "/api/v1/auth/login",
        json={"username": "owner", "password": "incorrect-password"},
    )
    assert bad_login.status_code == 401

    login = client.post("/api/v1/auth/login", json=_credentials())
    assert login.status_code == 200
    assert login.json() == {"id": 1, "username": "owner"}
    assert client.get("/api/v1/auth/me").status_code == 200

    logout = client.post("/api/v1/auth/logout")
    assert logout.status_code == 204
    assert client.get("/api/v1/auth/me").status_code == 401
