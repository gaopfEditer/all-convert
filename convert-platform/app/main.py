from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.routes import batches, health
from app.core.config import get_settings
from app.db.session import init_db
from app.services.storage import ensure_data_dirs


@asynccontextmanager
async def lifespan(_app: FastAPI):
    ensure_data_dirs()
    init_db()
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title=settings.app_name, lifespan=lifespan)
    prefix = settings.api_prefix
    app.include_router(health.router, prefix=prefix)
    app.include_router(batches.router, prefix=prefix)
    return app


app = create_app()
