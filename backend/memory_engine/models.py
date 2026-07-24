"""
Phase 3 — Neural Memory Engine Database Models

All models share the same SQLAlchemy Base as Phase 1/2 models.
SQLite and PostgreSQL compatible — no Postgres-only types used.
"""
from sqlalchemy import (
    Column, Integer, String, Text, DateTime, Float, Boolean,
    ForeignKey, Index
)
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.database.connection import Base


# ─── Memory Types ──────────────────────────────────────────────────────────────
MEMORY_TYPES = [
    "short_term", "long_term", "working", "semantic", "episodic",
    "procedural", "conversation", "project", "preference", "skill",
    "document", "coding", "research"
]

# ─── Memory Categories ─────────────────────────────────────────────────────────
MEMORY_CATEGORIES = [
    "projects", "documents", "programming", "education", "placement",
    "skills", "friends", "family", "career", "health", "goals",
    "tasks", "ideas", "research", "bookmarks", "notes", "web_searches",
    "coding_history", "voice_history", "preferences", "personality", "general"
]


class EnhancedMemory(Base):
    """
    Core Neural Memory record.
    Extends Phase 1 MemoryModel with importance scoring, reinforcement, decay,
    and rich metadata. Phase 1 MemoryModel is preserved unchanged.
    """
    __tablename__ = "enhanced_memories"

    id = Column(String, primary_key=True, index=True)       # UUID
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # Content
    content = Column(Text, nullable=False)
    summary = Column(Text, nullable=True)                   # AI-compressed summary
    memory_type = Column(String, default="semantic", index=True)
    category = Column(String, default="general", index=True)
    source = Column(String, default="manual")               # 'chat', 'voice', 'manual', 'document', 'import'

    # Neural Scoring
    importance_score = Column(Float, default=50.0)          # 0–100
    confidence_score = Column(Float, default=80.0)          # 0–100
    access_count = Column(Integer, default=0)
    last_accessed = Column(DateTime, nullable=True)
    decay_factor = Column(Float, default=1.0)               # 1.0 = fresh, decreases over time

    # State Flags
    is_pinned = Column(Boolean, default=False)
    is_archived = Column(Boolean, default=False)
    is_encrypted = Column(Boolean, default=False)

    # Linking
    embedding_id = Column(String, nullable=True)            # ChromaDB vector ID
    parent_id = Column(String, ForeignKey("enhanced_memories.id"), nullable=True)
    project_name = Column(String, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)            # for short-term memories

    # Relationships
    tags = relationship("MemoryTag", back_populates="memory", cascade="all, delete-orphan")
    parent = relationship("EnhancedMemory", remote_side=[id], back_populates="children", foreign_keys=[parent_id])
    children = relationship("EnhancedMemory", back_populates="parent", foreign_keys=[parent_id])
    outgoing_links = relationship("MemoryRelationship",
                                  foreign_keys="MemoryRelationship.source_id",
                                  cascade="all, delete-orphan")
    incoming_links = relationship("MemoryRelationship",
                                  foreign_keys="MemoryRelationship.target_id",
                                  cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_em_user_type", "user_id", "memory_type"),
        Index("ix_em_user_cat", "user_id", "category"),
        Index("ix_em_user_importance", "user_id", "importance_score"),
    )


class MemoryTag(Base):
    """Tags attached to a memory."""
    __tablename__ = "memory_tags"

    id = Column(Integer, primary_key=True, autoincrement=True)
    memory_id = Column(String, ForeignKey("enhanced_memories.id"), nullable=False, index=True)
    tag = Column(String, nullable=False, index=True)

    memory = relationship("EnhancedMemory", back_populates="tags")


class MemoryRelationship(Base):
    """Directed relationship between two memories."""
    __tablename__ = "memory_relationships"

    id = Column(Integer, primary_key=True, autoincrement=True)
    source_id = Column(String, ForeignKey("enhanced_memories.id"), nullable=False, index=True)
    target_id = Column(String, ForeignKey("enhanced_memories.id"), nullable=False, index=True)
    relationship_type = Column(String, default="related_to")   # 'related_to', 'part_of', 'contradicts', 'supports'
    strength = Column(Float, default=1.0)                       # 0–1
    created_at = Column(DateTime, default=datetime.utcnow)


