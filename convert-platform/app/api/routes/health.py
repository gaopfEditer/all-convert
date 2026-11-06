from fastapi import APIRouter

from app.adapters.registry import get_adapter, init_registry

router = APIRouter(tags=["health"])


@router.get("/health")
def health():
    return {"status": "ok", "version": "0.1.0"}


@router.get("/health/engines")
def health_engines():
    init_registry()
    adapter = get_adapter("imagemagick")
    return {
        "engines": [
            {
                "id": adapter.engine_id,
                "healthy": adapter.healthcheck(),
            }
        ]
    }
