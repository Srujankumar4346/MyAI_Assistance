from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from backend.database.connection import get_db
from backend.database.models import User
from backend.schemas.schemas import MemorySchema, MemoryCreateInput
from backend.security.auth import get_current_user
from backend.controllers.memory_controller import (
    get_all_memories_controller, add_memory_controller, delete_memory_controller
)

router = APIRouter()

@router.get("/memory", response_model=List[MemorySchema])
def get_memories(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return get_all_memories_controller(db, current_user)

@router.post("/memory")
def add_memory(payload: MemoryCreateInput, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return add_memory_controller(payload, db, current_user)

@router.delete("/memory/{memory_id}")
def delete_memory(memory_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return delete_memory_controller(memory_id, db, current_user)
