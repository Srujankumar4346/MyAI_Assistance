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
from backend.memory_engine.context import context_engine
from backend.memory_engine.learning import learning_engine
from backend.memory_engine.knowledge_graph import knowledge_graph
from backend.memory_engine.neural_memory import neural_memory
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
    Called as a BackgroundTask.
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


async def _phase3_post_chat(user_id: int, user_text: str, ai_response: str) -> None:
    """
    Phase 3 background task — runs after each chat turn:
    1. Update the learning profile
    2. Extract entities and ingest to knowledge graph
    3. Auto-store conversation memories (high-importance only)
    """
    import asyncio
    try:
        await learning_engine.update_from_conversation(user_id, user_text, ai_response)
        combined = f"{user_text} {ai_response}"
        await knowledge_graph.ingest_text(combined, user_id)
        # Auto-store high-importance content as episodic memory
        from backend.memory_engine.neural_memory import compute_importance
        importance = compute_importance(user_text, "episodic", "general")
        if importance >= 60:
            await neural_memory.store_memory(
                content=user_text,
                user_id=user_id,
                memory_type="episodic",
                category="general",
                source="chat",
                importance_override=importance,
            )
    except Exception as e:
        from backend.utils.logger import logger
        logger.warning(f"[Phase3PostChat] Background task failed: {e}")


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

    # Phase 3: Rich context from Neural Memory Engine
    memory_context = await context_engine.build_context(
        user_id=current_user.id,
        query=payload.content,
        max_memories=8,
    )

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

    # ── Streaming generator ───────────────────────────────────────────────────
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
            full_reply = "".join(collected)
            if full_reply:
                # Save assistant message
                background_tasks.add_task(
                    _save_assistant_message,
                    chat_id,
                    full_reply,
                    payload.model or settings.DEFAULT_MODEL,
                )
                # Phase 3: Update learning profile from this conversation
                background_tasks.add_task(
                    _phase3_post_chat,
                    current_user.id,
                    payload.content,
                    full_reply,
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
