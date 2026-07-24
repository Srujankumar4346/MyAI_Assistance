from typing import Any, Dict

from sqlalchemy.orm import Session

from backend.browser_engine.pipeline import browser_pipeline
from backend.desktop_engine.permissions import ActionType, PermissionLevel
from backend.utils.logger import logger

# from playwright.async_api import Page (assumed integration via adapter)


class FormsEngine:
    """Safe Browser Automation for Forms."""

    def __init__(self):
        self.logger = logger

    async def preview_form(self, url: str, form_selector: str = "form", **kwargs) -> Dict[str, Any]:
        """
        Preview Mode: Extracts form fields and maps the user's intent to values
        without submitting anything. Returns the payload for user review.
        """
        # In MVP, we mock the extraction.
        # In reality, playwright reads the DOM and builds this payload.
        preview_data = {
            "url": url,
            "fields": [
                {"name": "username", "type": "text", "value": kwargs.get("username", "")},
                {"name": "password", "type": "password", "value": "***"},
                {"name": "remember_me", "type": "checkbox", "value": True},
            ],
            "action": "login",
        }
        return preview_data

    async def fill_form(self, db: Session, user_id: int, url: str, fields: Dict[str, Any]):
        """
        Fills non-sensitive fields. Required Permission: SAFE
        """
        return await browser_pipeline.execute_action(
            db=db,
            user_id=user_id,
            action_type=ActionType.BROWSER_NAVIGATION,  # Reusing navigation for MVP fill
            target=url,
            level=PermissionLevel.SAFE,
            params={"url": url, "fields": fields},
            executor_func=self._mock_fill_executor,
        )

    async def submit_form(
        self,
        db: Session,
        user_id: int,
        url: str,
        fields: Dict[str, Any],
        level: PermissionLevel = PermissionLevel.CRITICAL,
    ):
        """
        Submits a form. Required Permission: Depends on intent, default CRITICAL.
        """
        return await browser_pipeline.execute_action(
            db=db,
            user_id=user_id,
            action_type=ActionType.BROWSER_RESEARCH,  # Mocking action type for form submit MVP
            target=url,
            level=level,
            params={"url": url, "fields": fields},
            executor_func=self._mock_submit_executor,
        )

    async def _mock_fill_executor(self, url: str, fields: Dict[str, Any]):
        self.logger.info(f"Filled form on {url} with {fields}")
        return {"status": "filled", "fields": fields}

    async def _mock_submit_executor(self, url: str, fields: Dict[str, Any]):
        self.logger.info(f"Submitted form on {url} with {fields}")
        return {"status": "submitted", "fields": fields}


forms_engine = FormsEngine()
