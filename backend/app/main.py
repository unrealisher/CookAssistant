"""FastAPI application entry point."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

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
