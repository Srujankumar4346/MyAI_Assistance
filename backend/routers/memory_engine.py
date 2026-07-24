"""
Phase 3 — Neural Memory Engine Router

All Phase 3 endpoints under /api/memory/* and /api/knowledge/* and /api/learning/*
Compatible with existing /api/memory routes (which remain on the old router).
"""

import json
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from backend.database.models import User
from backend.memory_engine.document_intelligence import document_intelligence
from backend.memory_engine.knowledge_graph import knowledge_graph
from backend.memory_engine.learning import learning_engine
from backend.memory_engine.neural_memory import neural_memory
from backend.security.auth import get_current_user
from backend.utils.logger import logger

router = APIRouter()


# ─── Pydantic Schemas ──────────────────────────────────────────────────────────


class MemoryStoreInput(BaseModel):
    content: str
    memory_type: Optional[str] = "semantic"
    category: Optional[str] = "general"
    tags: Optional[List[str]] = []
    source: Optional[str] = "manual"
    project_name: Optional[str] = None
    importance_override: Optional[float] = None
    expires_in_hours: Optional[int] = None


class MemoryUpdateInput(BaseModel):
    content: Optional[str] = None
    category: Optional[str] = None
    memory_type: Optional[str] = None
    importance_score: Optional[float] = None
    project_name: Optional[str] = None
    tags: Optional[List[str]] = None


class KnowledgeNodeInput(BaseModel):
    label: str
    node_type: str = "concept"
    description: Optional[str] = ""


class LearningUpdateInput(BaseModel):
    primary_language: Optional[str] = None
    secondary_languages: Optional[str] = None
    preferred_frameworks: Optional[str] = None
    preferred_ai_models: Optional[str] = None
    coding_style: Optional[str] = None
    reply_style: Optional[str] = None
    writing_style: Optional[str] = None
    daily_routine: Optional[str] = None
    work_habits: Optional[str] = None
    learning_habits: Optional[str] = None
    frequently_used_commands: Optional[str] = None


# ─── Memory Endpoints ──────────────────────────────────────────────────────────


@router.post("/memory/store")
async def store_memory(
    payload: MemoryStoreInput,
    current_user: User = Depends(get_current_user),
):
    result = await neural_memory.store_memory(
        content=payload.content,
        user_id=current_user.id,
        memory_type=payload.memory_type or "semantic",
        category=payload.category or "general",
        tags=payload.tags or [],
        source=payload.source or "manual",
        project_name=payload.project_name,
        importance_override=payload.importance_override,
        expires_in_hours=payload.expires_in_hours,
    )
    if result is None:
        raise HTTPException(
            status_code=400, detail="Memory not stored (content too trivial or duplicate)"
        )
    return result


@router.get("/memory/search")
async def search_memories(
    q: str = Query(default="", description="Search query"),
    category: Optional[str] = Query(default=None),
    memory_type: Optional[str] = Query(default=None),
    tags: Optional[str] = Query(default=None, description="Comma-separated tags"),
    date_from: Optional[str] = Query(default=None),
    date_to: Optional[str] = Query(default=None),
    min_importance: float = Query(default=0.0),
    pinned_only: bool = Query(default=False),
    limit: int = Query(default=20, le=100),
    current_user: User = Depends(get_current_user),
):
    tag_list = [t.strip() for t in tags.split(",") if t.strip()] if tags else None
    df = datetime.fromisoformat(date_from) if date_from else None
    dt = datetime.fromisoformat(date_to) if date_to else None
    results = await neural_memory.search_memories(
        query=q,
        user_id=current_user.id,
        category=category,
        memory_type=memory_type,
        tags=tag_list,
        date_from=df,
        date_to=dt,
        min_importance=min_importance,
        pinned_only=pinned_only,
        limit=limit,
    )
    return {"results": results, "count": len(results)}


@router.get("/memory/all")
async def get_all_memories(
    limit: int = Query(default=100, le=500),
    current_user: User = Depends(get_current_user),
):
    results = await neural_memory.get_all_memories(current_user.id, limit=limit)
    return {"memories": results, "count": len(results)}


@router.get("/memory/timeline")
async def get_timeline(current_user: User = Depends(get_current_user)):
    timeline = await neural_memory.get_timeline(current_user.id)
    return {"timeline": timeline}


@router.get("/memory/statistics")
async def get_statistics(current_user: User = Depends(get_current_user)):
    stats = await neural_memory.get_statistics(current_user.id)
    return stats


@router.get("/memory/categories")
async def get_categories(current_user: User = Depends(get_current_user)):
    from backend.memory_engine.models import MEMORY_CATEGORIES, MEMORY_TYPES

    return {"categories": MEMORY_CATEGORIES, "types": MEMORY_TYPES}


