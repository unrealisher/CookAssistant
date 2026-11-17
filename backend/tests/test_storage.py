"""Tests for SQLite data placement and Alembic migrations."""

from __future__ import annotations

import sqlite3
from pathlib import Path

import pytest

from app import db


def test_data_directory_uses_configured_path_outside_repository(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    configured = tmp_path / "cookassistant-data"
    monkeypatch.setenv("COOKASSISTANT_DATA_DIR", str(configured))

    assert db.get_data_dir() == configured
    assert db.get_database_path() == configured / "cookassistant.sqlite3"
    assert configured.is_dir()


def test_data_directory_defaults_to_local_app_data(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    local_app_data = tmp_path / "LocalAppData"
    monkeypatch.delenv("COOKASSISTANT_DATA_DIR", raising=False)
    monkeypatch.setenv("LOCALAPPDATA", str(local_app_data))
    monkeypatch.delenv("XDG_DATA_HOME", raising=False)

    assert db.get_data_dir() == local_app_data / "CookAssistant"


def test_data_directory_falls_back_to_xdg_data_home(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    xdg_data_home = tmp_path / "xdg-data"
    monkeypatch.delenv("COOKASSISTANT_DATA_DIR", raising=False)
    monkeypatch.delenv("LOCALAPPDATA", raising=False)
    monkeypatch.setenv("XDG_DATA_HOME", str(xdg_data_home))

    assert db.get_data_dir() == xdg_data_home / "CookAssistant"


def test_data_directory_refuses_a_path_inside_the_repository(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    repository_root = Path(db.__file__).resolve().parents[2]
    monkeypatch.setenv("COOKASSISTANT_DATA_DIR", str(repository_root / "data"))

    with pytest.raises(ValueError, match="outside the Git repository"):
        db.get_data_dir()


def test_sqlite_engine_enables_foreign_keys(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    monkeypatch.setenv("COOKASSISTANT_DATA_DIR", str(tmp_path / "database"))

    with db._current_engine().connect() as connection:
        assert connection.exec_driver_sql("PRAGMA foreign_keys").scalar_one() == 1


def test_run_migrations_creates_owner_recipe_and_session_tables(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    data_dir = tmp_path / "database"
    monkeypatch.setenv("COOKASSISTANT_DATA_DIR", str(data_dir))

    db.run_migrations()
    db.run_migrations()

    database_path = data_dir / db.DATABASE_FILENAME
    with sqlite3.connect(database_path) as connection:
        tables = {
            row[0]
            for row in connection.execute(
                "SELECT name FROM sqlite_master WHERE type='table'"
            ).fetchall()
        }

    assert {
        "alembic_version",
        "users",
        "auth_sessions",
        "recipes",
        "ingredients",
        "steps",
        "tags",
        "recipe_tags",
    } <= tables


def test_migration_enforces_single_owner_id(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    data_dir = tmp_path / "single-owner-database"
    monkeypatch.setenv("COOKASSISTANT_DATA_DIR", str(data_dir))
    db.run_migrations()

    with sqlite3.connect(data_dir / db.DATABASE_FILENAME) as connection:
        connection.execute(
            "INSERT INTO users (id, username, password_hash) VALUES (1, 'owner', 'hash')"
        )
        with pytest.raises(sqlite3.IntegrityError, match="CHECK constraint failed"):
            connection.execute(
                "INSERT INTO users (id, username, password_hash) VALUES (2, 'other', 'hash')"
            )
