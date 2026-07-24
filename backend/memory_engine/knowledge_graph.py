"""
Phase 3 — Knowledge Graph Engine

Builds and maintains a knowledge graph of entities and their relationships.
Auto-extracts entities from chat messages using regex + keyword patterns.

Node types: user, project, language, framework, person, goal, skill, concept, tool, company
Edge types: uses, works_on, knows, part_of, related_to, employs, created_by, deployed_on
"""
import uuid
import json
import re
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime

from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.database.connection import SessionLocal
from backend.memory_engine.models import KnowledgeNode, KnowledgeEdge
from backend.memory_engine.cache import cache
from backend.utils.logger import logger


# ── Entity Extraction Patterns ─────────────────────────────────────────────────

# Tech keywords → node_type
_LANGUAGE_KW = {
    "python", "javascript", "typescript", "java", "c++", "c#", "go", "rust",
    "swift", "kotlin", "ruby", "php", "r", "scala", "dart", "sql"
}
_FRAMEWORK_KW = {
    "react", "vue", "angular", "next.js", "nextjs", "vite", "fastapi", "django",
    "flask", "express", "spring", "laravel", "rails", "tailwind", "framer motion",
    "pytorch", "tensorflow", "keras", "langchain", "ollama", "huggingface"
}
_TOOL_KW = {
    "docker", "kubernetes", "git", "github", "gitlab", "vscode", "postman",
    "redis", "postgres", "postgresql", "mysql", "mongodb", "chromadb",
    "aws", "gcp", "azure", "vercel", "render", "heroku", "nginx"
}

# Node type color mapping
NODE_COLORS = {
    "user": "#6366f1",
    "project": "#06b6d4",
    "language": "#10b981",
    "framework": "#8b5cf6",
    "tool": "#f59e0b",
    "person": "#ec4899",
    "goal": "#f97316",
    "skill": "#14b8a6",
    "concept": "#6b7280",
    "company": "#ef4444",
}

# Project detection patterns
_PROJECT_PATTERNS = [
    r'\b(?:project|app|system|platform|tool|bot|agent|assistant)\s+(?:called|named)?\s*"?([A-Z][A-Za-z0-9_\- ]{2,30})"?',
    r'\bbuilding\s+"?([A-Z][A-Za-z0-9_\- ]{2,30})"?',
    r'\b([A-Z_]{2,}[A-Z])\b',  # ALL_CAPS identifiers
]


def extract_entities(text: str) -> List[Tuple[str, str]]:
    """
    Extract (label, node_type) pairs from free text.
    Returns deduplicated list.
    """
    text_lower = text.lower()
    entities: List[Tuple[str, str]] = []

    # Programming languages
    for lang in _LANGUAGE_KW:
        if re.search(r'\b' + re.escape(lang) + r'\b', text_lower):
            entities.append((lang.title(), "language"))

    # Frameworks
    for fw in _FRAMEWORK_KW:
        if re.search(r'\b' + re.escape(fw) + r'\b', text_lower):
            entities.append((fw.title(), "framework"))

    # Tools / Platforms
    for tool in _TOOL_KW:
        if re.search(r'\b' + re.escape(tool) + r'\b', text_lower):
            entities.append((tool.title(), "tool"))

    # Project names
    for pattern in _PROJECT_PATTERNS:
        for match in re.finditer(pattern, text):
            label = match.group(1).strip()
            if len(label) >= 2 and label not in {"I", "A", "AN", "THE"}:
                entities.append((label, "project"))

    # Person names (simple: two capitalized words)
    for match in re.finditer(r'\b([A-Z][a-z]+)\s+([A-Z][a-z]+)\b', text):
        name = match.group(0)
        # Skip if it looks like a title or company
        if name not in {"New Chat", "The User", "The System"}:
            entities.append((name, "person"))

    # Deduplicate by label
    seen = set()
    result = []
    for label, ntype in entities:
        key = label.lower()
        if key not in seen:
            seen.add(key)
            result.append((label, ntype))

    return result


# ── Knowledge Graph Engine ─────────────────────────────────────────────────────

