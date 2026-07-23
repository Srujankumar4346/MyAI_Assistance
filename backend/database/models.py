from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.database.connection import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=True)
    email = Column(String, nullable=True)
    provider = Column(String, default="local")
    provider_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    chats = relationship("Chat", back_populates="owner", cascade="all, delete-orphan")

class Chat(Base):
    __tablename__ = "chats"

    id = Column(String, primary_key=True, index=True) # UUID string
    title = Column(String, default="New Conversation")
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner = relationship("User", back_populates="chats")
    messages = relationship("Message", back_populates="chat", cascade="all, delete-orphan")

class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    chat_id = Column(String, ForeignKey("chats.id"), nullable=False)
    sender = Column(String, nullable=False) # 'user' or 'assistant' or 'system'
    content = Column(Text, nullable=False)
    model = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    chat = relationship("Chat", back_populates="messages")

class AppSettings(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    theme = Column(String, default="dark")
    selected_model = Column(String, default="gemma")
    memory_enabled = Column(Boolean, default=True)
    streaming_enabled = Column(Boolean, default=True)
    animation_enabled = Column(Boolean, default=True)
    auto_save_conversations = Column(Boolean, default=True)

class SystemLog(Base):
    __tablename__ = "system_logs"

    id = Column(Integer, primary_key=True, index=True)
    level = Column(String, default="INFO")
    event = Column(String, nullable=False)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class MemoryModel(Base):
    __tablename__ = "memory"

    id = Column(String, primary_key=True, index=True) # UUID string
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    category = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

# ─── Phase 2: Voice AI Models ────────────────────────────────────────────────

class VoiceSession(Base):
    """Stores each completed voice conversation turn."""
    __tablename__ = "voice_sessions"

    id = Column(String, primary_key=True, index=True)  # UUID
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    user_transcript = Column(Text, nullable=False)
    ai_response = Column(Text, nullable=True)
    language = Column(String, default="en-US")
    confidence = Column(Float, default=0.0)
    duration_ms = Column(Integer, default=0)
    model_used = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class VoiceSettings(Base):
    """Per-user voice preferences."""
    __tablename__ = "voice_settings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    voice_name = Column(String, default="en-US-AriaNeural")
    language = Column(String, default="en-US")
    speed = Column(Float, default=1.0)
    pitch = Column(Float, default=1.0)
    volume = Column(Float, default=1.0)
    continuous_mode = Column(Boolean, default=False)
    noise_reduction = Column(Boolean, default=True)
    auto_detect_silence = Column(Boolean, default=True)
