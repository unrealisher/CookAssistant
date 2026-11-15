"""API health check route."""

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api/v1", tags=["health"])


class HealthResponse(BaseModel):
    """Response returned while the API process is available."""

    status: str = "ok"


@router.get("/health", response_model=HealthResponse, summary="Check API availability")
def get_health() -> HealthResponse:
    """Report that the API process can serve requests."""

    return HealthResponse()
