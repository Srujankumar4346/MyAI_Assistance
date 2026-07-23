import os
import uuid
import math
import re
from typing import List, Dict, Any
from backend.core.config import settings
from backend.utils.logger import logger
from backend.database.connection import SessionLocal
from backend.database.models import MemoryModel


def _get_db_session():
    return SessionLocal()


# ── TF-IDF Similarity Fallback (No native packages required) ──────────────────

def tokenize(text: str) -> List[str]:
    return re.findall(r'\w+', text.lower())


def compute_tf(tokens: List[str]) -> Dict[str, float]:
    tf = {}
    for t in tokens:
        tf[t] = tf.get(t, 0.0) + 1.0
    total = sum(tf.values())
    for t in tf:
        tf[t] = tf[t] / total
    return tf


def cosine_similarity(v1: Dict[str, float], v2: Dict[str, float]) -> float:
    intersection = set(v1.keys()) & set(v2.keys())
    numerator = sum([v1[x] * v2[x] for x in intersection])
    sum1 = sum([v1[x] ** 2 for x in v1.keys()])
    sum2 = sum([v2[x] ** 2 for x in v2.keys()])
    denominator = math.sqrt(sum1) * math.sqrt(sum2)
    if not denominator:
        return 0.0
    return numerator / denominator


class MemoryManager:
    def __init__(self):
        self.chroma_dir = settings.CHROMA_DB_DIR
        os.makedirs(self.chroma_dir, exist_ok=True)
        self.collection = None
        self._init_chroma()

    def _init_chroma(self):
        try:
            import chromadb
            self.client = chromadb.PersistentClient(path=self.chroma_dir)
            self.collection = self.client.get_or_create_collection(
                name="novax_user_memory",
                metadata={"hnsw:space": "cosine"}
            )
            logger.info("ChromaDB memory store initialized successfully.")
        except Exception as e:
            logger.warning(f"ChromaDB not available: {e}. Falling back to SQLite memory system.")
            self.collection = None

    def add_memory(self, content: str, category: str = "general", metadata: Dict[str, Any] = None) -> bool:
        mem_id = str(uuid.uuid4())
        meta = metadata or {}
        meta["category"] = category
        meta["created_at"] = str(uuid.uuid1())

        # ── 1. Write to local database (persistent SQLite/Postgres) ───────────
        db = _get_db_session()
        try:
            db_mem = MemoryModel(
                id=mem_id,
                user_id=1,  # Default system user
                content=content,
                category=category
            )
            db.add(db_mem)
            db.commit()
        except Exception as e:
            logger.error(f"[Memory] Failed to write memory metadata: {e}")
            db.rollback()
        finally:
            db.close()

        # ── 2. Add to Chroma Vector Store (if available) ──────────────────────
        if self.collection:
            try:
                self.collection.add(
                    documents=[content],
                    metadatas=[meta],
                    ids=[mem_id]
                )
                return True
            except Exception as e:
                logger.error(f"Failed to add memory to ChromaDB: {e}")
                return False

        # Otherwise fallback works from SQLite
        return True

    def query_memories(self, query: str, n_results: int = 5) -> List[Dict[str, Any]]:
        # ── 1. If Chroma is available, use it ─────────────────────────────────
        if self.collection:
            try:
                count = self.collection.count()
                if count == 0:
                    return []
                results = self.collection.query(
                    query_texts=[query],
                    n_results=min(n_results, count)
                )
                memories = []
                if results and results.get("documents"):
                    docs = results["documents"][0]
                    metas = results["metadatas"][0] if results.get("metadatas") else [{}] * len(docs)
                    ids = results["ids"][0]
                    for doc, meta, mem_id in zip(docs, metas, ids):
                        memories.append({
                            "id": mem_id,
                            "content": doc,
                            "category": meta.get("category", "general") if meta else "general",
                            "metadata": meta
                        })
                return memories
            except Exception as e:
                logger.error(f"ChromaDB query failed: {e}. Falling back to SQLite.")

        # ── 2. SQLite fall-back vector search via TF-IDF Cosine Similarity ─────
        db = _get_db_session()
        try:
            records = db.query(MemoryModel).all()
            if not records:
                return []

            query_tokens = tokenize(query)
            if not query_tokens:
                # Return first N if no meaningful words
                return [{
                    "id": r.id,
                    "content": r.content,
                    "category": r.category or "general"
                } for r in records[:n_results]]

            query_tf = compute_tf(query_tokens)
            scores = []
            for r in records:
                r_tf = compute_tf(tokenize(r.content))
                similarity = cosine_similarity(query_tf, r_tf)
                scores.append((similarity, r))

            # Sort descending by similarity
            scores.sort(key=lambda x: x[0], reverse=True)
            results = []
            for sim, r in scores[:n_results]:
                if sim > 0.05:  # Relevance threshold
                    results.append({
                        "id": r.id,
                        "content": r.content,
                        "category": r.category or "general"
                    })
            return results
        except Exception as e:
            logger.error(f"[Memory] SQLite query fallback error: {e}")
            return []
        finally:
            db.close()

    def get_all_memories(self) -> List[Dict[str, Any]]:
        # Always read from primary relational DB database for consistency
        db = _get_db_session()
        try:
            records = db.query(MemoryModel).order_by(MemoryModel.created_at.desc()).all()
            return [{
                "id": r.id,
                "content": r.content,
                "category": r.category or "general"
            } for r in records]
        except Exception as e:
            logger.error(f"[Memory] get_all_memories error: {e}")
            return []
        finally:
            db.close()

    def delete_memory(self, memory_id: str) -> bool:
        # Delete from SQLite
        db = _get_db_session()
        success = False
        try:
            db.query(MemoryModel).filter(MemoryModel.id == memory_id).delete()
            db.commit()
            success = True
        except Exception as e:
            logger.error(f"[Memory] delete SQLite record error: {e}")
            db.rollback()
        finally:
            db.close()

        # Delete from Chroma
        if self.collection and success:
            try:
                self.collection.delete(ids=[memory_id])
            except Exception as e:
                logger.error(f"Failed to delete memory {memory_id} from ChromaDB: {e}")

        return success


memory_manager = MemoryManager()
