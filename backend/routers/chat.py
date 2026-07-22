from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from backend.database.connection import get_db
from backend.database.models import User
from backend.schemas.schemas import ChatSchema, MessageSchema, ChatMessageInput
from backend.security.auth import get_current_user
from backend.controllers.chat_controller import get_history, get_messages, post_chat_message, delete_chat_session

router = APIRouter()

@router.get("/history", response_model=List[ChatSchema])
def read_chat_history(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return get_history(db, current_user)

@router.get("/history/{chat_id}", response_model=List[MessageSchema])
def read_chat_messages(chat_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return get_messages(chat_id, db, current_user)

@router.post("/chat")
async def send_chat(payload: ChatMessageInput, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return await post_chat_message(payload, db, current_user)

@router.delete("/history/{chat_id}")
def delete_chat(chat_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return delete_chat_session(chat_id, db, current_user)
