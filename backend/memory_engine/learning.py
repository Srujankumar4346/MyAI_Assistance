"""
Phase 3 — Learning & Personality Engine

Continuously learns user preferences from conversation patterns:
  - Coding style and preferred languages/frameworks
  - Reply style preferences
  - Work patterns
  - Frequently used commands
  - Entity detection (names, projects, deadlines, technologies)

Updates LearningProfile incrementally — every chat/voice interaction.
"""

import re
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from backend.database.connection import SessionLocal
from backend.memory_engine.cache import cache
from backend.memory_engine.models import LearningEvent, LearningProfile
from backend.utils.logger import logger

# ── Entity Detection Patterns ──────────────────────────────────────────────────

_DATE_PATTERN = re.compile(
    r"\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{1,2}(?:\s*,\s*\d{4})?|tomorrow|next\s+\w+|in\s+\d+\s+days?)\b",
    re.I,
)
_DEADLINE_PATTERN = re.compile(
    r"\b(deadline|due|submit|interview|exam|assessment|launch|release|presentation)\b", re.I
)
_LANGUAGE_PATTERN = re.compile(
    r"\b(python|javascript|typescript|java|c\+\+|c#|go|rust|swift|kotlin|ruby|php|scala|dart|sql|html|css)\b",
    re.I,
)
_FRAMEWORK_PATTERN = re.compile(
    r"\b(react|vue|angular|next\.?js|vite|fastapi|django|flask|express|spring|pytorch|tensorflow|tailwind|framer)\b",
    re.I,
)
_NAME_PATTERN = re.compile(r"\b([A-Z][a-z]{2,}\s+[A-Z][a-z]{2,})\b")
_PROJECT_PATTERN = re.compile(
    r'\b(?:project|app|system|platform|tool|bot)\s+(?:named?\s+|called\s+)?"?([A-Z][A-Za-z0-9_\- ]{2,20})"?',
    re.I,
)

# ── Language/Style Detection ───────────────────────────────────────────────────

_CODING_STYLE_SIGNALS = {
    "type hints": r"\btype hints?\b|\btyped\b",
    "async/await": r"\basync\b|\bawait\b",
    "functional": r"\bfunctional\b|\blambda\b|\bmap\b|\bfilter\b|\breduce\b",
    "OOP": r"\bclass\b|\binheritance\b|\bpolymorphism\b|\bencapsulation\b",
    "TDD": r"\btest.driven\b|\bunit test\b|\bpytest\b|\bjest\b",
}

_REPLY_STYLE_SIGNALS = {
    "detailed": r"\bexplain\b|\bdetail\b|\btell me more\b|\belaborate\b",
    "concise": r"\bshort\b|\bbrief\b|\bquick\b|\bsimple\b|\btl;?dr\b",
    "technical": r"\bcode\b|\bimplementation\b|\balgorithm\b|\barchitecture\b",
    "casual": r"\bhey\b|\bwhat\'?s up\b|\bchill\b|\bcool\b",
}


