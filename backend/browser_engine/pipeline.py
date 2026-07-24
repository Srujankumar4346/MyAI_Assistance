from typing import Dict, Any, Callable
from sqlalchemy.orm import Session
from backend.utils.logger import logger
from backend.desktop_engine.permissions import PermissionLevel, ActionType
from backend.browser_engine.permissions import browser_permission_engine
from backend.desktop_engine.safety_validator import safety_validator
from backend.browser_engine.models import AutomationQueue
import uuid
import datetime

class BrowserPipeline:
    """
    Browser-specific Execution Pipeline mapping to the Phase 4 model:
    Intent -> Permission -> Safety -> Execution -> Logging -> Memory -> Learning
    """
    def __init__(self):
        self.logger = logger
        
    async def execute_action(
        self,
        db: Session,
        user_id: int,
        action_type: ActionType,
        target: str,
        level: PermissionLevel,
        params: Dict[str, Any],
        executor_func: Callable
    ) -> Dict[str, Any]:
        """
        Executes a browser action following the safety pipeline.
        Note: executor_func must be an async function.
        """
        # Step 2: Permission Engine (Reusing Phase 4 engine)
        perm_status = browser_permission_engine.check_permission(db, user_id, action_type, target, level)
        if perm_status == "ALWAYS_DENY":
            return self._fail(user_id, action_type, target, "Blocked by Permission Engine")
        elif perm_status == "PENDING":
            # Queue for approval
            queue_item = AutomationQueue(
                id=str(uuid.uuid4()),
                user_id=user_id,
                action_type=action_type.value,
                target=target,
                status="pending_approval"
            )
            db.add(queue_item)
            db.commit()
            return {"status": "pending_approval", "message": "Permission required."}
            
        # Step 3: Safety Validator (Basic URL validation)
        # Bypassing the Safety Validator is strictly forbidden per requirements.
        if action_type in [ActionType.BROWSER_NAVIGATION, ActionType.BROWSER_DOWNLOAD]:
            is_safe, reason = self._validate_url(target)
            if not is_safe:
                return self._fail(user_id, action_type, target, f"Safety Validator blocked: {reason}")
            
        # Step 4: Execution
        start_time = datetime.datetime.utcnow()
        try:
            result = await executor_func(**params)
            status_str = "success"
        except Exception as e:
            result = {"error": str(e)}
            status_str = "failed"
            self.logger.error(f"Browser Execution failed: {e}")
            
        duration = int((datetime.datetime.utcnow() - start_time).total_seconds() * 1000)
        
        # Step 5, 6, 7 (Logging, Memory, Learning) - would be triggered here
        
        return {
            "status": status_str,
            "result": result,
            "duration_ms": duration
        }
        
    def _validate_url(self, url: str):
        """Basic malicious URL prevention."""
        if url.startswith("file://") or url.startswith("chrome://"):
            return False, "Access to local or browser-internal protocols is denied."
        return True, "Safe"

    def _fail(self, user_id: int, action_type: ActionType, target: str, reason: str) -> Dict[str, Any]:
        self.logger.warning(f"Blocked Browser Action {action_type.value} on {target}: {reason}")
        return {"status": "blocked", "message": reason}

browser_pipeline = BrowserPipeline()
