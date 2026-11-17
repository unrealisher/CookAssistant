"""SQLite configuration and database session dependencies."""

from __future__ import annotations

import os
from collections.abc import Generator
from functools import lru_cache
from pathlib import Path

from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine, URL
from sqlalchemy.orm import DeclarativeBase, Session

from alembic import command
from alembic.config import Config

DATABASE_FILENAME = "cookassistant.sqlite3"
DATA_DIRECTORY_ENV = "COOKASSISTANT_DATA_DIR"


class Base(DeclarativeBase):
    """Base class for application ORM models."""


def get_data_dir() -> Path:
    """Return the persistent data directory, creating it outside the repository."""
    configured_dir = os.environ.get(DATA_DIRECTORY_ENV)
    if configured_dir:
        data_dir = Path(configured_dir).expanduser()
    elif os.environ.get("LOCALAPPDATA"):
        data_dir = Path(os.environ["LOCALAPPDATA"]) / "CookAssistant"
    elif os.environ.get("XDG_DATA_HOME"):
        data_dir = Path(os.environ["XDG_DATA_HOME"]) / "CookAssistant"
    else:
        data_dir = Path.home() / ".local" / "share" / "CookAssistant"

    data_dir = data_dir.resolve()
    repository_root = Path(__file__).resolve().parents[2]
    try:
        data_dir.relative_to(repository_root)
    except ValueError:
        pass
    else:
        raise ValueError("CookAssistant data must be stored outside the Git repository")

    data_dir.mkdir(parents=True, exist_ok=True)
    return data_dir


def get_database_path() -> Path:
    """Return the SQLite database path inside the persistent data directory."""
    return get_data_dir() / DATABASE_FILENAME


def _database_url() -> URL:
    return URL.create("sqlite", database=str(get_database_path()))


def get_database_url() -> str:
    """Return a SQLAlchemy URL for the configured database."""
    return str(_database_url())


def _configure_sqlite(engine: Engine) -> None:
    @event.listens_for(engine, "connect")
    def enable_foreign_keys(connection: object, _record: object) -> None:
        cursor = connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


@lru_cache(maxsize=4)
def _engine_for_url(url: str) -> Engine:
    engine = create_engine(
        url,
        connect_args={"check_same_thread": False},
        pool_pre_ping=True,
    )
    _configure_sqlite(engine)
    return engine


def _current_engine() -> Engine:
    return _engine_for_url(str(_database_url()))


def get_db() -> Generator[Session, None, None]:
    """Yield a SQLAlchemy session for FastAPI dependencies."""
    with Session(_current_engine()) as session:
        yield session


def run_migrations() -> None:
    """Apply all Alembic migrations to the configured local database."""
    backend_dir = Path(__file__).resolve().parents[1]
    config = Config(str(backend_dir / "alembic.ini"))
    config.set_main_option("script_location", str(backend_dir / "alembic"))
    config.set_main_option("sqlalchemy.url", get_database_url().replace("%", "%%"))
    command.upgrade(config, "head")
