"""
4-Level Permission System for Desktop Automation.
Levels: SAFE, MEDIUM, HIGH, CRITICAL
"""
from sqlalchemy.orm import Session
from backend.desktop_engine.models import PermissionRule
from backend.utils.logger import logger
from enum import Enum

class PermissionLevel(Enum):
    SAFE = "SAFE"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class ActionType(Enum):
    APP_LAUNCH = "app_launch"
    WINDOW_CONTROL = "window_control"
    FILE_SYSTEM = "file_system"
    TERMINAL = "terminal"
    SYSTEM_CONTROL = "system_control"
    BROWSER_NAVIGATION = "browser_navigation"
    BROWSER_RESEARCH = "browser_research"
    BROWSER_DOWNLOAD = "browser_download"

class PermissionEngine:
    def __init__(self):
        self.logger = logger
        
    def check_permission(self, db: Session, user_id: int, action_type: ActionType, target: str, level: PermissionLevel) -> str:
        """
        Checks if a user has approved this action.
        Returns 'ALWAYS_ALLOW', 'ALWAYS_DENY', or 'PENDING'.
        """
        if not isinstance(action_type, ActionType):
            self.logger.warning(f"Permission spoofing attempt detected: invalid action type '{action_type}'")
            return "ALWAYS_DENY"

        if level == PermissionLevel.SAFE:
            return "ALWAYS_ALLOW"
            
        rule = db.query(PermissionRule).filter_by(
            user_id=user_id,
            action_type=action_type.value,
            target=target
        ).first()
        
        if rule:
            if rule.decision in ["ALWAYS_ALLOW", "ALWAYS_DENY"]:
                return rule.decision
            if rule.decision == "ALLOW_ONCE":
                # Consume the ALLOW_ONCE
                db.delete(rule)
                db.commit()
                return "ALLOW_ONCE"
                
        return "PENDING"
        
    def set_permission(self, db: Session, user_id: int, action_type: ActionType, target: str, level: PermissionLevel, decision: str):
        """Sets a permission rule."""
        if not isinstance(action_type, ActionType):
            raise ValueError(f"Invalid action type: {action_type}")
            
        rule = db.query(PermissionRule).filter_by(
            user_id=user_id,
            action_type=action_type.value,
            target=target
        ).first()
        
        if rule:
            rule.decision = decision
            rule.permission_level = level.value
        else:
            rule = PermissionRule(
                user_id=user_id,
                action_type=action_type.value,
                target=target,
                permission_level=level.value,
                decision=decision
            )
            db.add(rule)
        
        db.commit()
        return rule

permission_engine = PermissionEngine()