@router.put("/memory/update/{memory_id}")
async def update_memory(
    memory_id: str,
    payload: MemoryUpdateInput,
    current_user: User = Depends(get_current_user),
):
    result = await neural_memory.update_memory(
        memory_id, current_user.id, payload.dict(exclude_none=True)
    )
    if not result:
        raise HTTPException(status_code=404, detail="Memory not found")
    return result


@router.delete("/memory/delete/{memory_id}")
async def delete_memory(
    memory_id: str,
    current_user: User = Depends(get_current_user),
):
    success = await neural_memory.delete_memory(memory_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Memory not found")
    return {"message": "Memory deleted", "id": memory_id}


@router.post("/memory/pin/{memory_id}")
async def pin_memory(
    memory_id: str,
    current_user: User = Depends(get_current_user),
):
    success = await neural_memory.pin_memory(memory_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Memory not found")
    return {"message": "Pin toggled", "id": memory_id}


@router.post("/memory/archive/{memory_id}")
async def archive_memory(
    memory_id: str,
    current_user: User = Depends(get_current_user),
):
    success = await neural_memory.archive_memory(memory_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Memory not found")
    return {"message": "Archive toggled", "id": memory_id}


@router.post("/memory/reinforce/{memory_id}")
async def reinforce_memory(
    memory_id: str,
    current_user: User = Depends(get_current_user),
):
    success = await neural_memory.reinforce_by_id(memory_id, current_user.id)
    return {"reinforced": success}


@router.get("/memory/export")
async def export_memories(current_user: User = Depends(get_current_user)):
    memories = await neural_memory.export_memories(current_user.id)
    return JSONResponse(
        content={"memories": memories, "exported_at": datetime.utcnow().isoformat()},
        headers={"Content-Disposition": "attachment; filename=novax_memories.json"},
    )


@router.post("/memory/import")
async def import_memories(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    content = await file.read()
    try:
        data = json.loads(content)
        records = data.get("memories", data) if isinstance(data, dict) else data
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON file")

    async def _do_import():
        count = await neural_memory.import_memories(current_user.id, records)
        logger.info(f"[MemoryImport] Imported {count} memories for user {current_user.id}")

    background_tasks.add_task(_do_import)
    return {"message": f"Import started — {len(records)} records queued"}


# ─── Document Intelligence ────────────────────────────────────────────────────


@router.post("/memory/document/upload")
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    content = await file.read()
    if len(content) > 50 * 1024 * 1024:  # 50 MB limit
        raise HTTPException(status_code=413, detail="File too large (max 50 MB)")

    async def _process():
        await document_intelligence.process_document(file.filename, content, current_user.id)

    background_tasks.add_task(_process)
    return {"message": f"Document '{file.filename}' queued for processing"}


@router.get("/memory/documents")
async def list_documents(current_user: User = Depends(get_current_user)):
    docs = await document_intelligence.list_documents(current_user.id)
    return {"documents": docs}


# ─── Knowledge Graph ──────────────────────────────────────────────────────────


@router.get("/knowledge/graph")
async def get_knowledge_graph(current_user: User = Depends(get_current_user)):
    graph = await knowledge_graph.get_graph(current_user.id)
    return graph


@router.get("/knowledge/search")
async def search_knowledge(
    q: str = Query(..., min_length=1),
    current_user: User = Depends(get_current_user),
):
    nodes = await knowledge_graph.search_nodes(current_user.id, q)
    return {"nodes": nodes}


@router.get("/knowledge/relationships")
async def get_relationships(
    node_id: str = Query(...),
    current_user: User = Depends(get_current_user),
):
    return await knowledge_graph.get_relationships(current_user.id, node_id)


@router.post("/knowledge/node")
async def add_knowledge_node(
    payload: KnowledgeNodeInput,
    current_user: User = Depends(get_current_user),
):
    node = await knowledge_graph.add_node_manual(
        current_user.id, payload.label, payload.node_type, payload.description
    )
    return node


# ─── Learning / Personality ───────────────────────────────────────────────────


@router.get("/learning/profile")
async def get_learning_profile(current_user: User = Depends(get_current_user)):
    profile = await learning_engine.get_profile(current_user.id)
    return profile


@router.post("/learning/update")
async def update_learning_profile(
    payload: LearningUpdateInput,
    current_user: User = Depends(get_current_user),
):
    updates = payload.dict(exclude_none=True)
    result = await learning_engine.update_profile_manual(current_user.id, updates)
    return result


@router.get("/learning/statistics")
async def get_learning_statistics(current_user: User = Depends(get_current_user)):
    return await learning_engine.get_statistics(current_user.id)
