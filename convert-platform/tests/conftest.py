import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

# Test env before app imports
_tmp = Path(__file__).resolve().parent / "_data"
_tmp.mkdir(exist_ok=True)
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp / 'test.db'}"
os.environ["DATA_DIR"] = str(_tmp / "storage")
os.environ["CELERY_TASK_ALWAYS_EAGER"] = "true"

from app.core.config import get_settings  # noqa: E402
from app.db.session import get_engine, init_db  # noqa: E402
from app.main import create_app  # noqa: E402
from app.models.entities import Base  # noqa: E402


@pytest.fixture(autouse=True)
def _fresh_db():
    get_settings.cache_clear()
    engine = get_engine()
    Base.metadata.drop_all(bind=engine)
    init_db()
    yield


@pytest.fixture
def client() -> TestClient:
    return TestClient(create_app())
