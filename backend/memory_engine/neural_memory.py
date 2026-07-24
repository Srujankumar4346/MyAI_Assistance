"""
Phase 3 — Neural Memory Engine (Core)

Responsibilities:
  - Store memories with importance scoring, duplicate detection, embedding
  - Reinforce memories on access (importance boost)
  - Age/decay stale memories (background)
  - Compress/merge highly similar memories (background)
  - Statistics and health metrics
  - Timeline grouping
  - Export / Import
"""
import uuid
import json
import math
import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple

from sqlalchemy.orm import Session

from backend.database.connection import SessionLocal
from backend.memory_engine.models import (
    EnhancedMemory, MemoryTag, MemoryRelationship,
    MemoryTimelineEvent, MEMORY_CATEGORIES, MEMORY_TYPES
)
from backend.memory_engine.embeddings import embedding_service, tfidf_similarity
from backend.memory_engine.cache import cache
from backend.utils.logger import logger

# ChromaDB collection name for Phase 3
CHROMA_COLLECTION = "novax_neural_memory_v3"


def _get_chroma_collection():
    """Lazily get ChromaDB collection; returns None if unavailable."""
    try:
        import chromadb, os
        chroma_dir = os.getenv("CHROMA_DB_DIR", "./memory/chroma_storage")
        client = chromadb.PersistentClient(path=chroma_dir)
        return client.get_or_create_collection(
            name=CHROMA_COLLECTION,
            metadata={"hnsw:space": "cosine"}
        )
    except Exception as e:
        logger.warning(f"[NeuralMemory] ChromaDB unavailable: {e}")
        return None


# ── Importance Scoring ─────────────────────────────────────────────────────────

_IMPORTANCE_KEYWORDS = {
    "deadline", "interview", "meeting", "project", "critical", "urgent",
    "important", "password", "api key", "token", "secret", "deployment",
    "production", "launch", "exam", "assessment", "goal", "milestone",
    "never forget", "remember", "always", "must", "key", "essential"
}

_GREETING_PATTERNS = {
    "hello", "hi", "hey", "good morning", "good evening", "how are you",
    "what's up", "bye", "goodbye", "thanks", "thank you", "ok", "okay", "sure"
}


def compute_importance(content: str, memory_type: str, category: str) -> float:
    """
    Compute 0–100 importance score based on content signals.
    """
    text = content.lower()

    # Casual/greeting content → very low
    if any(p in text for p in _GREETING_PATTERNS) and len(content) < 50:
        return 5.0

    score = 40.0  # baseline

    # Keyword boosts
    for kw in _IMPORTANCE_KEYWORDS:
        if kw in text:
            score += 8.0

    # Type boosts
    type_boosts = {
        "episodic": 10, "project": 15, "preference": 8,
        "coding": 12, "document": 10, "skill": 12,
        "short_term": -10,  # short-term starts lower
    }
    score += type_boosts.get(memory_type, 0)

    # Category boosts
    cat_boosts = {
        "career": 15, "goals": 15, "projects": 12, "placement": 15,
        "health": 10, "programming": 10, "education": 8,
    }
    score += cat_boosts.get(category, 0)

    # Length signal — longer content tends to be more meaningful
    words = len(content.split())
    if words > 50:
        score += 5
    if words > 100:
        score += 5

    return min(100.0, max(0.0, score))


def _is_meaningful(content: str) -> bool:
    """Filter out trivial/casual messages."""
    text = content.strip().lower()
    if len(text) < 10:
        return False
    if any(p == text or text.startswith(p + " ") for p in _GREETING_PATTERNS):
        return False
    return True


# ── Duplicate Detection ────────────────────────────────────────────────────────

def _similarity_threshold() -> float:
    return 0.92  # memories above this similarity are considered duplicates


# ── Neural Memory Engine ───────────────────────────────────────────────────────

