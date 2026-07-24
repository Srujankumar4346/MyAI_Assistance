import uuid

from fastapi import HTTPException
from sqlalchemy.orm import Session

from backend.database.models import MemoryModel, User
from backend.memory.memory_manager import memory_manager
from backend.schemas.schemas import MemoryCreateInput


def get_all_memories_controller(db: Session, current_user: User):
    # Fetch from SQL DB for user
    db_memories = db.query(MemoryModel).filter(MemoryModel.user_id == current_user.id).all()
    # We can format it to match the MemorySchema
    return [
        {"id": m.id, "content": m.content, "category": m.category or "general"} for m in db_memories
    ]


def add_memory_controller(payload: MemoryCreateInput, db: Session, current_user: User):
    # Add to ChromaDB vector store
    # Since ChromaDB manages its own UUIDs, we can sync the ID or generate a single UUID for both
    mem_id = str(uuid.uuid4())
    success = memory_manager.add_memory(
        content=payload.content, category=payload.category, metadata={"user_id": current_user.id}
    )
    if not success:
        raise HTTPException(status_code=500, detail="Failed to store memory in ChromaDB")

    # Save in relational database as requested
    db_mem = MemoryModel(
        id=mem_id, user_id=current_user.id, content=payload.content, category=payload.category
    )
    db.add(db_mem)
    db.commit()
    return {"message": "Memory saved successfully", "id": mem_id}


def delete_memory_controller(memory_id: str, db: Session, current_user: User):
    # Try deleting from vector memory
    memory_manager.delete_memory(memory_id)

    # Delete from relational DB
    db_mem = (
        db.query(MemoryModel)
        .filter(MemoryModel.id == memory_id, MemoryModel.user_id == current_user.id)
        .first()
    )
    if db_mem:
        db.delete(db_mem)
        db.commit()
    return {"message": "Memory deleted"}
