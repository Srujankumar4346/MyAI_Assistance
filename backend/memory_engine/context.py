"""
Phase 3 — Context Engine

Builds a rich context string injected into the LLM system prompt
before every AI response.

Context includes:
  - Relevant long-term memories (semantic search)
  - User's learning profile (preferred languages, style)
  - Active projects
  - Goals and tasks
  - Recent memories (last 5)
  - Pinned memories

Designed to be fast: results are cached per-user for 30 seconds.
"""

from typing import List

from backend.memory_engine.cache import cache
from backend.memory_engine.learning import learning_engine
from backend.memory_engine.neural_memory import neural_memory
from backend.utils.logger import logger


class ContextEngine:

    async def build_context(self, user_id: int, query: str, max_memories: int = 8) -> str:
        """
        Build a context string for LLM injection.
        Returns an empty string if no context is available.
        """
        cache_key = f"context:{user_id}:{hash(query)}"
        cached = await cache.get(cache_key)
        if cached:
            return cached

        lines: List[str] = []

        try:
            # ── 1. Learning profile ────────────────────────────────────────────
            profile = await learning_engine.get_profile(user_id)
            profile_parts = []
            if profile.get("primary_language"):
                profile_parts.append(f"Primary language: {profile['primary_language']}")
            if profile.get("preferred_frameworks"):
                profile_parts.append(
                    f"Preferred frameworks: {', '.join(profile['preferred_frameworks'][:4])}"
                )
            if profile.get("coding_style"):
                profile_parts.append(f"Coding style: {profile['coding_style']}")
            if profile.get("reply_style"):
                profile_parts.append(f"Preferred response style: {profile['reply_style']}")
            if profile_parts:
                lines.append("## User Profile")
                lines.extend(f"- {p}" for p in profile_parts)

            # ── 2. Semantic memory search ──────────────────────────────────────
            if query.strip():
                memories = await neural_memory.search_memories(
                    query=query,
                    user_id=user_id,
                    min_importance=20.0,
                    limit=max_memories,
                )
                if memories:
                    lines.append("## Relevant Memories")
                    for m in memories:
                        tag_str = f" [{', '.join(m['tags'])}]" if m.get("tags") else ""
                        lines.append(f"- [{m['category']}]{tag_str} {m['content']}")

            # ── 3. Pinned memories (always included) ──────────────────────────
            pinned = await neural_memory.search_memories(
                query="",
                user_id=user_id,
                pinned_only=True,
                limit=5,
            )
            if pinned:
                lines.append("## Pinned Facts")
                for m in pinned:
                    lines.append(f"- {m['content']}")

            # ── 4. Goal/task memories ──────────────────────────────────────────
            goals = await neural_memory.search_memories(
                query=query,
                user_id=user_id,
                category="goals",
                limit=3,
            )
            tasks = await neural_memory.search_memories(
                query=query,
                user_id=user_id,
                category="tasks",
                limit=3,
            )
            if goals or tasks:
                lines.append("## Active Goals & Tasks")
                for m in goals + tasks:
                    lines.append(f"- [{m['category']}] {m['content']}")

        except Exception as e:
            logger.warning(f"[ContextEngine] Failed to build context: {e}")

        if not lines:
            return ""

        context = "=== NOVA_X PERSONAL CONTEXT ===\n" + "\n".join(lines) + "\n=== END CONTEXT ==="
        await cache.set(cache_key, context, ttl=30)
        return context


context_engine = ContextEngine()
