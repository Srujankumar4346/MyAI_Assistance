"""
Phase 3 — AI Model Router

Routes each query to the most appropriate AI model based on:
  - Query intent (coding, creative, factual, general)
  - User's preferred model (from LearningProfile)
  - Available Ollama models
  - Query complexity

Architecture:
  User → Context Engine → Model Router → Best AI Model → Response

This replaces the hard-coded model selection with an intelligent router
that can be extended in future phases (e.g., tool-use, agent routing).
"""
import re
from typing import Optional, List, Dict, Any
from backend.utils.logger import logger


# ── Query Intent Classification ────────────────────────────────────────────────

_CODING_PATTERNS = re.compile(
    r'\b(code|function|class|debug|error|bug|implement|algorithm|api|script|'
    r'python|javascript|typescript|bash|sql|regex|dockerfile|git)\b', re.I
)
_CREATIVE_PATTERNS = re.compile(
    r'\b(write|story|poem|essay|creative|generate|draft|describe|imagine|design)\b', re.I
)
_FACTUAL_PATTERNS = re.compile(
    r'\b(what is|who is|when|where|how does|explain|definition|history|'
    r'meaning|facts? about|tell me about)\b', re.I
)
_MATH_PATTERNS = re.compile(
    r'\b(calculate|compute|solve|equation|formula|math|statistics|probability)\b', re.I
)

# Model capability hints
_MODEL_STRENGTHS = {
    "coding": ["codellama", "deepseek-coder", "qwen2.5-coder", "llama3", "gemma"],
    "creative": ["llama3", "mistral", "gemma", "phi3"],
    "factual": ["llama3", "gemma", "mistral", "qwen"],
    "math": ["mathstral", "qwen", "llama3", "gemma"],
    "general": ["gemma", "llama3", "mistral", "qwen"],
}


def classify_intent(query: str) -> str:
    """Classify the query into: coding, creative, factual, math, general."""
    if _CODING_PATTERNS.search(query):
        return "coding"
    if _MATH_PATTERNS.search(query):
        return "math"
    if _CREATIVE_PATTERNS.search(query):
        return "creative"
    if _FACTUAL_PATTERNS.search(query):
        return "factual"
    return "general"


class ModelRouter:
    """
    Routes queries to the best available model.
    Falls back gracefully when preferred model is unavailable.
    """

    async def route(
        self,
        query: str,
        available_models: List[str],
        user_preferred_model: Optional[str] = None,
        explicit_model: Optional[str] = None,
    ) -> str:
        """
        Returns the model name to use for this query.

        Priority:
          1. Explicit model from user (e.g., from UI dropdown) if available
          2. User's preferred model from LearningProfile if available
          3. Intent-based best model from available list
          4. First available model
          5. Default fallback ("gemma")
        """
        if not available_models:
            available_models = ["gemma"]

        installed_bases = {m.split(":")[0].lower(): m for m in available_models}

        # 1. Explicit model
        if explicit_model:
            base = explicit_model.split(":")[0].lower()
            if base in installed_bases:
                return installed_bases[base]
            # Try as-is
            if explicit_model in available_models:
                return explicit_model

        # 2. User preferred model
        if user_preferred_model:
            base = user_preferred_model.split(":")[0].lower()
            if base in installed_bases:
                return installed_bases[base]

        # 3. Intent-based routing
        intent = classify_intent(query)
        preferred_for_intent = _MODEL_STRENGTHS.get(intent, _MODEL_STRENGTHS["general"])
        for preferred in preferred_for_intent:
            pbase = preferred.lower()
            for installed_base, full_name in installed_bases.items():
                if pbase in installed_base or installed_base in pbase:
                    logger.debug(f"[ModelRouter] intent={intent} → model={full_name}")
                    return full_name

        # 4. First available
        if available_models:
            return available_models[0]

        # 5. Hard fallback
        return "gemma"

    def explain_routing(self, query: str, chosen_model: str) -> Dict[str, Any]:
        return {
            "intent": classify_intent(query),
            "chosen_model": chosen_model,
            "reasoning": f"Selected '{chosen_model}' based on '{classify_intent(query)}' intent.",
        }


model_router = ModelRouter()
