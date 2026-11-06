from sqlalchemy.orm import Session

from app.models.entities import Batch, FileRecord
from app.models.enums import BatchStatus, FileStatus


def recompute_batch_status(db: Session, batch: Batch) -> None:
    files = db.query(FileRecord).filter(FileRecord.batch_id == batch.id).all()
    if not files:
        batch.status = BatchStatus.OPEN.value
        return

    statuses = {f.status for f in files}
    terminal = {
        FileStatus.SUCCESS.value,
        FileStatus.FAILED.value,
        FileStatus.CANCELLED.value,
    }
    if all(s in terminal for s in statuses):
        success = sum(1 for f in files if f.status == FileStatus.SUCCESS.value)
        failed = sum(1 for f in files if f.status == FileStatus.FAILED.value)
        if success == len(files):
            batch.status = BatchStatus.COMPLETED.value
        elif success == 0 and failed == len(files):
            batch.status = BatchStatus.FAILED.value
        else:
            batch.status = BatchStatus.PARTIAL_FAILED.value
        return

    if any(
        s in (FileStatus.PROCESSING.value, FileStatus.QUEUED.value) for s in statuses
    ):
        batch.status = BatchStatus.PROCESSING.value
    else:
        batch.status = BatchStatus.OPEN.value
