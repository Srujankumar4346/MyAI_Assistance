import uuid
from typing import List
from fastapi import HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from backend.database.models import Chat, Message, User
from backend.schemas.schemas import ChatMessageInput
from backend.services.ollama_service import ollama_service
from backend.memory.memory_manager import memory_manager
from backend.core.config import settings
from backend.database.connection import get_db

def get_history(db: Session, current_user: User):
    return db.query(Chat).filter(Chat.user_id == current_user.id).order_by(Chat.updated_at.desc()).all()

def get_messages(chat_id: str, db: Session, current_user: User):
    chat = db.query(Chat).filter(Chat.id == chat_id, Chat.user_id == current_user.id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return db.query(Message).filter(Message.chat_id == chat_id).order_by(Message.created_at.asc()).all()

async def post_chat_message(payload: ChatMessageInput, db: Session, current_user: User):
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

    # Save user message
    user_msg = Message(chat_id=chat_id, sender="user", content=payload.content, model=payload.model)
    db.add(user_msg)
    db.commit()

    # Query ChromaDB memory context
    memories = memory_manager.query_memories(payload.content, n_results=3)
    memory_context = "\n".join([f"- {m['content']}" for m in memories]) if memories else ""

    # Fetch recent conversation history
    past_messages = db.query(Message).filter(Message.chat_id == chat_id).order_by(Message.created_at.asc()).all()
    formatted_past = [{"role": ("user" if m.sender == "user" else "assistant"), "content": m.content} for m in past_messages[-10:]]

    async def stream_generator():
        full_assistant_reply = ""
        async for chunk in ollama_service.generate_stream(
            messages=formatted_past,
            model=payload.model or settings.DEFAULT_MODEL,
            context_memories=memory_context
        ):
            full_assistant_reply += chunk
            yield chunk

        # Save assistant message to DB after stream completes
        if full_assistant_reply:
            new_db = next(get_db())
            try:
                asst_msg = Message(chat_id=chat_id, sender="assistant", content=full_assistant_reply, model=payload.model)
                new_db.add(asst_msg)
                new_db.commit()
            finally:
                new_db.close()

    return StreamingResponse(stream_generator(), media_type="text/plain", headers={"X-Chat-ID": chat_id})

def delete_chat_session(chat_id: str, db: Session, current_user: User):
    chat = db.query(Chat).filter(Chat.id == chat_id, Chat.user_id == current_user.id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Conversation not found")
    db.delete(chat)
    db.commit()
    return {"message": "Chat session deleted"}
