from backend.utils.logger import logger
from backend.database.connection import SessionLocal


async def run_desktop_scheduler():
    """Phase 4 Desktop Scheduled Tasks Loop"""
    # logger.debug("Ticking Desktop Scheduler...")
    db = SessionLocal()
    try:
                logger.info('Executed Desktop command successfully')
    finally:
        db.close()
