import datetime
import uuid
from typing import Any, Dict

from sqlalchemy.orm import Session

from backend.desktop_engine.models import AutomationLog
from backend.desktop_engine.permissions import ActionType, PermissionLevel, permission_engine
from backend.desktop_engine.safety_validator import safety_validator
from backend.utils.logger import logger


class DesktopPipeline:
    """
    7-Step Execution Pipeline:
    Intent -> Permission -> Safety -> Execution -> Logging -> Memory -> Learning
    """

    def __init__(self):
        self.logger = logger

    def execute_action(
        self,
        db: Session,
        user_id: int,
        action_type: ActionType,
        target: str,
        level: PermissionLevel,
        params: Dict[str, Any],
        executor_func: callable,
    ) -> Dict[str, Any]:
        """
        Executes a desktop action following the safety pipeline.
        """
        # Step 1: Intent is parsed (passed in as args)

        # Step 2: Permission Engine
        perm_status = permission_engine.check_permission(db, user_id, action_type, target, level)
        if perm_status == "ALWAYS_DENY":
            return self._fail(db, user_id, action_type, target, "Blocked by Permission Engine")
        elif perm_status == "PENDING":
            return {"status": "pending_approval", "message": "Permission required."}

        # Step 3: Safety Validator
        if action_type == ActionType.FILE_SYSTEM:
            is_safe, reason = safety_validator.validate_filesystem(
                target, params.get("fs_action", "")
            )
        elif action_type == ActionType.TERMINAL:
            is_safe, reason = safety_validator.validate_terminal(target)
        elif action_type == ActionType.SYSTEM_CONTROL:
            is_safe, reason = safety_validator.validate_system(target, params)
        else:
            is_safe, reason = True, "Safe"

        if not is_safe:
            return self._fail(
                db, user_id, action_type, target, f"Safety Validator blocked: {reason}"
            )

        # Step 4: Execution
        start_time = datetime.datetime.utcnow()
        try:
            result = executor_func(**params)
            status_str = "success"
        except Exception as e:
            result = {"error": str(e)}
            status_str = "failed"
            self.logger.error(f"Execution failed: {e}")

        duration = int((datetime.datetime.utcnow() - start_time).total_seconds() * 1000)

        # Step 5: Logging
        log = AutomationLog(
            id=str(uuid.uuid4()),
            user_id=user_id,
            action_type=action_type.value,
            target=target,
            status=status_str,
            details=str(result),
            duration_ms=duration,
        )
        db.add(log)
        db.commit()

        # Step 6 & 7: Neural Memory and Learning Engine (Deferred to background tasks by caller)
        # We return the successful result to let the caller trigger Memory/Learning
        return {"status": status_str, "result": result, "duration_ms": duration}

    def _fail(
        self, db: Session, user_id: int, action_type: ActionType, target: str, reason: str
    ) -> Dict[str, Any]:
        self.logger.warning(f"Blocked Action {action_type.value} on {target}: {reason}")
        log = AutomationLog(
            id=str(uuid.uuid4()),
            user_id=user_id,
            action_type=action_type.value,
            target=target,
            status="blocked",
            details=reason,
        )
        db.add(log)
        db.commit()
        return {"status": "blocked", "message": reason}


desktop_pipeline = DesktopPipeline()
