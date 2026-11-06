import json
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.adapters.registry import init_registry, list_capabilities, resolve_engine
from app.api.schemas import (
    BatchCreate,
    BatchDetail,
    BatchResponse,
    FileSummary,
    TargetItem,
    TargetsResponse,
    UploadResponse,
)
from app.core.config import get_settings
from app.core.detection import detect_file_type
from app.core.security import safe_filename
from app.db.session import get_db
from app.models.entities import Batch, FileRecord
from app.models.enums import BatchStatus, FileStatus
from app.services.batch_status import recompute_batch_status
from app.services.storage import batch_dir
from app.workers.tasks import convert_file_task

router = APIRouter(tags=["batches"])


@router.post("/batches", response_model=BatchResponse, status_code=201)
def create_batch(body: BatchCreate, db: Session = Depends(get_db)) -> BatchResponse:
    settings = get_settings()
    ttl = body.ttl_seconds or settings.default_ttl_seconds
    expires = datetime.now(timezone.utc) + timedelta(seconds=ttl)
    batch = Batch(
        status=BatchStatus.OPEN.value,
        expires_at=expires,
        default_target_format=body.default_target_format,
    )
    db.add(batch)
    db.commit()
    db.refresh(batch)
    return BatchResponse(batch_id=batch.id, expires_at=batch.expires_at, status=batch.status)


@router.get("/batches/{batch_id}", response_model=BatchDetail)
def get_batch(batch_id: str, db: Session = Depends(get_db)) -> BatchDetail:
    batch = db.get(Batch, batch_id)
    if not batch:
        raise HTTPException(404, "Batch not found")
    files = db.query(FileRecord).filter(FileRecord.batch_id == batch_id).all()
    summary = {
        "total": len(files),
        "success": sum(1 for f in files if f.status == FileStatus.SUCCESS.value),
        "failed": sum(1 for f in files if f.status == FileStatus.FAILED.value),
        "processing": sum(
            1
            for f in files
            if f.status in (FileStatus.PROCESSING.value, FileStatus.QUEUED.value)
        ),
    }
    return BatchDetail(
        batch_id=batch.id,
        status=batch.status,
        expires_at=batch.expires_at,
        summary=summary,
        files=[
            FileSummary(
                file_id=f.id,
                original_name=f.original_name,
                detected_format=f.detected_format,
                target_format=f.target_format,
                status=f.status,
                size_bytes=f.size_bytes,
                error=(
                    {"code": f.error_code, "message": f.error_message}
                    if f.error_code
                    else None
                ),
            )
            for f in files
        ],
    )


@router.post("/batches/{batch_id}/files", response_model=UploadResponse, status_code=201)
async def upload_files(
    batch_id: str,
    files: list[UploadFile] = File(...),
    targets: str | None = Form(None),
    db: Session = Depends(get_db),
) -> UploadResponse:
    batch = db.get(Batch, batch_id)
    if not batch:
        raise HTTPException(404, "Batch not found")

    target_list: list[str | None] = []
    if targets:
        try:
            parsed = json.loads(targets)
            if isinstance(parsed, list):
                target_list = [str(x) if x is not None else None for x in parsed]
        except json.JSONDecodeError:
            raise HTTPException(400, "targets must be JSON array")

    settings = get_settings()
    accepted: list[dict] = []
    rejected: list[dict] = []
    dest = batch_dir(batch_id)
    dest.mkdir(parents=True, exist_ok=True)

    for idx, upload in enumerate(files):
        name = safe_filename(upload.filename or "file")
        target = (
            target_list[idx]
            if idx < len(target_list)
            else batch.default_target_format
        )

        header = await upload.read(8192)
        size = len(header)
        if size > settings.max_upload_bytes:
            rejected.append({"name": name, "reason": "TOO_LARGE"})
            continue

        detected = detect_file_type(header, name)
        if not detected:
            rejected.append({"name": name, "reason": "UNKNOWN_TYPE"})
            continue

        rest = await upload.read()
        size += len(rest)
        if size > settings.max_upload_bytes:
            rejected.append({"name": name, "reason": "TOO_LARGE"})
            continue

        record = FileRecord(
            batch_id=batch_id,
            original_name=name,
            safe_name=name,
            detected_format=detected.format_id,
            detected_mime=detected.mime_type,
            target_format=target.replace("jpeg", "jpg") if target else None,
            status=FileStatus.PENDING.value,
            size_bytes=size,
        )
        db.add(record)
        db.flush()

        input_path = dest / f"{record.id}_{name}"
        input_path.write_bytes(header + rest)
        record.input_path = str(input_path)

        if record.target_format:
            if not resolve_engine(record.detected_format, record.target_format):
                record.status = FileStatus.FAILED.value
                record.error_code = "UNSUPPORTED_PAIR"
                record.error_message = "Target format not supported for detected type"
                rejected.append({"name": name, "reason": "UNSUPPORTED_PAIR", "file_id": record.id})
            else:
                record.status = FileStatus.QUEUED.value
                accepted.append({"file_id": record.id, "status": record.status})
        else:
            record.status = FileStatus.PENDING.value
            accepted.append({"file_id": record.id, "status": record.status})

        db.commit()

        if record.status == FileStatus.QUEUED.value:
            convert_file_task.delay(record.id)

    recompute_batch_status(db, batch)
    db.commit()
    return UploadResponse(accepted=accepted, rejected=rejected)


@router.get("/files/{file_id}/download")
def download_file(file_id: str, db: Session = Depends(get_db)):
    record = db.get(FileRecord, file_id)
    if not record or record.status != FileStatus.SUCCESS.value or not record.output_path:
        raise HTTPException(404, "File not available")
    path = record.output_path
    ext = record.target_format or "bin"
    return FileResponse(path, filename=f"converted.{ext}")


@router.get("/formats/{source_format}/targets", response_model=TargetsResponse)
def format_targets(source_format: str, include_experimental: bool = False):
    init_registry()
    src = source_format.lower().replace("jpeg", "jpg")
    items: list[TargetItem] = []
    for pair in list_capabilities(include_experimental=include_experimental):
        if pair.source.replace("jpeg", "jpg") != src:
            continue
        adapter = resolve_engine(pair.source, pair.target)
        items.append(
            TargetItem(
                format=pair.target,
                status=pair.status,
                default_engine=adapter.engine_id if adapter else None,
            )
        )
    return TargetsResponse(source=src, targets=items)
