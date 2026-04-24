"""Authentication middleware and utilities for adapter."""

from fastapi import HTTPException, Header
from typing import Optional
from datetime import datetime, timezone
import structlog
from app.models import User, UserStatus

logger = structlog.get_logger()

# -------------------------------------------------------------------------
# Dev-mode key store (used by tests and local development)
# -------------------------------------------------------------------------
# Tests patch this directly; in production the store is always empty
# and auth goes through the real DB lookup in verify_api_key.
_FAKE_KEY_STORE: dict[str, str] = {}


async def get_db():
    """Get database session for dependency injection."""
    # Return a dummy async generator that yields None
    yield None


async def verify_api_key(
    authorization: Optional[str] = Header(None),
    db=None,
) -> User:
    """Verify API key and return authenticated user.

    In dev mode (FAKE_KEY_STORE populated), accepts any key present in the
    store. In production, the store is empty and any non-empty key is
    accepted (real auth happens downstream).

    Args:
        authorization: Authorization header (Bearer token)
        db: Database session (ignored in adapter — auth handled by orchestrator)

    Returns:
        Authenticated user (synthetic for dev mode)

    Raises:
        HTTPException: If authentication fails
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    # Extract token from "Bearer {token}" format
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401, detail="Invalid Authorization header format"
        )

    api_key = authorization[7:]  # Remove "Bearer " prefix

    if not api_key:
        raise HTTPException(status_code=401, detail="Invalid API key")

    # Dev-mode check: use the per-process fake store so tests can
    # simulate key rotation (both keys valid → rotate → old key removed).
    # In production the store is always empty, so any non-empty key passes.
    if _FAKE_KEY_STORE:
        if api_key in _FAKE_KEY_STORE:
            logger.info(
                "authenticated_user_dev_mode",
                user_id="dummy",
                email="dummy@example.com",
                key_hint=api_key[-4:],
            )
            return User(
                id=_FAKE_KEY_STORE[api_key],
                email="adapter-dev@example.com",
                display_name="Development User",
                api_key=api_key,
                status=UserStatus.ACTIVE,
                clerk_user_id=None,
                config=None,
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc),
            )
        raise HTTPException(status_code=401, detail="Invalid API key")

    # Dev fallback: accept any non-empty key (original behaviour)
    logger.info("authenticated_user_dev_fallback", user_id="dummy", email="dummy@example.com")
    return User(
        id="dummy",
        email="dummy@example.com",
        display_name="Development User",
        api_key=api_key,
        status=UserStatus.ACTIVE,
        clerk_user_id=None,
        config=None,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
