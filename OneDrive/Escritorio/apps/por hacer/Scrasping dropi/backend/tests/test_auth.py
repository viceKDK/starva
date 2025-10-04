from __future__ import annotations

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.core.database import get_db
from backend.main import app
from backend.models import Base

engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


def _reset_database() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


@pytest_asyncio.fixture(scope="module")
async def async_client() -> AsyncClient:
    app.dependency_overrides[get_db] = override_get_db
    _reset_database()
    async with AsyncClient(app=app, base_url="http://testserver") as client:
        yield client
    app.dependency_overrides.pop(get_db, None)


@pytest.fixture(autouse=True)
def clean_db() -> None:
    _reset_database()
    yield


@pytest.mark.asyncio
async def test_register_creates_user(async_client: AsyncClient) -> None:
    response = await async_client.post(
        "/auth/register",
        json={"email": "Test@Example.com", "password": "SuperSecret1"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "test@example.com"
    assert data["is_active"] is True
    assert "created_at" in data


@pytest.mark.asyncio
async def test_login_returns_token_and_access(async_client: AsyncClient) -> None:
    await async_client.post(
        "/auth/register",
        json={"email": "user@example.com", "password": "SuperSecret1"},
    )

    login_response = await async_client.post(
        "/auth/login",
        json={"email": "user@example.com", "password": "SuperSecret1"},
    )
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]

    me_response = await async_client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_response.status_code == 200
    assert me_response.json()["email"] == "user@example.com"


@pytest.mark.asyncio
async def test_login_rejects_invalid_credentials(async_client: AsyncClient) -> None:
    await async_client.post(
        "/auth/register",
        json={"email": "user@example.com", "password": "SuperSecret1"},
    )

    bad_response = await async_client.post(
        "/auth/login",
        json={"email": "user@example.com", "password": "wrong"},
    )
    assert bad_response.status_code == 401
