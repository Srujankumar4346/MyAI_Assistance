import uuid

from sqlalchemy.orm import Session

from backend.browser_engine.models import BrowserSession, BrowserWorkspace


class WorkspaceEngine:
    def __init__(self):
        import logging

        logging.getLogger(__name__).info("Function executed")

    def get_or_create_workspace(self, db: Session, user_id: int, name: str) -> BrowserWorkspace:
        ws = db.query(BrowserWorkspace).filter_by(user_id=user_id, name=name).first()
        if not ws:
            ws = BrowserWorkspace(user_id=user_id, name=name)
            db.add(ws)
            db.commit()
            db.refresh(ws)
        return ws

    def create_session(self, db: Session, workspace_id: int, user_id: int) -> BrowserSession:
        session = BrowserSession(
            id=str(uuid.uuid4()), workspace_id=workspace_id, user_id=user_id, is_active=True
        )
        db.add(session)
        db.commit()
        db.refresh(session)
        return session


workspace_engine = WorkspaceEngine()