# ─── Knowledge Graph ───────────────────────────────────────────────────────────

class KnowledgeNode(Base):
    """A node in the knowledge graph."""
    __tablename__ = "knowledge_nodes"

    id = Column(String, primary_key=True, index=True)           # UUID or slug
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    label = Column(String, nullable=False)
    node_type = Column(String, default="concept")               # 'user', 'project', 'language', 'framework', 'person', 'goal', 'skill', 'concept'
    description = Column(Text, nullable=True)
    properties = Column(Text, nullable=True)                    # JSON string for extra data
    importance = Column(Float, default=50.0)
    color = Column(String, nullable=True)                       # hex color for UI
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    outgoing_edges = relationship("KnowledgeEdge",
                                  foreign_keys="KnowledgeEdge.source_id",
                                  cascade="all, delete-orphan")
    incoming_edges = relationship("KnowledgeEdge",
                                  foreign_keys="KnowledgeEdge.target_id",
                                  cascade="all, delete-orphan")


class KnowledgeEdge(Base):
    """A directed edge in the knowledge graph."""
    __tablename__ = "knowledge_edges"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    source_id = Column(String, ForeignKey("knowledge_nodes.id"), nullable=False, index=True)
    target_id = Column(String, ForeignKey("knowledge_nodes.id"), nullable=False, index=True)
    relationship = Column(String, default="related_to")         # 'uses', 'part_of', 'knows', 'works_on', etc.
    weight = Column(Float, default=1.0)
    created_at = Column(DateTime, default=datetime.utcnow)


# ─── Learning & Personality ────────────────────────────────────────────────────

class LearningProfile(Base):
    """
    Continuously learned user profile.
    Captures style, preferences, habits — one row per user.
    """
    __tablename__ = "learning_profiles"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)

    # Coding preferences
    primary_language = Column(String, nullable=True)
    secondary_languages = Column(Text, nullable=True)           # comma-separated
    preferred_frameworks = Column(Text, nullable=True)          # comma-separated
    preferred_ai_models = Column(Text, nullable=True)           # comma-separated
    coding_style = Column(Text, nullable=True)

    # Communication style
    reply_style = Column(String, default="concise")             # 'concise', 'detailed', 'technical', 'casual'
    writing_style = Column(Text, nullable=True)

    # Work patterns
    daily_routine = Column(Text, nullable=True)
    work_habits = Column(Text, nullable=True)
    learning_habits = Column(Text, nullable=True)
    frequently_used_commands = Column(Text, nullable=True)      # comma-separated

    # Metrics
    total_interactions = Column(Integer, default=0)
    total_memories = Column(Integer, default=0)
    learning_score = Column(Float, default=0.0)                 # 0–100

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class LearningEvent(Base):
    """Log of detected learning events (used for analytics/timeline)."""
    __tablename__ = "learning_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    event_type = Column(String, nullable=False)                 # 'new_language', 'new_framework', 'habit_detected', etc.
    description = Column(Text, nullable=False)
    confidence = Column(Float, default=0.8)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)


# ─── Document Intelligence ─────────────────────────────────────────────────────

class DocumentMemory(Base):
    """Represents an uploaded document whose content has been extracted."""
    __tablename__ = "document_memories"

    id = Column(String, primary_key=True, index=True)           # UUID
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    filename = Column(String, nullable=False)
    file_type = Column(String, nullable=False)                  # 'pdf', 'docx', 'pptx', 'xlsx', 'txt'
    file_size_bytes = Column(Integer, default=0)
    page_count = Column(Integer, default=0)
    extracted_text = Column(Text, nullable=True)
    summary = Column(Text, nullable=True)
    memories_extracted = Column(Integer, default=0)             # how many EnhancedMemory records were created
    status = Column(String, default="pending")                  # 'pending', 'processing', 'done', 'failed'
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# ─── Memory Timeline ───────────────────────────────────────────────────────────

class MemoryTimelineEvent(Base):
    """Aggregated timeline event for UI display."""
    __tablename__ = "memory_timeline_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    memory_id = Column(String, ForeignKey("enhanced_memories.id"), nullable=True)
    event_type = Column(String, default="memory_created")       # 'memory_created', 'memory_accessed', 'knowledge_added'
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
