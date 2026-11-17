"""Password and cookie-session helpers for the local owner account."""

from __future__ import annotations

import base64
import hashlib
import hmac
import secrets
from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import Cookie, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import AuthSession, User

SESSION_COOKIE_NAME = "cookassistant_session"
SESSION_TTL = timedelta(days=30)
PASSWORD_ITERATIONS = 600_000
_PASSWORD_SCHEME = "pbkdf2_sha256"


def hash_password(password: str) -> str:
    """Hash a password with a random salt using PBKDF2-HMAC-SHA256."""

    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt, PASSWORD_ITERATIONS
    )
    salt_text = base64.urlsafe_b64encode(salt).decode("ascii")
    digest_text = base64.urlsafe_b64encode(digest).decode("ascii")
    return f"{_PASSWORD_SCHEME}${PASSWORD_ITERATIONS}${salt_text}${digest_text}"


def verify_password(password: str, encoded_hash: str) -> bool:
    """Verify a password hash without leaking whether a comparison matched early."""

    try:
        scheme, iteration_text, salt_text, digest_text = encoded_hash.split("$", 3)
        if scheme != _PASSWORD_SCHEME:
            return False
        iterations = int(iteration_text)
        if not 100_000 <= iterations <= 2_000_000:
            return False
        salt = base64.urlsafe_b64decode(salt_text.encode("ascii"))
        expected = base64.urlsafe_b64decode(digest_text.encode("ascii"))
    except (ValueError, UnicodeEncodeError):
        return False

    actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
    return hmac.compare_digest(actual, expected)


def create_session(db: Session, user: User) -> str:
    """Persist a hash of a new opaque session token and return the raw token."""

    token = secrets.token_urlsafe(32)
    now = datetime.now(UTC)
    db.add(
        AuthSession(
            user_id=user.id,
            token_hash=hashlib.sha256(token.encode("utf-8")).hexdigest(),
            created_at=now,
            expires_at=now + SESSION_TTL,
        )
    )
    return token


def hash_session_token(token: str) -> str:
    """Hash a browser session token before looking it up in the database."""

    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def get_current_user(
    token: Annotated[str | None, Cookie(alias=SESSION_COOKIE_NAME)] = None,
    db: Session = Depends(get_db),
) -> User:
    """Resolve the owner from a live, revocable cookie session."""

    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required",
    )
    if token is None:
        raise unauthorized

    session = db.scalar(
        select(AuthSession).where(
            AuthSession.token_hash == hash_session_token(token),
            AuthSession.expires_at > datetime.now(UTC),
        )
    )
    if session is None:
        raise unauthorized

    user = db.get(User, session.user_id)
    if user is None:
        raise unauthorized
    return user

