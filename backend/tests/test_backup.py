"""Tests for safe SQLite backup, restore, and migration verification."""

from __future__ import annotations

import sqlite3
from pathlib import Path

import pytest

from app import backup, db
from app.backup import BackupError, create_backup, restore_backup, verify_migrations


def test_backup_skips_when_database_does_not_exist(tmp_path: Path) -> None:
    database_path = tmp_path / "not-created.sqlite3"

    assert create_backup(
        source_path=database_path,
        destination_dir=tmp_path / "backups",
    ) is None
    assert not (tmp_path / "backups").exists()


def test_backup_rejects_destination_inside_repository(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    monkeypatch.setenv(db.DATA_DIRECTORY_ENV, str(tmp_path / "app-data"))
    db.run_migrations()
    repository_root = Path(db.__file__).resolve().parents[2]
    forbidden_directory = repository_root / "test-backups"

    with pytest.raises(BackupError, match="must be outside the Git repository"):
        create_backup(destination_dir=forbidden_directory)

    assert not forbidden_directory.exists()


def test_backup_allows_explicit_destination_outside_repository(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    monkeypatch.setenv(db.DATA_DIRECTORY_ENV, str(tmp_path / "app-data"))
    db.run_migrations()
    external_directory = tmp_path / "external-backups"

    backup_path = create_backup(destination_dir=external_directory)

    assert backup_path is not None
    assert backup_path.parent == external_directory
    assert backup_path.is_file()


def test_backup_and_restore_preserve_live_database(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    data_dir = tmp_path / "app-data"
    monkeypatch.setenv(db.DATA_DIRECTORY_ENV, str(data_dir))
    db.run_migrations()
    database_path = db.get_database_path()
    with sqlite3.connect(database_path) as connection:
        connection.execute(
            "INSERT INTO users (id, username, password_hash) VALUES (1, 'owner', 'hash')"
        )
    connection.close()

    backup_path = create_backup()
    assert backup_path is not None
    assert backup_path.parent == data_dir / "backups"

    with sqlite3.connect(database_path) as connection:
        connection.execute("UPDATE users SET username = 'changed' WHERE id = 1")
    connection.close()

    safety_backup = restore_backup(backup_path)

    assert safety_backup is not None
    assert safety_backup.name.startswith("before-restore-")
    with sqlite3.connect(database_path) as connection:
        restored_username = connection.execute("SELECT username FROM users WHERE id = 1").fetchone()
    with sqlite3.connect(safety_backup) as connection:
        preserved_username = connection.execute(
            "SELECT username FROM users WHERE id = 1"
        ).fetchone()

    assert restored_username == ("owner",)
    assert preserved_username == ("changed",)


def test_restore_rejects_invalid_backup_without_changing_live_database(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    data_dir = tmp_path / "app-data"
    monkeypatch.setenv(db.DATA_DIRECTORY_ENV, str(data_dir))
    db.run_migrations()
    database_path = db.get_database_path()
    with sqlite3.connect(database_path) as connection:
        connection.execute(
            "INSERT INTO users (id, username, password_hash) VALUES (1, 'owner', 'hash')"
        )

    invalid_backup = tmp_path / "invalid.sqlite3"
    invalid_backup.write_text("not a SQLite database", encoding="utf-8")

    with pytest.raises(BackupError, match="Cannot read SQLite database"):
        restore_backup(invalid_backup)

    with sqlite3.connect(database_path) as connection:
        username = connection.execute("SELECT username FROM users WHERE id = 1").fetchone()
    assert username == ("owner",)


def test_restore_refuses_sqlite_sidecars(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    data_dir = tmp_path / "app-data"
    monkeypatch.setenv(db.DATA_DIRECTORY_ENV, str(data_dir))
    db.run_migrations()
    database_path = db.get_database_path()
    backup_path = create_backup()
    assert backup_path is not None
    database_path.with_name(f"{database_path.name}-wal").touch()

    with pytest.raises(BackupError, match="Stop CookAssistant"):
        restore_backup(backup_path)


def test_database_validation_rejects_unknown_migration_revision(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    data_dir = tmp_path / "app-data"
    monkeypatch.setenv(db.DATA_DIRECTORY_ENV, str(data_dir))
    db.run_migrations()
    database_path = db.get_database_path()
    with sqlite3.connect(database_path) as connection:
        connection.execute("UPDATE alembic_version SET version_num = 'unknown_revision'")

    with pytest.raises(BackupError, match="not present in this application's migration history"):
        backup._validate_database(database_path)


def test_database_validation_accepts_known_older_migration_revision(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    data_dir = tmp_path / "app-data"
    monkeypatch.setenv(db.DATA_DIRECTORY_ENV, str(data_dir))
    db.run_migrations()
    database_path = db.get_database_path()
    older_revision = "known_older_revision"
    with sqlite3.connect(database_path) as connection:
        connection.execute("UPDATE alembic_version SET version_num = ?", (older_revision,))

    class FakeRevision:
        def __init__(self, revision: str) -> None:
            self.revision = revision

    class FakeScriptDirectory:
        def walk_revisions(self) -> list[FakeRevision]:
            return [FakeRevision("0001_initial_data_model"), FakeRevision(older_revision)]

    monkeypatch.setattr(
        backup.ScriptDirectory,
        "from_config",
        classmethod(lambda _class, _config: FakeScriptDirectory()),
    )

    assert backup._validate_database(database_path) == older_revision


def test_verify_migrations_uses_a_disposable_database() -> None:
    assert verify_migrations() == "0001_initial_data_model"
