import uuid
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from backend.database.connection import SessionLocal
from backend.database.models import Chat, Message, User
from backend.schemas.schemas import ChatMessageInput
from backend.services.ollama_service import ollama_service
from backend.memory.memory_manager import memory_manager
from backend.core.config import settings


def get_history(db: Session, current_user: User):
    return (
        db.query(Chat)
        .filter(Chat.user_id == current_user.id)
        .order_by(Chat.updated_at.desc())
        .all()
    )


def get_messages(chat_id: str, db: Session, current_user: User):
    chat = db.query(Chat).filter(Chat.id == chat_id, Chat.user_id == current_user.id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return (
        db.query(Message)
        .filter(Message.chat_id == chat_id)
        .order_by(Message.created_at.asc())
        .all()
    )


def _save_assistant_message(chat_id: str, content: str, model: str) -> None:
    """
    Save the completed assistant message in its own DB session.
    Called as a BackgroundTask — guaranteed to close even if streaming is interrupted.
    """
    db = SessionLocal()
    try:
        msg = Message(chat_id=chat_id, sender="assistant", content=content, model=model)
        db.add(msg)
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


async def post_chat_message(
    payload: ChatMessageInput,
    db: Session,
    current_user: User,
    background_tasks: BackgroundTasks,
):
    chat_id = payload.chat_id
    if not chat_id:
        chat_id = str(uuid.uuid4())
        title = payload.content[:30] + ("..." if len(payload.content) > 30 else "")
        chat = Chat(id=chat_id, title=title, user_id=current_user.id)
        db.add(chat)
        db.commit()
    else:
        chat = db.query(Chat).filter(Chat.id == chat_id, Chat.user_id == current_user.id).first()
        if not chat:
            raise HTTPException(status_code=404, detail="Chat session not found")

    # Save user message in the *request* session (safe — not inside generator)
    user_msg = Message(
        chat_id=chat_id,
        sender="user",
        content=payload.content,
        model=payload.model,
    )
    db.add(user_msg)
    db.commit()

    # Retrieve memory context (ChromaDB or empty)
    memories = memory_manager.query_memories(payload.content, n_results=3)
    memory_context = "\n".join([f"- {m['content']}" for m in memories]) if memories else ""

    # Retrieve recent conversation history (last 10 messages)
    past_messages = (
        db.query(Message)
        .filter(Message.chat_id == chat_id)
        .order_by(Message.created_at.asc())
        .all()
    )
    formatted_past = [
        {"role": ("user" if m.sender == "user" else "assistant"), "content": m.content}
        for m in past_messages[-10:]
    ]

    # ── Streaming generator — uses its OWN context, no session references ────
    collected: list[str] = []

    async def stream_generator() -> AsyncGenerator[str, None]:
        try:
            async for chunk in ollama_service.generate_stream(
                messages=formatted_past,
                model=payload.model or settings.DEFAULT_MODEL,
                context_memories=memory_context,
            ):
                collected.append(chunk)
                yield chunk
        finally:
            # Schedule DB write as a background task — runs AFTER response completes
            # even if the client disconnects or an exception occurs.
            full_reply = "".join(collected)
            if full_reply:
                background_tasks.add_task(
                    _save_assistant_message,
                    chat_id,
                    full_reply,
                    payload.model or settings.DEFAULT_MODEL,
                )

    return StreamingResponse(
        stream_generator(),
        media_type="text/plain",
        headers={"X-Chat-ID": chat_id},
    )


def delete_chat_session(chat_id: str, db: Session, current_user: User):
    chat = db.query(Chat).filter(Chat.id == chat_id, Chat.user_id == current_user.id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Conversation not found")
    db.delete(chat)
    db.commit()
    return {"message": "Chat session deleted"}
