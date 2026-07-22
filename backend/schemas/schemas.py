from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

# Auth Schemas
class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str

# Chat Schemas
class ChatMessageInput(BaseModel):
    chat_id: Optional[str] = None
    content: str
    model: Optional[str] = "gemma"

class MessageSchema(BaseModel):
    id: int
    sender: str
    content: str
    model: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ChatSchema(BaseModel):
    id: str
    title: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Memory Schemas
class MemoryCreateInput(BaseModel):
    content: str
    category: Optional[str] = "general"

class MemorySchema(BaseModel):
    id: str
    content: str
    category: str

# Settings Schemas
class AppSettingsSchema(BaseModel):
    theme: str = "dark"
    selected_model: str = "gemma"
    memory_enabled: bool = True
    streaming_enabled: bool = True
    animation_enabled: bool = True
    auto_save_conversations: bool = True

    class Config:
        from_attributes = True
