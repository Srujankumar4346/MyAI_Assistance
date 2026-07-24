from backend.utils.logger import logger, log_telemetry
from sqlalchemy.orm import Session
import json

class BrowserMemoryHooks:
    """
    Bridge between Browser Engine events and the Neural Memory Engine.
    Propagates structured events to Memory, Knowledge Graph, Learning Engine, and Telemetry.
    """
    
    def __init__(self):
        self.logger = logger
        
    def _fire_event(self, db: Session, user_id: int, event_type: str, data: dict):
        """Internal router for events."""
        self.logger.info(f"Memory Hook Triggered: {event_type}")
        
        # 1. Telemetry
        log_telemetry(event_type, data)
        
        # 2. In a fully implemented system, this is where we call MemoryEngine.
        # e.g., memory_engine.ingest_event(user_id, event_type, data)
        # This will subsequently hit the Knowledge Graph and Learning Engine.
        pass

    def on_page_visited(self, db: Session, user_id: int, url: str, title: str):
        self._fire_event(db, user_id, "PAGE_VISITED", {"url": url, "title": title})
        
    def on_page_read(self, db: Session, user_id: int, url: str, reading_time_seconds: int):
        self._fire_event(db, user_id, "PAGE_READ", {"url": url, "duration": reading_time_seconds})
        
    def on_search_executed(self, db: Session, user_id: int, query: str):
        self._fire_event(db, user_id, "SEARCH_EXECUTED", {"query": query})
        
    def on_bookmark_created(self, db: Session, user_id: int, url: str, category: str):
        self._fire_event(db, user_id, "BOOKMARK_CREATED", {"url": url, "category": category})
        
    def on_download_completed(self, db: Session, user_id: int, filename: str, file_type: str):
        self._fire_event(db, user_id, "DOWNLOAD_COMPLETED", {"filename": filename, "type": file_type})
        
    def on_form_submitted(self, db: Session, user_id: int, url: str, fields: dict):
        # We don't log sensitive values to memory, just the keys and intent
        safe_keys = list(fields.keys())
        self._fire_event(db, user_id, "FORM_SUBMITTED", {"url": url, "fields_submitted": safe_keys})
        
    def on_session_created(self, db: Session, user_id: int, workspace_name: str):
        self._fire_event(db, user_id, "SESSION_CREATED", {"workspace": workspace_name})

memory_hooks = BrowserMemoryHooks()
