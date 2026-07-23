import os
import uuid
from typing import List, Dict, Any
from backend.core.config import settings
from backend.utils.logger import logger

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
            logger.error(f"Error initializing ChromaDB: {e}")
            self.collection = None

    def add_memory(self, content: str, category: str = "general", metadata: Dict[str, Any] = None) -> bool:
        if not self.collection:
            logger.warning("ChromaDB not available. Skipping memory addition.")
            return False
        try:
            mem_id = str(uuid.uuid4())
            meta = metadata or {}
            meta["category"] = category
            meta["created_at"] = str(uuid.uuid1())
            
            self.collection.add(
                documents=[content],
                metadatas=[meta],
                ids=[mem_id]
            )
            return True
        except Exception as e:
            logger.error(f"Failed to add memory to ChromaDB: {e}")
            return False

    def query_memories(self, query: str, n_results: int = 5) -> List[Dict[str, Any]]:
        if not self.collection:
            return []
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
                        "category": meta.get("category", "general"),
                        "metadata": meta
                    })
            return memories
        except Exception as e:
            logger.error(f"Failed to query ChromaDB: {e}")
            return []

    def get_all_memories(self) -> List[Dict[str, Any]]:
        if not self.collection:
            return []
        try:
            data = self.collection.get()
            memories = []
            if data and data.get("documents"):
                docs = data["documents"]
                metas = data["metadatas"] if data.get("metadatas") else [{}] * len(docs)
                ids = data["ids"]
                for doc, meta, mem_id in zip(docs, metas, ids):
                    memories.append({
                        "id": mem_id,
                        "content": doc,
                        "category": meta.get("category", "general") if meta else "general"
                    })
            return memories
        except Exception as e:
            logger.error(f"Failed to fetch memories: {e}")
            return []

    def delete_memory(self, memory_id: str) -> bool:
        if not self.collection:
            return False
        try:
            self.collection.delete(ids=[memory_id])
            return True
        except Exception as e:
            logger.error(f"Failed to delete memory {memory_id}: {e}")
            return False

memory_manager = MemoryManager()
