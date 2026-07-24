"""
Phase 5 — Browser Automation Engine Database Models
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean, Float
from datetime import datetime
from backend.database.connection import Base

# ─── Workspaces & Sessions ──────────────────────────────────────────────────

class BrowserWorkspace(Base):
    """Isolated profiles (Personal, Work, Research, etc.)"""
    __tablename__ = "browser_workspaces"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String, nullable=False, index=True) # e.g., "Research", "Development"
    created_at = Column(DateTime, default=datetime.utcnow)

class BrowserSession(Base):
    """Active/saved browser sessions"""
    __tablename__ = "browser_sessions"
    id = Column(String, primary_key=True, index=True) # UUID
    workspace_id = Column(Integer, ForeignKey("browser_workspaces.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    is_active = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_active = Column(DateTime, default=datetime.utcnow)

# ─── History & Bookmarks ────────────────────────────────────────────────────

class BrowserHistory(Base):
    """Browsing timeline"""
    __tablename__ = "browser_history"
    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String, ForeignKey("browser_sessions.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    url = Column(String, nullable=False, index=True)
    title = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

class Bookmark(Base):
    __tablename__ = "browser_bookmarks"
    id = Column(Integer, primary_key=True, autoincrement=True)
    workspace_id = Column(Integer, ForeignKey("browser_workspaces.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    url = Column(String, nullable=False)
    title = Column(String, nullable=True)
    category = Column(String, nullable=True) # Also used as "folder"
    tags = Column(String, nullable=True) # comma separated
    notes = Column(Text, nullable=True)
    is_pinned = Column(Boolean, default=False)
    is_archived = Column(Boolean, default=False)
    is_favorite = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_accessed = Column(DateTime, default=datetime.utcnow)

# ─── Downloads & Artifacts ──────────────────────────────────────────────────

class Download(Base):
    """Intelligent Download Manager Tracking"""
    __tablename__ = "browser_downloads"
    id = Column(String, primary_key=True, index=True) # UUID
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    url = Column(String, nullable=False)
    local_path = Column(String, nullable=False)
    file_type = Column(String, nullable=True) # PDF, DOCX, Code, etc.
    status = Column(String, default="completed") # 'downloading', 'completed', 'failed', 'scanned'
    metadata_json = Column(Text, nullable=True) # Extracted metadata (author, title, etc)
    created_at = Column(DateTime, default=datetime.utcnow)

class WebNote(Base):
    """User highlights and notes from pages"""
    __tablename__ = "browser_webnotes"
    id = Column(String, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    url = Column(String, nullable=False)
    highlighted_text = Column(Text, nullable=True)
    note = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class AutomationQueue(Base):
    """Queued tasks waiting for execution or user approval."""
    __tablename__ = "browser_automation_queue"
    id = Column(String, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    action_type = Column(String, nullable=False)
    target = Column(String, nullable=False)
    status = Column(String, default="pending_approval")
    created_at = Column(DateTime, default=datetime.utcnow)


# ─── Security & Automation ──────────────────────────────────────────────────

class BrowserCookie(Base):
    """Encrypted Cookie Storage"""
    __tablename__ = "browser_cookies"
    id = Column(Integer, primary_key=True, autoincrement=True)
    workspace_id = Column(Integer, ForeignKey("browser_workspaces.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    domain = Column(String, nullable=False, index=True)
    encrypted_data = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class ResearchSession(Base):
    """AI Research Pipeline tracking"""
    __tablename__ = "browser_research_sessions"
    id = Column(String, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    query = Column(String, nullable=False)
    status = Column(String, default="in_progress") # 'in_progress', 'completed', 'failed'
    report_markdown = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
