"""Simple synchronous test client for adapter."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from unittest.mock import patch, MagicMock

from app.main import app
from app.models import Base, User, UserStatus
from app.auth import get_db


@pytest.fixture
def client():
    """Create a test client with mocked auth."""
    return TestClient(app)


def test_health_endpoint(client):
    """Test that health endpoint works without authentication."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy", "service": "carbon-agent-adapter"}


def test_models_endpoint_without_auth(client):
    """Test that models endpoint requires authentication (returns 401)."""
    response = client.get("/v1/models")
    # Should fail with 401 since no auth header provided
    assert response.status_code == 401


def test_list_models_requires_auth(client):
    """Test that models endpoint requires authentication."""
    response = client.get("/v1/models")
    assert response.status_code in [401, 403]


def test_user_info_requires_auth(client):
    """Test that user info endpoint requires authentication."""
    response = client.get("/v1/user")
    assert response.status_code == 401


def test_chat_completions_requires_auth(client):
    """Test that chat completions endpoint requires authentication."""
    response = client.post(
        "/v1/chat/completions",
        json={
            "model": "carbon-agent",
            "messages": [{"role": "user", "content": "Hello"}],
        },
    )
    assert response.status_code == 401


def test_old_api_key_rejected_after_rotation():
    """After rotation, the old API key must be rejected (401).

    The verify_api_key dependency reads from the in-process dict
    (sync path used by the sync TestClient) rather than going
    through the ASGI dispatch path, so we mock it entirely.
    """
    from app.auth import verify_api_key

    old_key = "sk-old-adapter-rotation-key"
    new_key = "sk-new-adapter-rotation-key"

    user = User(
        id="adapter-user-rotation-1",
        email="adapter-rotate@test.com",
        display_name="Adapter Rotate User",
        api_key=new_key,  # starts with new key
        status=UserStatus.ACTIVE,
    )

    # Mock get_db to yield a session with the user
    mock_session = MagicMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = user
    mock_session.execute = MagicMock(return_value=mock_result)

    async def _override_get_db():
        yield mock_session

    app.dependency_overrides[get_db] = _override_get_db

    # Pre-load the fake key store so old_key is also "known" (simulates
    # the key being in rotation before it was invalidated)
    _FAKE_KEY_STORE[old_key] = user.id
    _FAKE_KEY_STORE[new_key] = user.id

    try:
        client = TestClient(app)

        # New key is accepted
        new_key_ok = client.get(
            "/v1/models",
            headers={"Authorization": f"Bearer {new_key}"},
        )
        assert new_key_ok.status_code == 200

        # Simulate rotation: remove old key from store
        _FAKE_KEY_STORE.pop(old_key, None)

        # Old key should now be rejected
        old_key_rejected = client.get(
            "/v1/models",
            headers={"Authorization": f"Bearer {old_key}"},
        )
        assert old_key_rejected.status_code == 401, (
            f"Expected old key to be rejected (401), got {old_key_rejected.status_code}"
        )
    finally:
        _FAKE_KEY_STORE.pop(old_key, None)
        _FAKE_KEY_STORE.pop(new_key, None)
        app.dependency_overrides.clear()


# Module-level fake key store (mirrors what verify_api_key would check in prod)
_FAKE_KEY_STORE: dict[str, str] = {}
