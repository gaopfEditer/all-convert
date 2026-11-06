from datetime import datetime

from pydantic import BaseModel, Field


class BatchCreate(BaseModel):
    ttl_seconds: int | None = None
    default_target_format: str | None = None


class BatchResponse(BaseModel):
    batch_id: str
    expires_at: datetime
    status: str


class FileSummary(BaseModel):
    file_id: str
    original_name: str
    detected_format: str | None
    target_format: str | None
    status: str
    size_bytes: int
    error: dict | None = None


class BatchDetail(BaseModel):
    batch_id: str
    status: str
    expires_at: datetime
    summary: dict
    files: list[FileSummary]


class UploadResponse(BaseModel):
    accepted: list[dict]
    rejected: list[dict]


class TargetItem(BaseModel):
    format: str
    status: str = "production"
    default_engine: str | None = None


class TargetsResponse(BaseModel):
    source: str
    targets: list[TargetItem]
