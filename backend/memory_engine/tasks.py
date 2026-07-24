from backend.database.connection import SessionLocal
from backend.utils.logger import logger


async def run_memory_decay():
    """Phase 3 Memory Decay Task"""
    logger.info("Running Memory Decay algorithm...")
    db = SessionLocal()
    try:
        from backend.database.models import Memory
        from sqlalchemy import text
        # Exponential decay on memory salience for unpinned items
        db.execute(text("UPDATE memories SET salience = salience * 0.95 WHERE pinned = false AND salience > 0.1"))
        db.commit()
        logger.info("Memory Decay loop completed.")
    except Exception as e:
        logger.error(f"Error in memory decay: {e}")
        db.rollback()
    finally:
        db.close()

async def run_learning_reinforcement():
    """Phase 3 Learning Reinforcement Task"""
    logger.info("Running Learning Reinforcement algorithm...")
    db = SessionLocal()
    try:
        from backend.database.models import KnowledgeNode
        from sqlalchemy import text
        # Reinforce salience of frequently accessed knowledge nodes
        db.execute(text("UPDATE knowledge_nodes SET salience = LEAST(salience * 1.05, 1.0) WHERE access_count > 10"))
        # Reset counter after reinforcement step
        db.execute(text("UPDATE knowledge_nodes SET access_count = 0 WHERE access_count > 10"))
        db.commit()
        logger.info("Knowledge Graph reinforcement loop completed.")
    except Exception as e:
        logger.error(f"Error in learning reinforcement: {e}")
        db.rollback()
    finally:
        db.close()
