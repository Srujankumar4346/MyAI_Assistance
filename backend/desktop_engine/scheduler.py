import uuid
from datetime import datetime

from sqlalchemy.orm import Session

from backend.desktop_engine.models import ScheduledTask


class SchedulerEngine:
    def __init__(self):
        # Redis fallback - if redis not available, we could use BackgroundTasks or APScheduler
        self.use_redis = False

    def schedule_task(
        self,
        db: Session,
        user_id: int,
        task_name: str,
        action_type: str,
        target: str,
        run_at: datetime = None,
        cron_expression: str = None,
    ):
        task = ScheduledTask(
            id=str(uuid.uuid4()),
            user_id=user_id,
            task_name=task_name,
            action_type=action_type,
            target=target,
            run_at=run_at,
            cron_expression=cron_expression,
        )
        db.add(task)
        db.commit()
        db.refresh(task)
        return task


scheduler_engine = SchedulerEngine()