class KnowledgeGraphEngine:

    def _slug(self, label: str, user_id: int) -> str:
        return f"{user_id}:{label.lower().replace(' ', '_')}"

    async def get_or_create_node(
        self, db: Session, user_id: int, label: str, node_type: str,
        description: Optional[str] = None
    ) -> KnowledgeNode:
        node_id = self._slug(label, user_id)
        node = db.query(KnowledgeNode).filter(KnowledgeNode.id == node_id).first()
        if not node:
            node = KnowledgeNode(
                id=node_id,
                user_id=user_id,
                label=label,
                node_type=node_type,
                description=description,
                color=NODE_COLORS.get(node_type, "#6b7280"),
            )
            db.add(node)
            db.flush()
        else:
            # Boost importance on re-encounter
            node.importance = min(100.0, node.importance + 2.0)
            node.updated_at = datetime.utcnow()
        return node

    async def add_edge(
        self, db: Session, user_id: int, source_id: str, target_id: str,
        relationship: str = "related_to", weight: float = 1.0
    ) -> bool:
        existing = db.query(KnowledgeEdge).filter(
            KnowledgeEdge.source_id == source_id,
            KnowledgeEdge.target_id == target_id,
            KnowledgeEdge.relationship == relationship,
            KnowledgeEdge.user_id == user_id,
        ).first()
        if not existing:
            db.add(KnowledgeEdge(
                user_id=user_id,
                source_id=source_id,
                target_id=target_id,
                relationship=relationship,
                weight=weight,
            ))
        else:
            existing.weight = min(10.0, existing.weight + 0.1)
        return True

    async def ingest_text(self, text: str, user_id: int, source_node_id: Optional[str] = None) -> int:
        """
        Auto-extract entities from text, add them to the knowledge graph,
        and link them to a source node (e.g. a project or user node).
        Returns number of nodes created/updated.
        """
        entities = extract_entities(text)
        if not entities:
            return 0

        db = SessionLocal()
        try:
            nodes_created = 0
            entity_node_ids = []

            for label, node_type in entities:
                node = await self.get_or_create_node(db, user_id, label, node_type)
                entity_node_ids.append(node.id)
                nodes_created += 1

            # Link entities to each other when co-occurring in same text
            for i, nid in enumerate(entity_node_ids):
                for jid in entity_node_ids[i + 1:]:
                    await self.add_edge(db, user_id, nid, jid, "related_to", 0.5)

            # Link all to source node if provided
            if source_node_id:
                for nid in entity_node_ids:
                    await self.add_edge(db, user_id, source_node_id, nid, "contains", 1.0)

            db.commit()
            await cache.invalidate_prefix(f"knowledge:{user_id}:")
            return nodes_created
        except Exception as e:
            db.rollback()
            logger.error(f"[KnowledgeGraph] ingest_text failed: {e}")
            return 0
        finally:
            db.close()

    async def get_graph(self, user_id: int) -> Dict[str, Any]:
        cache_key = f"knowledge:{user_id}:graph"
        cached = await cache.get(cache_key)
        if cached:
            return cached
        db = SessionLocal()
        try:
            nodes = db.query(KnowledgeNode).filter(KnowledgeNode.user_id == user_id).all()
            edges = db.query(KnowledgeEdge).filter(KnowledgeEdge.user_id == user_id).all()
            result = {
                "nodes": [self._serialize_node(n) for n in nodes],
                "edges": [self._serialize_edge(e) for e in edges],
            }
            await cache.set(cache_key, result, ttl=300)
            return result
        finally:
            db.close()

    async def search_nodes(self, user_id: int, query: str) -> List[Dict[str, Any]]:
        db = SessionLocal()
        try:
            query_lower = f"%{query.lower()}%"
            nodes = (
                db.query(KnowledgeNode)
                .filter(
                    KnowledgeNode.user_id == user_id,
                    KnowledgeNode.label.ilike(query_lower)
                )
                .limit(20)
                .all()
            )
            return [self._serialize_node(n) for n in nodes]
        finally:
            db.close()

    async def get_relationships(self, user_id: int, node_id: str) -> Dict[str, Any]:
        db = SessionLocal()
        try:
            node = db.query(KnowledgeNode).filter(
                KnowledgeNode.id == node_id, KnowledgeNode.user_id == user_id
            ).first()
            if not node:
                return {}

            out_edges = db.query(KnowledgeEdge).filter(
                KnowledgeEdge.source_id == node_id, KnowledgeEdge.user_id == user_id
            ).all()
            in_edges = db.query(KnowledgeEdge).filter(
                KnowledgeEdge.target_id == node_id, KnowledgeEdge.user_id == user_id
            ).all()

            out_nodes = {e.target_id: db.query(KnowledgeNode).filter(KnowledgeNode.id == e.target_id).first() for e in out_edges}
            in_nodes = {e.source_id: db.query(KnowledgeNode).filter(KnowledgeNode.id == e.source_id).first() for e in in_edges}

            return {
                "node": self._serialize_node(node),
                "outgoing": [
                    {"relationship": e.relationship, "target": self._serialize_node(out_nodes[e.target_id])}
                    for e in out_edges if out_nodes.get(e.target_id)
                ],
                "incoming": [
                    {"relationship": e.relationship, "source": self._serialize_node(in_nodes[e.source_id])}
                    for e in in_edges if in_nodes.get(e.source_id)
                ],
            }
        finally:
            db.close()

    async def add_node_manual(self, user_id: int, label: str, node_type: str, description: str = "") -> Dict[str, Any]:
        db = SessionLocal()
        try:
            node = await self.get_or_create_node(db, user_id, label, node_type, description)
            db.commit()
            await cache.invalidate_prefix(f"knowledge:{user_id}:")
            return self._serialize_node(node)
        finally:
            db.close()

    def _serialize_node(self, n: KnowledgeNode) -> Dict[str, Any]:
        return {
            "id": n.id,
            "label": n.label,
            "node_type": n.node_type,
            "description": n.description,
            "importance": n.importance,
            "color": n.color or NODE_COLORS.get(n.node_type, "#6b7280"),
            "created_at": n.created_at.isoformat(),
        }

    def _serialize_edge(self, e: KnowledgeEdge) -> Dict[str, Any]:
        return {
            "id": e.id,
            "source": e.source_id,
            "target": e.target_id,
            "relationship": e.relationship,
            "weight": e.weight,
        }


knowledge_graph = KnowledgeGraphEngine()
