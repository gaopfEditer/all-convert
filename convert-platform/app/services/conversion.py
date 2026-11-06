from pathlib import Path

from sqlalchemy.orm import Session

from app.adapters.base import ConversionContext, ConversionLimits
from app.adapters.registry import resolve_engine
from app.core.config import get_settings
from app.models.entities import FileRecord
from app.models.enums import FileStatus
from app.services.batch_status import recompute_batch_status
from app.services.storage import output_dir, work_dir


def run_conversion_for_file(db: Session, file_id: str) -> None:
    settings = get_settings()
    record = db.get(FileRecord, file_id)
    if not record:
        return
    if record.status not in (FileStatus.QUEUED.value, FileStatus.PROCESSING.value):
        return

    record.status = FileStatus.PROCESSING.value
    db.commit()

    if not record.input_path or not record.detected_format or not record.target_format:
        record.status = FileStatus.FAILED.value
        record.error_code = "INVALID_STATE"
        record.error_message = "Missing input or formats"
        db.commit()
        _finish_batch(db, record.batch_id)
        return

    adapter = resolve_engine(record.detected_format, record.target_format)
    if not adapter:
        record.status = FileStatus.FAILED.value
        record.error_code = "UNSUPPORTED_PAIR"
        record.error_message = f"{record.detected_format} -> {record.target_format} not supported"
        db.commit()
        _finish_batch(db, record.batch_id)
        return

    out_base = output_dir(record.batch_id, record.id)
    tgt = record.target_format.replace("jpeg", "jpg")
    out_path = out_base / f"result.{tgt}"
    ctx = ConversionContext(
        job_id=record.id,
        input_path=Path(record.input_path),
        output_path=out_path,
        source_format=record.detected_format,
        target_format=record.target_format,
        params={},
        limits=ConversionLimits(timeout_seconds=settings.job_timeout_seconds),
        work_dir=work_dir(record.id),
    )

    record.engine_id = adapter.engine_id
    result = adapter.convert(ctx)

    if result.success and result.output_path and result.output_path.is_file():
        record.status = FileStatus.SUCCESS.value
        record.output_path = str(result.output_path)
        record.error_code = None
        record.error_message = None
    else:
        record.status = FileStatus.FAILED.value
        record.error_code = result.error_code or "ENGINE_ERROR"
        record.error_message = result.error_message or "Conversion failed"

    db.commit()
    _finish_batch(db, record.batch_id)


def _finish_batch(db: Session, batch_id: str) -> None:
    from app.models.entities import Batch

    batch = db.get(Batch, batch_id)
    if batch:
        recompute_batch_status(db, batch)
        db.commit()
