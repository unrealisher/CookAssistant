"""Create and restore verified SQLite backups for the local application."""

from __future__ import annotations

import argparse
import os
import sqlite3
import tempfile
from contextlib import closing
from datetime import UTC, datetime
from pathlib import Path

from alembic.config import Config
from alembic.script import ScriptDirectory

from app import db


class BackupError(RuntimeError):
    """Raised when a database backup or restore cannot be completed safely."""


def _connect_read_only(path: Path) -> sqlite3.Connection:
    """Open an existing SQLite database without allowing it to be created."""
    return sqlite3.connect(f"{path.resolve().as_uri()}?mode=ro", uri=True)


def _validate_database(path: Path) -> str:
    """Return the Alembic revision after checking integrity and application tables."""
    if not path.is_file():
        raise BackupError(f"Database file does not exist: {path}")

    try:
        with closing(_connect_read_only(path)) as connection:
            integrity = connection.execute("PRAGMA integrity_check").fetchone()
            if integrity is None or integrity[0] != "ok":
                details = integrity[0] if integrity else "no integrity result"
                raise BackupError(f"SQLite integrity check failed for {path}: {details}")

            tables = {
                row[0]
                for row in connection.execute(
                    "SELECT name FROM sqlite_master WHERE type = 'table'"
                )
            }
            if not {"alembic_version", "users", "recipes"} <= tables:
                raise BackupError(f"File is not a migrated CookAssistant database: {path}")

            revisions = [
                row[0]
                for row in connection.execute("SELECT version_num FROM alembic_version")
            ]
            if len(revisions) != 1 or not revisions[0]:
                raise BackupError(f"Database has an invalid Alembic revision: {path}")
            revision = str(revisions[0])
            if revision not in _known_migration_revisions():
                raise BackupError(
                    f"Database revision {revision!r} is not present in this application's "
                    f"migration history: {path}"
                )
            return revision
    except sqlite3.DatabaseError as error:
        raise BackupError(f"Cannot read SQLite database {path}: {error}") from error


def _copy_database(source: Path, destination: Path) -> None:
    """Copy a live SQLite database into a new file using SQLite's backup API."""
    destination.parent.mkdir(parents=True, exist_ok=True)
    # Keep the staging name short because Windows sandbox paths can approach MAX_PATH.
    file_descriptor, temporary_name = tempfile.mkstemp(
        prefix=".ca-", suffix=".tmp", dir=destination.parent
    )
    os.close(file_descriptor)
    temporary_path = Path(temporary_name)
    try:
        with closing(_connect_read_only(source)) as source_connection:
            with closing(sqlite3.connect(temporary_path)) as destination_connection:
                source_connection.backup(destination_connection)
                destination_connection.commit()
        _validate_database(temporary_path)
        os.replace(temporary_path, destination)
    except sqlite3.DatabaseError as error:
        raise BackupError(f"Could not copy SQLite database {source}: {error}") from error
    finally:
        temporary_path.unlink(missing_ok=True)


def _backup_name(prefix: str) -> str:
    timestamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%S.%fZ")
    return f"{prefix}-{timestamp}.sqlite3"


def create_backup(
    *,
    source_path: Path | None = None,
    destination_dir: Path | None = None,
    prefix: str = "cookassistant",
) -> Path | None:
    """Save a consistent snapshot, or return None when the app has no database yet."""
    source = (source_path or db.get_database_path()).resolve()
    if not source.exists():
        return None

    _validate_database(source)
    backup_dir = (destination_dir or (db.get_data_dir() / "backups")).resolve()
    repository_root = Path(db.__file__).resolve().parents[2]
    try:
        backup_dir.relative_to(repository_root)
    except ValueError:
        pass
    else:
        raise BackupError(
            f"Backup directory must be outside the Git repository: {backup_dir}"
        )
    backup_path = backup_dir / _backup_name(prefix)
    _copy_database(source, backup_path)
    return backup_path


def restore_backup(backup_path: Path, *, database_path: Path | None = None) -> Path | None:
    """Restore a verified snapshot, preserving the current database first when present."""
    backup = backup_path.expanduser().resolve()
    database = (database_path or db.get_database_path()).resolve()
    if backup == database:
        raise BackupError("The backup path must not be the live database path")
    _validate_database(backup)

    if database.with_name(f"{database.name}-wal").exists() or database.with_name(
        f"{database.name}-shm"
    ).exists():
        raise BackupError(
            "SQLite sidecar files are present. Stop CookAssistant and retry the restore."
        )

    database.parent.mkdir(parents=True, exist_ok=True)
    safety_backup = None
    if database.exists():
        safety_backup = create_backup(
            source_path=database,
            destination_dir=db.get_data_dir() / "backups",
            prefix="before-restore",
        )

    _copy_database(backup, database)
    return safety_backup


def _alembic_config() -> Config:
    backend_dir = Path(db.__file__).resolve().parents[1]
    config = Config(str(backend_dir / "alembic.ini"))
    config.set_main_option("script_location", str(backend_dir / "alembic"))
    return config


def _known_migration_revisions() -> set[str]:
    """Return every revision this application knows how to upgrade from."""
    return {
        revision.revision
        for revision in ScriptDirectory.from_config(_alembic_config()).walk_revisions()
    }


def verify_migrations() -> str:
    """Apply the current migration chain twice to a disposable database and verify it."""
    previous_data_dir = os.environ.get(db.DATA_DIRECTORY_ENV)
    try:
        with tempfile.TemporaryDirectory(prefix="cookassistant-migration-check-") as temp_dir:
            os.environ[db.DATA_DIRECTORY_ENV] = temp_dir
            db.run_migrations()
            db.run_migrations()
            database_path = Path(temp_dir) / db.DATABASE_FILENAME
            revision = _validate_database(database_path)
            expected_heads = ScriptDirectory.from_config(_alembic_config()).get_heads()
            if [revision] != expected_heads:
                raise BackupError(
                    f"Migration check reached {revision}; expected heads {expected_heads}"
                )
            return revision
    finally:
        if previous_data_dir is None:
            os.environ.pop(db.DATA_DIRECTORY_ENV, None)
        else:
            os.environ[db.DATA_DIRECTORY_ENV] = previous_data_dir


def main(argv: list[str] | None = None) -> int:
    """Run the backup, restore, or migration verification command."""
    parser = argparse.ArgumentParser(description="CookAssistant database maintenance")
    commands = parser.add_subparsers(dest="command", required=True)

    backup_parser = commands.add_parser("backup", help="Create a verified database backup")
    backup_parser.add_argument("--destination-dir", type=Path)

    restore_parser = commands.add_parser("restore", help="Restore a verified backup")
    restore_parser.add_argument("backup_path", type=Path)

    commands.add_parser("verify-migrations", help="Test Alembic migrations on a temp database")

    args = parser.parse_args(argv)
    try:
        if args.command == "backup":
            path = create_backup(destination_dir=args.destination_dir)
            if path is None:
                print("No CookAssistant database exists yet; backup skipped.")
            else:
                print(f"Backup created: {path}")
        elif args.command == "restore":
            safety_backup = restore_backup(args.backup_path)
            if safety_backup is None:
                print("Backup restored. No previous database needed to be preserved.")
            else:
                print(f"Backup restored. Previous database preserved at: {safety_backup}")
        else:
            print(f"Migration check passed at revision {verify_migrations()}.")
    except (BackupError, OSError) as error:
        parser.exit(1, f"Error: {error}\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
