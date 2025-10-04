from __future__ import annotations

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from .config import settings


def _build_engine_url() -> str:
    return settings.DB_URL or "sqlite:///./dropi.db"


SQLALCHEMY_DATABASE_URL = _build_engine_url()
_engine_kwargs: dict[str, object] = {}
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    _engine_kwargs["connect_args"] = {"check_same_thread": False}

engine = create_engine(SQLALCHEMY_DATABASE_URL, **_engine_kwargs)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    # Importing models here ensures metadata is populated before create_all
    from backend import models  # noqa: F401

    models.Base.metadata.create_all(bind=engine)
