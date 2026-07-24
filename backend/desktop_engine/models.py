"""
Phase 4 — Desktop Automation Engine Database Models

Provides models for permissions, automation logs, clipboard history,
terminal history, system snapshots, app history, scheduled tasks, and macros.
"""

from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Index, Integer, String, Text

from backend.database.connection import Base

# ─── Permissions & Security ──────────────────────────────────────────────────


class PermissionRule(Base):
    """
    Rules for 4-level permission system (SAFE, MEDIUM, HIGH, CRITICAL).
    User decisions (Allow Once, Always Allow, Always Deny).
    """

    __tablename__ = "permission_rules"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    action_type = Column(String, nullable=False, index=True)  # e.g. "open_app", "delete_file"
    target = Column(String, nullable=False)  # e.g. "VS Code", "C:/path"
    permission_level = Column(String, default="SAFE")  # 'SAFE', 'MEDIUM', 'HIGH', 'CRITICAL'
    decision = Column(String, nullable=False)  # 'ALWAYS_ALLOW', 'ALWAYS_DENY', 'ALLOW_ONCE'
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index("ix_perm_user_action_target", "user_id", "action_type", "target", unique=True),
    )


# ─── Action Logs ─────────────────────────────────────────────────────────────


class AutomationLog(Base):
    """Logs every executed desktop action."""

    __tablename__ = "automation_logs"

    id = Column(String, primary_key=True, index=True)  # UUID
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    action_type = Column(String, nullable=False, index=True)
    target = Column(String, nullable=False)
    status = Column(String, default="success")  # 'success', 'failed', 'blocked'
    details = Column(Text, nullable=True)  # JSON args/results
    duration_ms = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)


# ─── Engine Histories ────────────────────────────────────────────────────────


class ClipboardHistory(Base):
    __tablename__ = "clipboard_history"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    content_type = Column(String, default="text")  # 'text', 'image'
    content = Column(Text, nullable=False)  # The text or base64 image
    is_pinned = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)


class TerminalHistory(Base):
    __tablename__ = "terminal_history"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    command = Column(Text, nullable=False)
    output = Column(Text, nullable=True)
    error = Column(Text, nullable=True)
    exit_code = Column(Integer, default=0)
    duration_ms = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)


class ApplicationHistory(Base):
    __tablename__ = "application_history"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    app_name = Column(String, nullable=False, index=True)
    process_id = Column(Integer, nullable=True)
    event_type = Column(String, nullable=False)  # 'opened', 'closed', 'focused'
    created_at = Column(DateTime, default=datetime.utcnow, index=True)


class SystemSnapshot(Base):
    __tablename__ = "system_snapshots"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    cpu_percent = Column(Float, default=0.0)
    ram_percent = Column(Float, default=0.0)
    disk_percent = Column(Float, default=0.0)
    battery_percent = Column(Float, nullable=True)
    temperature = Column(Float, nullable=True)  # graceful fallback if unavailable
    created_at = Column(DateTime, default=datetime.utcnow, index=True)


# ─── Schedulers & Macros ─────────────────────────────────────────────────────


class ScheduledTask(Base):
    __tablename__ = "scheduled_tasks"
    id = Column(String, primary_key=True, index=True)  # UUID
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    task_name = Column(String, nullable=False)
    action_type = Column(String, nullable=False)
    target = Column(String, nullable=False)
    cron_expression = Column(String, nullable=True)
    run_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class AutomationMacro(Base):
    __tablename__ = "automation_macros"
    id = Column(String, primary_key=True, index=True)  # UUID
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String, nullable=False, index=True)
    trigger_phrase = Column(String, nullable=True)  # For voice integration e.g. "Start Development"
    steps_json = Column(Text, nullable=False)  # JSON array of {action, target, args}
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