class LearningEngine:

    async def get_or_create_profile(
        self, user_id: int, db: Optional[Session] = None
    ) -> LearningProfile:
        own_db = db is None
        if own_db:
            db = SessionLocal()
        try:
            profile = db.query(LearningProfile).filter(LearningProfile.user_id == user_id).first()
            if not profile:
                profile = LearningProfile(user_id=user_id)
                db.add(profile)
                db.commit()
                db.refresh(profile)
            return profile
        finally:
            if own_db:
                db.close()

    # ── Entity Detection ───────────────────────────────────────────────────────

    def detect_entities(self, text: str) -> Dict[str, List[str]]:
        """
        Detect meaningful entities from free text.
        Returns dict with keys: dates, deadlines, languages, frameworks, names, projects.
        """
        entities: Dict[str, List[str]] = {
            "dates": list(set(m.group(0) for m in _DATE_PATTERN.finditer(text))),
            "deadlines": list(set(m.group(0) for m in _DEADLINE_PATTERN.finditer(text))),
            "languages": list(set(m.group(0).lower() for m in _LANGUAGE_PATTERN.finditer(text))),
            "frameworks": list(set(m.group(0).lower() for m in _FRAMEWORK_PATTERN.finditer(text))),
            "names": list(set(m.group(0) for m in _NAME_PATTERN.finditer(text))),
            "projects": list(set(m.group(1) for m in _PROJECT_PATTERN.finditer(text))),
        }
        return entities

    # ── Profile Update ─────────────────────────────────────────────────────────

    async def update_from_conversation(
        self, user_id: int, user_text: str, ai_response: str
    ) -> None:
        """
        Incrementally update the LearningProfile based on a single conversation turn.
        Called by the chat controller as a background task.
        """
        db = SessionLocal()
        try:
            profile = await self.get_or_create_profile(user_id, db)

            # ── Language learning ────────────────────────────────────────────
            langs = [m.group(0).lower() for m in _LANGUAGE_PATTERN.finditer(user_text)]
            if langs:
                existing = set(filter(None, (profile.secondary_languages or "").split(",")))
                primary_candidate = langs[0].strip()
                # First detected language becomes primary if not set
                if not profile.primary_language:
                    profile.primary_language = primary_candidate
                    self._log_event(
                        db,
                        user_id,
                        "new_language",
                        f"Detected primary language: {primary_candidate}",
                        0.9,
                    )
                else:
                    existing.update(l.strip() for l in langs)
                    profile.secondary_languages = ",".join(sorted(existing))

            # ── Framework learning ───────────────────────────────────────────
            fws = [m.group(0).lower() for m in _FRAMEWORK_PATTERN.finditer(user_text)]
            if fws:
                existing = set(filter(None, (profile.preferred_frameworks or "").split(",")))
                new_fws = {f.strip() for f in fws}
                added = new_fws - existing
                existing.update(new_fws)
                profile.preferred_frameworks = ",".join(sorted(existing))
                if added:
                    self._log_event(
                        db,
                        user_id,
                        "new_framework",
                        f"Detected frameworks: {', '.join(added)}",
                        0.8,
                    )

            # ── Reply style detection ────────────────────────────────────────
            for style, pattern in _REPLY_STYLE_SIGNALS.items():
                if re.search(pattern, user_text, re.I):
                    profile.reply_style = style
                    break

            # ── Coding style ─────────────────────────────────────────────────
            detected_styles = []
            for style, pattern in _CODING_STYLE_SIGNALS.items():
                if re.search(pattern, user_text + " " + ai_response, re.I):
                    detected_styles.append(style)
            if detected_styles:
                profile.coding_style = ", ".join(detected_styles)

            # ── Interaction count ────────────────────────────────────────────
            profile.total_interactions += 1
            learning_score = min(
                100.0, profile.total_interactions * 0.5 + len(fws) * 2 + len(langs) * 3
            )
            profile.learning_score = learning_score

            db.commit()
            await cache.delete(f"learning:{user_id}:profile")
        except Exception as e:
            db.rollback()
            logger.error(f"[Learning] update_from_conversation failed: {e}")
        finally:
            db.close()

    def _log_event(
        self, db: Session, user_id: int, event_type: str, description: str, confidence: float
    ) -> None:
        db.add(
            LearningEvent(
                user_id=user_id,
                event_type=event_type,
                description=description,
                confidence=confidence,
            )
        )

    # ── Profile Retrieval ──────────────────────────────────────────────────────

    async def get_profile(self, user_id: int) -> Dict[str, Any]:
        cache_key = f"learning:{user_id}:profile"
        cached = await cache.get(cache_key)
        if cached:
            return cached
        db = SessionLocal()
        try:
            profile = await self.get_or_create_profile(user_id, db)
            result = self._serialize_profile(profile)
            await cache.set(cache_key, result, ttl=300)
            return result
        finally:
            db.close()

    async def get_statistics(self, user_id: int) -> Dict[str, Any]:
        db = SessionLocal()
        try:
            profile = await self.get_or_create_profile(user_id, db)
            events = (
                db.query(LearningEvent)
                .filter(LearningEvent.user_id == user_id)
                .order_by(LearningEvent.created_at.desc())
                .limit(50)
                .all()
            )
            return {
                "profile": self._serialize_profile(profile),
                "recent_events": [
                    {
                        "type": e.event_type,
                        "description": e.description,
                        "confidence": e.confidence,
                        "created_at": e.created_at.isoformat(),
                    }
                    for e in events
                ],
                "total_interactions": profile.total_interactions,
                "learning_score": profile.learning_score,
            }
        finally:
            db.close()

    async def update_profile_manual(self, user_id: int, updates: Dict[str, Any]) -> Dict[str, Any]:
        db = SessionLocal()
        try:
            profile = await self.get_or_create_profile(user_id, db)
            allowed = [
                "primary_language",
                "secondary_languages",
                "preferred_frameworks",
                "preferred_ai_models",
                "coding_style",
                "reply_style",
                "writing_style",
                "daily_routine",
                "work_habits",
                "learning_habits",
                "frequently_used_commands",
            ]
            for field in allowed:
                if field in updates:
                    setattr(profile, field, updates[field])
            db.commit()
            await cache.delete(f"learning:{user_id}:profile")
            return self._serialize_profile(profile)
        finally:
            db.close()

    def _serialize_profile(self, p: LearningProfile) -> Dict[str, Any]:
        def _split(s: Optional[str]) -> List[str]:
            return [x.strip() for x in (s or "").split(",") if x.strip()]

        return {
            "id": p.id,
            "primary_language": p.primary_language,
            "secondary_languages": _split(p.secondary_languages),
            "preferred_frameworks": _split(p.preferred_frameworks),
            "preferred_ai_models": _split(p.preferred_ai_models),
            "coding_style": p.coding_style,
            "reply_style": p.reply_style,
            "writing_style": p.writing_style,
            "daily_routine": p.daily_routine,
            "work_habits": p.work_habits,
            "learning_habits": p.learning_habits,
            "frequently_used_commands": _split(p.frequently_used_commands),
            "total_interactions": p.total_interactions,
            "learning_score": round(p.learning_score, 1),
            "updated_at": p.updated_at.isoformat() if p.updated_at else None,
        }


learning_engine = LearningEngine()
