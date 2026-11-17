"""Initial owner setup, login, logout, and account status routes."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth import (
    SESSION_COOKIE_NAME,
    SESSION_TTL,
    create_session,
    get_current_user,
    hash_password,
    hash_session_token,
    verify_password,
)
from app.db import get_db
from app.models import AuthSession, User
from app.schemas import Credentials, SetupStatus, UserResponse

router = APIRouter(prefix="/api/v1/auth", tags=["authentication"])


def _set_session_cookie(response: Response, token: str) -> None:
    max_age = int(SESSION_TTL.total_seconds())
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=token,
        max_age=max_age,
        httponly=True,
        secure=False,
        samesite="lax",
        path="/api/v1",
    )


@router.get("/status", response_model=SetupStatus, summary="Check owner setup status")
def get_setup_status(db: Session = Depends(get_db)) -> SetupStatus:
    """Tell the client whether the single local owner account has been configured."""

    owner_exists = db.scalar(select(User.id).limit(1)) is not None
    return SetupStatus(setup_required=not owner_exists)


@router.post(
    "/setup",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create the first and only owner account",
)
def setup_owner(
    credentials: Credentials,
    response: Response,
    db: Session = Depends(get_db),
) -> UserResponse:
    """Create the singleton owner once, then start its browser session."""

    now = datetime.now(UTC)
    try:
        result = db.execute(
            sqlite_insert(User)
            .values(
                id=1,
                username=credentials.username,
                password_hash=hash_password(credentials.password),
                created_at=now,
            )
            .on_conflict_do_nothing(index_elements=[User.id])
        )
        if result.rowcount != 1:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Owner is already set up",
            )
        owner = db.get(User, 1)
        if owner is None:
            raise RuntimeError("Inserted owner account could not be loaded")
        token = create_session(db, owner)
        db.commit()
    except HTTPException:
        raise
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Owner is already set up",
        ) from exc

    _set_session_cookie(response, token)
    return UserResponse(id=owner.id, username=owner.username)


@router.post("/login", response_model=UserResponse, summary="Log in as the owner")
def login(
    credentials: Credentials,
    response: Response,
    db: Session = Depends(get_db),
) -> UserResponse:
    """Verify the owner password and issue a revocable browser session."""

    owner = db.scalar(select(User).where(User.username == credentials.username))
    if owner is None or not verify_password(credentials.password, owner.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    token = create_session(db, owner)
    db.commit()
    _set_session_cookie(response, token)
    return UserResponse(id=owner.id, username=owner.username)


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Log out the current session",
)
def logout(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> Response:
    """Revoke the current session when present and clear the browser cookie."""

    token = request.cookies.get(SESSION_COOKIE_NAME)
    if token is not None:
        session = db.scalar(
            select(AuthSession).where(AuthSession.token_hash == hash_session_token(token))
        )
        if session is not None:
            db.delete(session)
            db.commit()

    response.delete_cookie(
        key=SESSION_COOKIE_NAME,
        path="/api/v1",
        httponly=True,
        secure=False,
        samesite="lax",
    )
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@router.get("/me", response_model=UserResponse, summary="Get the signed-in owner")
def get_me(
    owner: Annotated[User, Depends(get_current_user)],
) -> UserResponse:
    """Return the public profile for the authenticated owner."""

    return UserResponse(id=owner.id, username=owner.username)
