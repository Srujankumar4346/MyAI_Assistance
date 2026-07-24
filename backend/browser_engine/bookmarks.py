
from sqlalchemy.orm import Session

from backend.browser_engine.models import Bookmark
from backend.utils.logger import log_telemetry, logger


class BookmarkManager:
    """Manages bookmarks, tags, and memory integration per workspace."""

    def __init__(self):
        self.logger = logger

    def create_bookmark(
        self,
        db: Session,
        workspace_id: int,
        user_id: int,
        url: str,
        title: str,
        category: str = "Uncategorized",
        tags: str = "",
        notes: str = "",
        is_pinned: bool = False,
        is_favorite: bool = False,
    ):
        bm = Bookmark(
            workspace_id=workspace_id,
            user_id=user_id,
            url=url,
            title=title,
            category=category,
            tags=tags,
            notes=notes,
            is_pinned=is_pinned,
            is_favorite=is_favorite,
        )
        db.add(bm)
        db.commit()
        db.refresh(bm)
        self.logger.info(f"Created bookmark for {url} in workspace {workspace_id}")
        self._trigger_memory_integration(db, user_id, bm)

        # Telemetry
        log_telemetry("bookmark_created", {"url": url, "category": category})

        return bm

    def edit_bookmark(self, db: Session, user_id: int, bookmark_id: int, **kwargs):
        bm = db.query(Bookmark).filter_by(id=bookmark_id, user_id=user_id).first()
        if not bm:
            return None

        for k, v in kwargs.items():
            if hasattr(bm, k):
                setattr(bm, k, v)

        db.commit()
        db.refresh(bm)
        return bm

    def delete_bookmark(self, db: Session, user_id: int, bookmark_id: int):
        bm = db.query(Bookmark).filter_by(id=bookmark_id, user_id=user_id).first()
        if bm:
            db.delete(bm)
            db.commit()
            return True
        return False

    def get_bookmarks(
        self, db: Session, user_id: int, workspace_id: int = None, search: str = None
    ):
        query = db.query(Bookmark).filter_by(user_id=user_id)
        if workspace_id:
            query = query.filter_by(workspace_id=workspace_id)

        if search:
            query = query.filter(
                Bookmark.title.ilike(f"%{search}%")
                | Bookmark.url.ilike(f"%{search}%")
                | Bookmark.tags.ilike(f"%{search}%")
            )

        return query.order_by(Bookmark.is_pinned.desc(), Bookmark.created_at.desc()).all()

    def _trigger_memory_integration(self, db: Session, user_id: int, bookmark: Bookmark):
        """Triggers the Neural Memory / Knowledge Graph flow for the bookmarked URL."""
        self.logger.info(f"Triggering Neural Memory update for bookmark {bookmark.url}")
        # In a real system, this would queue a task to fetch the URL content and extract KG entities.


bookmark_manager = BookmarkManager()
