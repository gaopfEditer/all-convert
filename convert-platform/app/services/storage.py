from pathlib import Path

from app.core.config import get_settings


def ensure_data_dirs() -> Path:
    settings = get_settings()
    root = settings.data_dir.resolve()
    for sub in ("staging", "work", "outputs"):
        (root / sub).mkdir(parents=True, exist_ok=True)
    return root


def batch_dir(batch_id: str) -> Path:
    return ensure_data_dirs() / "staging" / batch_id


def output_dir(batch_id: str, file_id: str) -> Path:
    return ensure_data_dirs() / "outputs" / batch_id / file_id


def work_dir(job_id: str) -> Path:
    return ensure_data_dirs() / "work" / job_id