class NeuralMemoryEngine:

    def __init__(self):
        self._chroma = None
        self._chroma_initialized = False

    def _get_chroma(self):
        if not self._chroma_initialized:
            self._chroma = _get_chroma_collection()
            self._chroma_initialized = True
        return self._chroma

    # ── Store ──────────────────────────────────────────────────────────────────

    async def store_memory(
        self,
        content: str,
        user_id: int,
        memory_type: str = "semantic",
        category: str = "general",
        tags: Optional[List[str]] = None,
        source: str = "manual",
        project_name: Optional[str] = None,
        importance_override: Optional[float] = None,
        expires_in_hours: Optional[int] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Store a new memory. Returns the saved memory dict or None if skipped.
        Performs: meaningfulness check → duplicate detection → importance scoring
                  → embedding → ChromaDB → SQLite → timeline event → cache invalidation
        """
        content = content.strip()
        if not _is_meaningful(content):
            logger.debug(f"[NeuralMemory] Skipping trivial content: {content[:40]}")
            return None

        db = SessionLocal()
        try:
            # ── Duplicate Detection ────────────────────────────────────────────
            existing = await self._find_duplicates(content, user_id, db)
            if existing:
                # Reinforce the existing memory instead
                await self._reinforce(existing[0], db)
                logger.debug(f"[NeuralMemory] Duplicate detected — reinforcing {existing[0].id}")
                return {"id": existing[0].id, "status": "reinforced"}

            # ── Importance Score ───────────────────────────────────────────────
            importance = importance_override or compute_importance(content, memory_type, category)

            # ── Generate Embedding ─────────────────────────────────────────────
            vector, provider = await embedding_service.embed_one(content)
            mem_id = str(uuid.uuid4())
            embedding_id = mem_id  # same ID for ChromaDB

            # ── ChromaDB ───────────────────────────────────────────────────────
            chroma = self._get_chroma()
            if chroma:
                try:
                    chroma.add(
                        documents=[content],
                        embeddings=[vector] if any(v != 0.0 for v in vector) else None,
                        metadatas=[{
                            "user_id": str(user_id),
                            "memory_type": memory_type,
                            "category": category,
                            "source": source,
                        }],
                        ids=[embedding_id]
                    )
                except Exception as e:
                    logger.warning(f"[NeuralMemory] ChromaDB add failed: {e}")
                    embedding_id = None

            # ── SQLite ─────────────────────────────────────────────────────────
            expires_at = None
            if expires_in_hours:
                expires_at = datetime.utcnow() + timedelta(hours=expires_in_hours)
            if memory_type == "short_term" and not expires_at:
                expires_at = datetime.utcnow() + timedelta(hours=24)

            mem = EnhancedMemory(
                id=mem_id,
                user_id=user_id,
                content=content,
                memory_type=memory_type,
                category=category,
                source=source,
                importance_score=importance,
                confidence_score=85.0,
                embedding_id=embedding_id,
                project_name=project_name,
                expires_at=expires_at,
            )
            db.add(mem)

            # Tags
            if tags:
                for tag in tags:
                    t = tag.strip().lower()
                    if t:
                        db.add(MemoryTag(memory_id=mem_id, tag=t))

            # Timeline event
            db.add(MemoryTimelineEvent(
                user_id=user_id,
                memory_id=mem_id,
                event_type="memory_created",
                title=f"New {category} memory",
                description=content[:100],
                category=category,
            ))

            db.commit()
            await cache.invalidate_prefix(f"memories:{user_id}:")
            logger.info(f"[NeuralMemory] Stored memory {mem_id} (importance={importance:.0f}, provider={provider})")

            return {
                "id": mem_id,
                "content": content,
                "memory_type": memory_type,
                "category": category,
                "importance_score": importance,
                "source": source,
                "tags": tags or [],
                "created_at": mem.created_at.isoformat(),
                "status": "created",
            }
        except Exception as e:
            db.rollback()
            logger.error(f"[NeuralMemory] store_memory failed: {e}")
            return None
        finally:
            db.close()

    # ── Duplicate Detection ────────────────────────────────────────────────────

    async def _find_duplicates(self, content: str, user_id: int, db: Session) -> List[EnhancedMemory]:
        """Return existing memories with similarity above threshold."""
        recent = (
            db.query(EnhancedMemory)
            .filter(EnhancedMemory.user_id == user_id, EnhancedMemory.is_archived == False)
            .order_by(EnhancedMemory.created_at.desc())
            .limit(200)
            .all()
        )
        if not recent:
            return []

        texts = [m.content for m in recent]
        scores = tfidf_similarity(content, texts)
        threshold = _similarity_threshold()
        return [m for m, s in zip(recent, scores) if s >= threshold]

    # ── Reinforce ─────────────────────────────────────────────────────────────

    async def _reinforce(self, mem: EnhancedMemory, db: Session) -> None:
        """Boost importance on access."""
        mem.access_count += 1
        mem.last_accessed = datetime.utcnow()
        # Logarithmic boost: 20 accesses → +20 importance at most
        boost = math.log1p(mem.access_count) * 2.0
        mem.importance_score = min(100.0, mem.importance_score + boost)
        db.commit()

    async def reinforce_by_id(self, memory_id: str, user_id: int) -> bool:
        db = SessionLocal()
        try:
            mem = db.query(EnhancedMemory).filter(
                EnhancedMemory.id == memory_id,
                EnhancedMemory.user_id == user_id
            ).first()
            if mem:
                await self._reinforce(mem, db)
                return True
            return False
        finally:
            db.close()

    # ── Search ────────────────────────────────────────────────────────────────

    async def search_memories(
        self,
        query: str,
        user_id: int,
        category: Optional[str] = None,
        memory_type: Optional[str] = None,
        tags: Optional[List[str]] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        min_importance: float = 0.0,
        pinned_only: bool = False,
        limit: int = 20,
    ) -> List[Dict[str, Any]]:
        """Hybrid semantic + keyword search with filters."""
        cache_key = f"memories:{user_id}:search:{hash(query + str(category) + str(memory_type))}"
        cached = await cache.get(cache_key)
        if cached:
            return cached

        db = SessionLocal()
        try:
            q = db.query(EnhancedMemory).filter(
                EnhancedMemory.user_id == user_id,
                EnhancedMemory.is_archived == False,
            )
            if category:
                q = q.filter(EnhancedMemory.category == category)
            if memory_type:
                q = q.filter(EnhancedMemory.memory_type == memory_type)
            if min_importance > 0:
                q = q.filter(EnhancedMemory.importance_score >= min_importance)
            if pinned_only:
                q = q.filter(EnhancedMemory.is_pinned == True)
            if date_from:
                q = q.filter(EnhancedMemory.created_at >= date_from)
            if date_to:
                q = q.filter(EnhancedMemory.created_at <= date_to)

            # Tag filter
            if tags:
                from sqlalchemy import exists
                for tag in tags:
                    q = q.filter(
                        exists().where(
                            MemoryTag.memory_id == EnhancedMemory.id,
                        ).where(MemoryTag.tag == tag.lower())
                    )

            candidates = q.order_by(EnhancedMemory.importance_score.desc()).limit(500).all()

            if not candidates:
                return []

            # Semantic scoring
            if query.strip():
                texts = [m.content for m in candidates]
                scores = tfidf_similarity(query, texts)

                # ChromaDB semantic boost
                chroma = self._get_chroma()
                if chroma:
                    try:
                        count = chroma.count()
                        if count > 0:
                            res = chroma.query(
                                query_texts=[query],
                                n_results=min(50, count),
                                where={"user_id": str(user_id)} if count > 0 else None,
                            )
                            chroma_ids = set(res["ids"][0]) if res and res.get("ids") else set()
                            id_to_idx = {m.id: i for i, m in enumerate(candidates)}
                            for cid in chroma_ids:
                                if cid in id_to_idx:
                                    scores[id_to_idx[cid]] = min(1.0, scores[id_to_idx[cid]] + 0.3)
                    except Exception as e:
                        logger.debug(f"[NeuralMemory] ChromaDB search error: {e}")

                ranked = sorted(
                    zip(candidates, scores),
                    key=lambda x: x[1] * 0.5 + (x[0].importance_score / 100.0) * 0.5,
                    reverse=True
                )
                candidates = [m for m, s in ranked if s > 0.05 or m.importance_score >= 70][:limit]
            else:
                candidates = candidates[:limit]

            results = [self._serialize(m, db) for m in candidates]
            await cache.set(cache_key, results, ttl=60)
            return results
        finally:
            db.close()

    async def get_all_memories(self, user_id: int, limit: int = 100) -> List[Dict[str, Any]]:
        cache_key = f"memories:{user_id}:all"
        cached = await cache.get(cache_key)
        if cached:
            return cached
        db = SessionLocal()
        try:
            mems = (
                db.query(EnhancedMemory)
                .filter(EnhancedMemory.user_id == user_id, EnhancedMemory.is_archived == False)
                .order_by(EnhancedMemory.importance_score.desc(), EnhancedMemory.created_at.desc())
                .limit(limit)
                .all()
            )
            results = [self._serialize(m, db) for m in mems]
            await cache.set(cache_key, results, ttl=120)
            return results
        finally:
            db.close()

    # ── Timeline ───────────────────────────────────────────────────────────────

    async def get_timeline(self, user_id: int) -> List[Dict[str, Any]]:
        db = SessionLocal()
        try:
            mems = (
                db.query(EnhancedMemory)
                .filter(EnhancedMemory.user_id == user_id, EnhancedMemory.is_archived == False)
                .order_by(EnhancedMemory.created_at.desc())
                .limit(200)
                .all()
            )
            groups: Dict[str, List] = {}
            now = datetime.utcnow()
            for m in mems:
                delta = now - m.created_at
                if delta.days == 0:
                    label = "Today"
                elif delta.days == 1:
                    label = "Yesterday"
                elif delta.days <= 7:
                    label = "This Week"
                elif delta.days <= 30:
                    label = "This Month"
                elif delta.days <= 365:
                    label = "This Year"
                else:
                    label = "Older"
                groups.setdefault(label, []).append(self._serialize(m, db))

            order = ["Today", "Yesterday", "This Week", "This Month", "This Year", "Older"]
            return [{"period": p, "memories": groups[p]} for p in order if p in groups]
        finally:
            db.close()

    # ── Statistics ─────────────────────────────────────────────────────────────

    async def get_statistics(self, user_id: int) -> Dict[str, Any]:
        cache_key = f"memories:{user_id}:stats"
        cached = await cache.get(cache_key)
        if cached:
            return cached
        db = SessionLocal()
        try:
            total = db.query(EnhancedMemory).filter(
                EnhancedMemory.user_id == user_id, EnhancedMemory.is_archived == False
            ).count()
            pinned = db.query(EnhancedMemory).filter(
                EnhancedMemory.user_id == user_id, EnhancedMemory.is_pinned == True
            ).count()
            archived = db.query(EnhancedMemory).filter(
                EnhancedMemory.user_id == user_id, EnhancedMemory.is_archived == True
            ).count()

            # Category breakdown
            from sqlalchemy import func
            cat_rows = (
                db.query(EnhancedMemory.category, func.count(EnhancedMemory.id))
                .filter(EnhancedMemory.user_id == user_id, EnhancedMemory.is_archived == False)
                .group_by(EnhancedMemory.category)
                .all()
            )
            categories = {row[0]: row[1] for row in cat_rows}

            # Type breakdown
            type_rows = (
                db.query(EnhancedMemory.memory_type, func.count(EnhancedMemory.id))
                .filter(EnhancedMemory.user_id == user_id, EnhancedMemory.is_archived == False)
                .group_by(EnhancedMemory.memory_type)
                .all()
            )
            types = {row[0]: row[1] for row in type_rows}

            # Average importance
            avg_imp = db.query(func.avg(EnhancedMemory.importance_score)).filter(
                EnhancedMemory.user_id == user_id, EnhancedMemory.is_archived == False
            ).scalar() or 0.0

            # Top memories
            top = (
                db.query(EnhancedMemory)
                .filter(EnhancedMemory.user_id == user_id, EnhancedMemory.is_archived == False)
                .order_by(EnhancedMemory.importance_score.desc())
                .limit(5)
                .all()
            )
            stats = {
                "total_memories": total,
                "pinned": pinned,
                "archived": archived,
                "categories": categories,
                "types": types,
                "avg_importance": round(avg_imp, 1),
                "health_score": min(100, total * 2),  # crude health proxy
                "top_memories": [{"id": m.id, "content": m.content[:80], "importance": m.importance_score} for m in top],
                "embedding_provider": embedding_service.provider or "tfidf-fallback",
            }
            await cache.set(cache_key, stats, ttl=300)
            return stats
        finally:
            db.close()

    # ── Pin / Archive / Update / Delete ───────────────────────────────────────

    async def pin_memory(self, memory_id: str, user_id: int) -> bool:
        db = SessionLocal()
        try:
            mem = db.query(EnhancedMemory).filter(
                EnhancedMemory.id == memory_id, EnhancedMemory.user_id == user_id
            ).first()
            if not mem:
                return False
            mem.is_pinned = not mem.is_pinned
            db.commit()
            await cache.invalidate_prefix(f"memories:{user_id}:")
            return True
        finally:
            db.close()

    async def archive_memory(self, memory_id: str, user_id: int) -> bool:
        db = SessionLocal()
        try:
            mem = db.query(EnhancedMemory).filter(
                EnhancedMemory.id == memory_id, EnhancedMemory.user_id == user_id
            ).first()
            if not mem:
                return False
            mem.is_archived = not mem.is_archived
            db.commit()
            await cache.invalidate_prefix(f"memories:{user_id}:")
            return True
        finally:
            db.close()

    async def update_memory(self, memory_id: str, user_id: int, updates: Dict[str, Any]) -> Optional[Dict]:
        db = SessionLocal()
        try:
            mem = db.query(EnhancedMemory).filter(
                EnhancedMemory.id == memory_id, EnhancedMemory.user_id == user_id
            ).first()
            if not mem:
                return None
            for field in ["content", "category", "memory_type", "importance_score", "project_name"]:
                if field in updates:
                    setattr(mem, field, updates[field])
            if "tags" in updates:
                db.query(MemoryTag).filter(MemoryTag.memory_id == memory_id).delete()
                for tag in updates["tags"]:
                    db.add(MemoryTag(memory_id=memory_id, tag=tag.lower()))
            db.commit()
            await cache.invalidate_prefix(f"memories:{user_id}:")
            return self._serialize(mem, db)
        finally:
            db.close()

    async def delete_memory(self, memory_id: str, user_id: int) -> bool:
        db = SessionLocal()
        try:
            mem = db.query(EnhancedMemory).filter(
                EnhancedMemory.id == memory_id, EnhancedMemory.user_id == user_id
            ).first()
            if not mem:
                return False
            # Remove from ChromaDB
            chroma = self._get_chroma()
            if chroma and mem.embedding_id:
                try:
                    chroma.delete(ids=[mem.embedding_id])
                except Exception:
                    pass
            db.delete(mem)
            db.commit()
            await cache.invalidate_prefix(f"memories:{user_id}:")
            return True
        finally:
            db.close()

    # ── Background Decay ───────────────────────────────────────────────────────

    async def run_decay_cycle(self) -> int:
        """
        Reduce importance of unused memories. Returns number of decayed records.
        Should be called periodically (e.g., daily).
        """
        db = SessionLocal()
        try:
            threshold = datetime.utcnow() - timedelta(days=7)
            stale = (
                db.query(EnhancedMemory)
                .filter(
                    EnhancedMemory.is_pinned == False,
                    EnhancedMemory.is_archived == False,
                    EnhancedMemory.last_accessed < threshold,
                )
                .all()
            )
            count = 0
            for m in stale:
                if m.last_accessed:
                    days_since = (datetime.utcnow() - m.last_accessed).days
                else:
                    days_since = (datetime.utcnow() - m.created_at).days
                decay = 0.99 ** days_since  # 1% decay per day
                m.importance_score = max(0.0, m.importance_score * decay)
                m.decay_factor = decay
                count += 1
            db.commit()
            logger.info(f"[NeuralMemory] Decay cycle: {count} memories decayed.")
            return count
        finally:
            db.close()

    # ── Export / Import ────────────────────────────────────────────────────────

    async def export_memories(self, user_id: int) -> List[Dict[str, Any]]:
        db = SessionLocal()
        try:
            mems = db.query(EnhancedMemory).filter(EnhancedMemory.user_id == user_id).all()
            return [self._serialize(m, db) for m in mems]
        finally:
            db.close()

    async def import_memories(self, user_id: int, records: List[Dict[str, Any]]) -> int:
        count = 0
        for r in records:
            result = await self.store_memory(
                content=r.get("content", ""),
                user_id=user_id,
                memory_type=r.get("memory_type", "semantic"),
                category=r.get("category", "general"),
                tags=r.get("tags", []),
                source="import",
            )
            if result and result.get("status") == "created":
                count += 1
        return count

    # ── Serializer ────────────────────────────────────────────────────────────

    def _serialize(self, mem: EnhancedMemory, db: Session) -> Dict[str, Any]:
        tags = [t.tag for t in db.query(MemoryTag).filter(MemoryTag.memory_id == mem.id).all()]
        return {
            "id": mem.id,
            "content": mem.content,
            "summary": mem.summary,
            "memory_type": mem.memory_type,
            "category": mem.category,
            "source": mem.source,
            "importance_score": round(mem.importance_score, 1),
            "confidence_score": round(mem.confidence_score, 1),
            "access_count": mem.access_count,
            "is_pinned": mem.is_pinned,
            "is_archived": mem.is_archived,
            "project_name": mem.project_name,
            "tags": tags,
            "created_at": mem.created_at.isoformat(),
            "updated_at": mem.updated_at.isoformat() if mem.updated_at else None,
            "last_accessed": mem.last_accessed.isoformat() if mem.last_accessed else None,
        }


neural_memory = NeuralMemoryEngine()
