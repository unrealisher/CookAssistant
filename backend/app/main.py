"""FastAPI application entry point."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.api.auth import router as auth_router
from app.api.health import router as health_router
from app.api.recipes import router as recipes_router
from app.db import run_migrations


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    """Apply pending schema migrations before accepting API requests."""

    run_migrations()
    yield


app = FastAPI(
    title="CookAssistant API",
    description="Local API for the CookAssistant recipe collection.",
    version="0.1.0",
    lifespan=lifespan,
)
app.include_router(health_router)
app.include_router(auth_router)
app.include_router(recipes_router)

_frontend_dist = Path(__file__).resolve().parents[2] / "frontend" / "dist"
_frontend_index = _frontend_dist / "index.html"
_frontend_assets = _frontend_dist / "assets"


@app.get("/", include_in_schema=False)
def frontend_index() -> FileResponse:
    """Serve the production frontend when it has been built locally."""

    if not _frontend_index.is_file():
        raise HTTPException(
            status_code=503,
            detail="The frontend is not built. Run scripts/build.ps1 and try again.",
        )
    return FileResponse(_frontend_index)


if _frontend_assets.is_dir():
    app.mount(
        "/assets",
        StaticFiles(directory=_frontend_assets),
        name="frontend-assets",
    )
