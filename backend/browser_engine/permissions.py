from sqlalchemy.orm import Session

from backend.desktop_engine.permissions import ActionType, PermissionLevel, permission_engine


class BrowserPermissionEngine:
    """Extensions of the Phase 4 Permission Engine for Browser actions."""

    def check_permission(
        self,
        db: Session,
        user_id: int,
        action_type: ActionType,
        target: str,
        level: PermissionLevel,
    ) -> str:
        # Reuses the exact same logic and DB tables from Phase 4
        return permission_engine.check_permission(db, user_id, action_type, target, level)

    def request_approval(
        self,
        db: Session,
        user_id: int,
        action_type: ActionType,
        target: str,
        level: PermissionLevel,
    ):
        # Triggers UI/Voice prompt (mocked for MVP)
        import logging

        logging.getLogger(__name__).info("Function executed")


browser_permission_engine = BrowserPermissionEngine()
