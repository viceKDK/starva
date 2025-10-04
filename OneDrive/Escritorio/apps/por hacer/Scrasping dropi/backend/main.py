from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.routers.auth import router as auth_router
from .api.routers.health import router as health_router
from .core.config import settings
from .core.database import init_db

app = FastAPI(title="Dropi Scraping API", version="0.1.0")


@app.on_event("startup")
def startup_event() -> None:
    init_db()


if settings.CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


@app.get("/", tags=["root"])
def root() -> dict:
    return {"name": "dropi-scraping", "version": "0.1.0"}


app.include_router(auth_router)
app.include_router(health_router)
