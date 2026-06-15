from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.api.deps import AuthContext, get_auth_context, get_edupage_client
from app.db.session import get_session
from app.main import app
from app.services import item_service


@pytest.fixture(autouse=True)
def reset_item_store():
    """Reset in-memory store and counter between tests."""
    item_service._store.clear()
    item_service._counter = 0
    yield
    item_service._store.clear()
    item_service._counter = 0


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


# ── Authenticated-request fixtures ────────────────────────────────────────────
# Hermetic: no Postgres and no EduPage. The auth dependency chain is replaced
# with a fake user context and a sentinel Edupage instance; data-layer calls
# are monkeypatched per test on app.services.edupage_service.


class FakeEdupage:
    """Sentinel standing in for an authenticated Edupage instance."""


@pytest.fixture
def fake_user() -> SimpleNamespace:
    return SimpleNamespace(
        id=uuid4(),
        username="alice",
        subdomain="spsezochova",
        custom_ai_prompt=None,
    )


@pytest.fixture
def auth_client(fake_user) -> TestClient:
    """TestClient with auth, EduPage client, and DB session dependencies overridden."""

    async def fake_ctx():
        return AuthContext(user=fake_user, edupage_session_id="PHPSESSID-test")

    async def fake_edupage():
        return FakeEdupage()

    async def fake_db():
        yield AsyncMock()

    app.dependency_overrides[get_auth_context] = fake_ctx
    app.dependency_overrides[get_edupage_client] = fake_edupage
    app.dependency_overrides[get_session] = fake_db
    yield TestClient(app)
    app.dependency_overrides.pop(get_auth_context, None)
    app.dependency_overrides.pop(get_edupage_client, None)
    app.dependency_overrides.pop(get_session, None)
