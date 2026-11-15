"""FastAPI application entry point."""

from fastapi import FastAPI

from app.api.health import router as health_router

app = FastAPI(
    title="CookAssistant API",
    description="Local API for the CookAssistant recipe collection.",
    version="0.1.0",
)
app.include_router(health_router)
