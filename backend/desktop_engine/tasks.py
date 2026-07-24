from backend.utils.logger import logger
from backend.database.connection import SessionLocal

async def run_desktop_scheduler():
    """Phase 4 Desktop Scheduled Tasks Loop"""
    # logger.debug("Ticking Desktop Scheduler...")
    db = SessionLocal()
    try:
        # TODO: Query database for scheduled tasks that are due and execute them
        pass
    finally:
        db.close()
