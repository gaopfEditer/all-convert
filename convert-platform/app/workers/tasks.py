from app.db.session import get_engine, init_db
from app.services.conversion import run_conversion_for_file
from app.workers.celery_app import celery_app


@celery_app.task(name="convert_file")
def convert_file_task(file_id: str) -> None:
    init_db()
    from sqlalchemy.orm import Session

    engine = get_engine()
    with Session(engine) as db:
        run_conversion_for_file(db, file_id)
